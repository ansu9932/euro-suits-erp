// The connector accepts scan requests only from the paired Euro Suits ERP tab.
package main

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	_ "embed"
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
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
	var secret [16]byte
	if _, err := rand.Read(secret[:]); err != nil {
		log.Fatal("Could not create a scanner pairing code.")
	}
	code := hex.EncodeToString(secret[:])
	fmt.Println("Euro Suits ERP Scanner · Canon GM4070")
	fmt.Println("Paste this code into Scan document in the ERP on this PC.")
	fmt.Println("Pairing code:", code)
	fmt.Println("Keep this window open while scanning. Close it to disconnect.")
	server := &http.Server{
		Addr:              address,
		Handler:           scanHandler(code, scanWithWIA),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      3 * time.Minute,
		IdleTimeout:       30 * time.Second,
		MaxHeaderBytes:    8192,
	}
	log.Fatal(server.ListenAndServe())
}

func scanHandler(code string, scan scanner) http.HandlerFunc {
	inUse := make(chan struct{}, 1)
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Host != address || r.Header.Get("Origin") != erpOrigin {
			http.Error(w, "This connector is available only to Euro Suits ERP on this PC.", http.StatusForbidden)
			return
		}
		if r.URL.Path != "/scan" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Access-Control-Allow-Origin", erpOrigin)
		w.Header().Set("Vary", "Origin")
		w.Header().Set("Cache-Control", "no-store")
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
		if subtle.ConstantTimeCompare([]byte(r.Header.Get("X-ERP-Scanner-Code")), []byte(code)) != 1 {
			sendError(w, http.StatusUnauthorized, "Enter the pairing code shown in the scanner connector window.")
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
	systemRoot := os.Getenv("SystemRoot")
	if !filepath.IsAbs(systemRoot) {
		return result, errors.New("Windows PowerShell could not be located.")
	}
	powershell := filepath.Join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
	command := exec.CommandContext(ctx, powershell, "-NoProfile", "-NonInteractive", "-STA", "-WindowStyle", "Hidden", "-EncodedCommand", encodedScript(scanScript))
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
		status := strings.TrimSpace(string(output))
		switch {
		case ctx.Err() != nil:
			result.Warning = "The Canon did not finish in time. Check the printer and try again."
		case status == "EMPTY" && len(result.Pages) == 0:
			result.Warning = "The feeder is empty. Load the pages face up and try again."
		case status == "BUSY":
			result.Warning = "The Canon is busy. Close other scan apps and try again when it is idle."
		case status == "MISSING":
			result.Warning = "Windows cannot find the Canon GM4070. Check that it is on and connected."
		case status == "JAM":
			result.Warning = "Check the Canon feeder for a paper jam or misfeed."
		case status == "OFFLINE":
			result.Warning = "Windows could not communicate with the Canon. Check the connection and try again."
		case commandError != nil || (status != "OK" && status != "EMPTY"):
			result.Warning = "Windows could not complete the scan. Check the scanner and try again."
		}
	}
	if len(result.Pages) == 0 {
		if result.Warning == "" {
			result.Warning = "No scanned pages were received."
		}
		return result, errors.New(result.Warning)
	}
	return result, nil
}

func encodedScript(script string) string {
	chars := utf16.Encode([]rune(script))
	data := make([]byte, len(chars)*2)
	for index, char := range chars {
		binary.LittleEndian.PutUint16(data[index*2:], char)
	}
	return base64.StdEncoding.EncodeToString(data)
}
