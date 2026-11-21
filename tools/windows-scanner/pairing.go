package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type pairingStore struct {
	directory string
	approve   func(context.Context) bool
}

func (p pairingStore) path(token string) string {
	if len(token) != 64 {
		return ""
	}
	value, err := hex.DecodeString(token)
	if err != nil {
		return ""
	}
	digest := sha256.Sum256(value)
	return filepath.Join(p.directory, hex.EncodeToString(digest[:]))
}

func (p pairingStore) has(token string) bool {
	path := p.path(token)
	if path == "" {
		return false
	}
	info, err := os.Stat(path)
	return err == nil && info.Mode().IsRegular()
}

func (p pairingStore) connect(w http.ResponseWriter, r *http.Request, token string) {
	path := p.path(token)
	if path == "" {
		sendError(w, http.StatusBadRequest, "The browser could not start pairing. Try Connect scanner again.")
		return
	}
	if p.has(token) {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 45*time.Second)
	defer cancel()
	if !p.approve(ctx) || ctx.Err() != nil {
		sendError(w, http.StatusForbidden, "Approve the scanner connection in the Windows prompt, then try again.")
		return
	}
	file, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err == nil {
		err = file.Close()
	}
	if err != nil && !p.has(token) {
		sendError(w, http.StatusInternalServerError, "Windows could not save the scanner connection.")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func confirmPairing(ctx context.Context) bool {
	command, err := windowsPowerShell(ctx, `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
$owner = New-Object System.Windows.Forms.Form
$owner.TopMost = $true
try {
    $answer = [System.Windows.Forms.MessageBox]::Show(
        $owner, 'Allow erp.eurosuitsmfg.in in this browser to use the Canon scanner on this PC?',
        'Connect Euro Suits Scanner', 'YesNo', 'Question', 'Button2')
    if ($answer -eq 'Yes') { 'APPROVED' }
} finally { $owner.Dispose() }
`)
	if err != nil {
		return false
	}
	output, err := command.Output()
	return err == nil && strings.TrimSpace(string(output)) == "APPROVED"
}
