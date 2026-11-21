package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestScanRequiresTrustedOriginAndPairing(t *testing.T) {
	calls := 0
	token := strings.Repeat("3a", 32)
	pairs := pairingStore{directory: t.TempDir(), approve: func(context.Context) bool { return true }}
	approved := httptest.NewRecorder()
	pairs.connect(approved, httptest.NewRequest("POST", "/pair", nil), token)
	if approved.Code != http.StatusNoContent {
		t.Fatalf("test pairing failed: %s", approved.Body.String())
	}
	handler := scanHandler(pairs, func(_ context.Context, request scanRequest) (scanResult, error) {
		calls++
		if request.Count != 2 || request.Source != "feeder" {
			t.Fatalf("unexpected scan request: %+v", request)
		}
		return scanResult{Pages: [][]byte{[]byte("one"), []byte("two")}}, nil
	})
	tests := []struct {
		name, host, origin, code, method, body string
		status                                 int
	}{
		{"foreign origin", address, "https://example.org", token, "POST", "", 403},
		{"foreign host", "example.org:37841", erpOrigin, token, "POST", "", 403},
		{"without pairing", address, erpOrigin, "", "POST", "", 401},
		{"wrong pairing", address, erpOrigin, "wrong", "POST", "", 401},
		{"preflight", address, erpOrigin, "", "OPTIONS", "", 204},
		{"too many pages", address, erpOrigin, token, "POST", `{"source":"feeder","count":21}`, 400},
		{"invalid source", address, erpOrigin, token, "POST", `{"source":"other","count":2}`, 400},
		{"paired ERP", address, erpOrigin, token, "POST", `{"source":"feeder","count":2}`, 200},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(test.method, "http://"+test.host+"/scan", strings.NewReader(test.body))
			request.Header.Set("Origin", test.origin)
			request.Header.Set("X-ERP-Scanner-Code", test.code)
			response := httptest.NewRecorder()
			handler(response, request)
			if response.Code != test.status {
				t.Fatalf("status is %d, want %d", response.Code, test.status)
			}
			if test.status == http.StatusForbidden && response.Header().Get("Access-Control-Allow-Origin") != "" {
				t.Fatal("forbidden request received a CORS grant")
			}
			if test.status == http.StatusOK && !strings.Contains(response.Body.String(), `"pages":["b25l","dHdv"]`) {
				t.Fatalf("missing scan pages: %s", response.Body.String())
			}
		})
	}
	if calls != 1 {
		t.Fatalf("scanner called %d times, want 1", calls)
	}
}

func TestPairingSurvivesConnectorRestart(t *testing.T) {
	token := strings.Repeat("5a", 32)
	confirmed := false
	directory := t.TempDir()
	pairs := pairingStore{directory: directory, approve: func(context.Context) bool { return confirmed }}
	handler := scanHandler(pairs, nil)
	pair := func(requestOrigin, secret string) int {
		request := httptest.NewRequest(http.MethodPost, "http://"+address+"/pair", nil)
		request.Header.Set("Origin", requestOrigin)
		request.Header.Set("X-ERP-Scanner-Code", secret)
		response := httptest.NewRecorder()
		handler(response, request)
		if strings.Contains(response.Body.String(), token) {
			t.Fatal("pairing token was echoed to the browser")
		}
		return response.Code
	}
	if got := pair(erpOrigin, token); got != http.StatusForbidden || pairs.has(token) {
		t.Fatal("the browser was paired without Windows confirmation")
	}
	confirmed = true
	if got := pair("https://example.org", token); got != http.StatusForbidden || pairs.has(token) {
		t.Fatal("a foreign origin was allowed to pair")
	}
	if got := pair(erpOrigin, "invalid"); got != http.StatusBadRequest {
		t.Fatal("an invalid token was allowed to pair")
	}
	if got := pair(erpOrigin, token); got != http.StatusNoContent {
		t.Fatalf("expected successful pairing, got %d", got)
	}
	restarted := pairingStore{directory: directory}
	if !restarted.has(token) || restarted.has(strings.Repeat("8a", 32)) {
		t.Fatal("the restarted connector did not retain the same browser pairing")
	}
}

func TestTransferErrorAfterReceivingPages(t *testing.T) {
	if warning := scanWarning("EMPTY:transfer:80210003", 2, nil, nil); warning != "" {
		t.Fatalf("an empty feeder after successful pages should complete the batch: %s", warning)
	}
	if warning := scanWarning("OFFLINE:transfer:8021000A", 1, nil, nil); !strings.Contains(warning, "receiving the scan") {
		t.Fatalf("communication failure during transfer should identify the phase: %s", warning)
	}
}
