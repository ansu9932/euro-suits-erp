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
	handler := scanHandler("pairing-code", func(_ context.Context, request scanRequest) (scanResult, error) {
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
		{"foreign origin", address, "https://example.org", "pairing-code", "POST", "", 403},
		{"foreign host", "example.org:37841", erpOrigin, "pairing-code", "POST", "", 403},
		{"without pairing", address, erpOrigin, "", "POST", "", 401},
		{"wrong pairing", address, erpOrigin, "wrong", "POST", "", 401},
		{"preflight", address, erpOrigin, "", "OPTIONS", "", 204},
		{"too many pages", address, erpOrigin, "pairing-code", "POST", `{"source":"feeder","count":21}`, 400},
		{"invalid source", address, erpOrigin, "pairing-code", "POST", `{"source":"other","count":2}`, 400},
		{"paired ERP", address, erpOrigin, "pairing-code", "POST", `{"source":"feeder","count":2}`, 200},
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
