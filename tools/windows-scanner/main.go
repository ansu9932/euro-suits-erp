// The connector accepts scan requests only from the paired Euro Suits ERP tab.
package main

import (
	"context"
	_ "embed"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
	"unicode/utf16"
)

const (
	address       = "127.0.0.1:37841"
	erpOrigin     = "https://erp.eurosuitsmfg.in"
	maxPages      = 20
	maxImageBytes = 10 * 1024 * 1024
	maxBatchBytes = 20 * 1024 * 1024
)

//go:embed scan.ps1
var scanScript string

type scanRequest struct {
	Source string `json:"source"`
	Count  int    `json:"count"`
}

type scanResult struct {
	Pages   [][]byte `json:"pages"`
	Warning string   `json:"warning,omitempty"`
}

type scanner func(context.Context, scanRequest) (scanResult, error)

func main() {
	if runtime.GOOS != "windows" {
		log.Fatal("Run this connector on the Windows PC connected to the Canon GM4070.")
	}
	config := os.Getenv("LOCALAPPDATA")
	if !filepath.IsAbs(config) {
		log.Fatal("Could not find this Windows user's local settings folder.")
	}
	pairs := pairingStore{directory: filepath.Join(config, "Euro Suits Scanner", "Pairings"), approve: confirmPairing}
	if err := os.MkdirAll(pairs.directory, 0700); err != nil {
		log.Fatal("Could not open the scanner pairing settings.")
	}
	listener, err := net.Listen("tcp4", address)
	if err != nil {
		log.Fatal("Could not start Euro Suits Scanner. Close any other scanner connector window and try again.")
	}
	fmt.Println("Euro Suits ERP Scanner v2 · Canon GM4070")
	fmt.Println("To connect the first time, choose Connect scanner in the ERP and confirm the Windows prompt.")
	fmt.Println("Keep this window open while scanning. Close it to disconnect.")
	server := &http.Server{
		Addr:              address,
		Handler:           scanHandler(pairs, scanWithWIA),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      3 * time.Minute,
		IdleTimeout:       30 * time.Second,
		MaxHeaderBytes:    8192,
	}
	log.Fatal(server.Serve(listener))
}

func scanHandler(pairs pairingStore, scan scanner) http.HandlerFunc {
	inUse := make(chan struct{}, 1)
	pairingPrompt := make(chan struct{}, 1)
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Host != address || r.Header.Get("Origin") != erpOrigin {
			http.Error(w, "This connector is available only to Euro Suits ERP on this PC.", http.StatusForbidden)
			return
		}
		w.Header().Set("Access-Control-Allow-Origin", erpOrigin)
		w.Header().Set("Vary", "Origin")
		w.Header().Set("Cache-Control", "no-store")
		if r.URL.Path != "/scan" && r.URL.Path != "/pair" {
			http.NotFound(w, r)
			return
		}
		if r.Method == http.MethodOptions {
			w.Header().Set("Access-Control-Allow-Methods", "POST")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-ERP-Scanner-Code")
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		pairedBrowser := r.Header.Get("X-ERP-Scanner-Code")
		if r.URL.Path == "/pair" {
			select {
			case pairingPrompt <- struct{}{}:
				defer func() { <-pairingPrompt }()
			default:
				sendError(w, http.StatusConflict, "A scanner connection is already waiting for confirmation on this PC.")
				return
			}
			pairs.connect(w, r, pairedBrowser)
			return
		}
		if !pairs.has(pairedBrowser) {
			sendError(w, http.StatusUnauthorized, "Connect this browser to Euro Suits Scanner first.")
			return
		}

		var request scanRequest
		r.Body = http.MaxBytesReader(w, r.Body, 256)
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil ||
			request.Count < 1 || request.Count > maxPages ||
			(request.Source != "feeder" && (request.Source != "flatbed" || request.Count != 1)) {
			sendError(w, http.StatusBadRequest, "Choose a valid scan source and page count.")
			return
		}
		select {
		case inUse <- struct{}{}:
			defer func() { <-inUse }()
		default:
			sendError(w, http.StatusConflict, "A scan is already running on this PC.")
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 150*time.Second)
		defer cancel()
		result, err := scan(ctx, request)
		if err != nil {
			sendError(w, http.StatusUnprocessableEntity, err.Error())
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(result)
	}
}

func sendError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func scanWithWIA(ctx context.Context, request scanRequest) (scanResult, error) {
	result := scanResult{Pages: [][]byte{}}
	dir, err := os.MkdirTemp("", "euro-suits-scan-")
	if err != nil {
		return result, errors.New("Windows could not create a temporary scan folder.")
	}
	defer os.RemoveAll(dir)
	command, err := windowsPowerShell(ctx, scanScript)
	if err != nil {
		return result, err
	}
	command.Env = append(os.Environ(), "ERP_SCAN_OUTPUT="+dir, "ERP_SCAN_SOURCE="+request.Source, fmt.Sprintf("ERP_SCAN_COUNT=%d", request.Count))
	output, commandError := command.Output()
	var totalBytes int64
	for index := 1; index <= request.Count; index++ {
		path := filepath.Join(dir, fmt.Sprintf("page-%02d.jpg", index))
		info, err := os.Stat(path)
		if err != nil {
			break
		}
		if info.Size() > maxImageBytes {
			result.Warning = "A scanned page exceeded the size limit. Scan fewer pages or use the regular file upload."
			break
		}
		totalBytes += info.Size()
		if totalBytes > maxBatchBytes {
			result.Warning = "This batch exceeded the size limit. Scan the remaining pages in smaller batches."
			break
		}
		page, err := os.ReadFile(path)
		if err != nil || http.DetectContentType(page) != "image/jpeg" {
			result.Warning = "A scanned page could not be read. Scan that page again."
			break
		}
		result.Pages = append(result.Pages, page)
	}
	if result.Warning == "" {
		result.Warning = scanWarning(strings.TrimSpace(string(output)), len(result.Pages), ctx.Err(), commandError)
	}
	if len(result.Pages) == 0 {
		if result.Warning == "" {
			result.Warning = "No scanned pages were received."
		}
		return result, errors.New(result.Warning)
	}
	return result, nil
}

func scanWarning(status string, pageCount int, contextError, commandError error) string {
	if contextError != nil {
		return "The Canon did not finish in time. Check the printer and try again."
	}
	kind, detail, _ := strings.Cut(status, ":")
	phase, driverCode, _ := strings.Cut(detail, ":")
	if driverCode != "" {
		log.Printf("Canon scan result: %s, stage %s, Windows code %s", kind, phase, driverCode)
	}
	switch kind {
	case "EMPTY":
		if pageCount == 0 {
			return "The feeder is empty. Load the pages face up and try again."
		}
		return ""
	case "BUSY":
		return "The Canon is busy. Close other scan apps and try again when it is idle."
	case "MISSING":
		return "Windows cannot find the Canon GM4070. Check that it is on and connected."
	case "JAM":
		return "Check the Canon feeder for a paper jam or misfeed."
	case "OFFLINE":
		if phase == "transfer" {
			return "Windows lost communication while receiving the scan from the Canon. Test one blank sheet in Canon IJ Scan Utility on this PC."
		}
		return "Windows could not connect to the Canon. Check that it is on and available to this PC."
	case "COVER":
		return "Close the Canon scanner cover or feeder before scanning."
	case "UNSUPPORTED":
		return "This Canon driver does not expose the selected paper source to Windows."
	case "OK":
		if commandError == nil {
			return ""
		}
	}
	if phase == "save" {
		return "The Canon sent a page, but Windows could not save it. Scan that page again."
	}
	return "Windows could not complete the scan. Check the connector window for the Windows error code."
}

func windowsPowerShell(ctx context.Context, script string) (*exec.Cmd, error) {
	systemRoot := os.Getenv("SystemRoot")
	if !filepath.IsAbs(systemRoot) {
		return nil, errors.New("Windows PowerShell could not be located.")
	}
	powershell := filepath.Join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
	return exec.CommandContext(ctx, powershell, "-NoProfile", "-NonInteractive", "-STA", "-WindowStyle", "Hidden", "-EncodedCommand", encodedScript(script)), nil
}

func encodedScript(script string) string {
	chars := utf16.Encode([]rune(script))
	data := make([]byte, len(chars)*2)
	for index, char := range chars {
		binary.LittleEndian.PutUint16(data[index*2:], char)
	}
	return base64.StdEncoding.EncodeToString(data)
}
