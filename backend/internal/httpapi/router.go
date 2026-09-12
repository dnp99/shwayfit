// Package httpapi owns the HTTP boundary. Business rules will live outside handlers.
package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/dnp99/shwayfit/backend/internal/authn"
)

// Config provides infrastructure dependencies to the HTTP boundary.
type Config struct {
	TokenVerifier authn.Verifier
}

// NewHandler creates an isolated router so tests don't share global state.
func NewHandler(config ...Config) http.Handler {
	var dependencies Config
	if len(config) > 0 {
		dependencies = config[0]
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		_ = json.NewEncoder(w).Encode(struct {
			Status  string `json:"status"`
			Service string `json:"service"`
		}{Status: "ok", Service: "shwayfit-api"})
	})
	mux.Handle("GET /api/v1/me", requireIdentity(dependencies.TokenVerifier, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		identity := identityFromContext(r.Context())
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		_ = json.NewEncoder(w).Encode(struct {
			UID           string `json:"uid"`
			Email         string `json:"email"`
			EmailVerified bool   `json:"emailVerified"`
		}{UID: identity.UID, Email: identity.Email, EmailVerified: identity.EmailVerified})
	})))
	return mux
}
