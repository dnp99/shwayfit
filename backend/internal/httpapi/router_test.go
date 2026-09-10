package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealth(t *testing.T) {
	response := httptest.NewRecorder()
	NewHandler().ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/v1/health", nil))
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d", response.Code)
	}
	if response.Header().Get("Content-Type") != "application/json" {
		t.Fatal("expected JSON")
	}
	if response.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("health must not be cached")
	}
	var body struct {
		Status  string `json:"status"`
		Service string `json:"service"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Status != "ok" || body.Service != "shwayfit-api" {
		t.Fatalf("unexpected response: %+v", body)
	}
}

func TestRouting(t *testing.T) {
	for _, tc := range []struct {
		method, path string
		want         int
	}{
		{"POST", "/api/v1/health", 405},
		{"GET", "/api/v1/health/extra", 404},
		{"GET", "/api/v1/clients", 404},
		{"GET", "/", 404},
	} {
		t.Run(tc.method+tc.path, func(t *testing.T) {
			response := httptest.NewRecorder()
			NewHandler().ServeHTTP(response, httptest.NewRequest(tc.method, tc.path, nil))
			if response.Code != tc.want {
				t.Fatalf("status = %d; want %d", response.Code, tc.want)
			}
		})
	}
}
