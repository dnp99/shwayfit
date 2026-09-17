package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/dnp99/shwayfit/backend/internal/authn"
)

type testVerifier struct {
	identity  authn.Identity
	err       error
	revokeErr error
}

func (v testVerifier) VerifyIDToken(_ context.Context, _ string) (authn.Identity, error) {
	return v.identity, v.err
}

func (v testVerifier) RevokeRefreshTokens(_ context.Context, _ string) error { return v.revokeErr }

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

func TestCurrentIdentity(t *testing.T) {
	handler := NewHandler(Config{TokenVerifier: testVerifier{identity: authn.Identity{
		UID: "trainer-123", Email: "trainer@example.com", EmailVerified: true,
	}}})

	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/me", nil)
	request.Header.Set("Authorization", "Bearer signed-token")
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d", response.Code)
	}
	var body struct {
		UID           string `json:"uid"`
		Email         string `json:"email"`
		EmailVerified bool   `json:"emailVerified"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.UID != "trainer-123" || body.Email != "trainer@example.com" || !body.EmailVerified {
		t.Fatalf("unexpected identity: %+v", body)
	}
}

func TestCurrentIdentityRejectsUnauthenticatedRequests(t *testing.T) {
	handler := NewHandler(Config{TokenVerifier: testVerifier{err: errors.New("invalid token")}})

	for _, tc := range []struct {
		name, authorization string
		want                int
	}{
		{name: "missing token", want: http.StatusUnauthorized},
		{name: "wrong scheme", authorization: "Basic token", want: http.StatusUnauthorized},
		{name: "invalid token", authorization: "Bearer invalid-token", want: http.StatusUnauthorized},
	} {
		t.Run(tc.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodGet, "/api/v1/me", nil)
			if tc.authorization != "" {
				request.Header.Set("Authorization", tc.authorization)
			}
			handler.ServeHTTP(response, request)
			if response.Code != tc.want {
				t.Fatalf("status = %d; want %d", response.Code, tc.want)
			}
		})
	}
}

func TestRevokeSession(t *testing.T) {
	handler := NewHandler(Config{TokenVerifier: testVerifier{identity: authn.Identity{UID: "trainer-123"}}})
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/session/revoke", nil)
	request.Header.Set("Authorization", "Bearer signed-token")
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusNoContent {
		t.Fatalf("status = %d", response.Code)
	}
	if response.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("session revocation must not be cached")
	}
}

func TestRevokeSessionReportsUnavailableRevoker(t *testing.T) {
	handler := NewHandler(Config{TokenVerifier: verifierWithoutRevocation{identity: authn.Identity{UID: "trainer-123"}}})
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/session/revoke", nil)
	request.Header.Set("Authorization", "Bearer signed-token")
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d", response.Code)
	}
}

func TestRevokeSessionReportsFirebaseFailure(t *testing.T) {
	handler := NewHandler(Config{TokenVerifier: testVerifier{
		identity:  authn.Identity{UID: "trainer-123"},
		revokeErr: errors.New("firebase unavailable"),
	}})
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/session/revoke", nil)
	request.Header.Set("Authorization", "Bearer signed-token")
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d", response.Code)
	}
}

type verifierWithoutRevocation struct{ identity authn.Identity }

func (v verifierWithoutRevocation) VerifyIDToken(_ context.Context, _ string) (authn.Identity, error) {
	return v.identity, nil
}
