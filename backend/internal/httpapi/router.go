// Package httpapi owns the HTTP boundary. Business rules will live outside handlers.
package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/dnp99/shwayfit/backend/internal/authn"
	"github.com/dnp99/shwayfit/backend/internal/organization"
)

// Config provides infrastructure dependencies to the HTTP boundary.
type Config struct {
	TokenVerifier       authn.Verifier
	OrganizationService *organization.Service
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
	mux.Handle("POST /api/v1/session/revoke", requireIdentity(dependencies.TokenVerifier, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		revoker, ok := dependencies.TokenVerifier.(authn.RefreshTokenRevoker)
		if !ok {
			writeError(w, http.StatusServiceUnavailable, "authentication_unavailable", "Session revocation is unavailable")
			return
		}
		if err := revoker.RevokeRefreshTokens(r.Context(), identityFromContext(r.Context()).UID); err != nil {
			writeError(w, http.StatusServiceUnavailable, "authentication_unavailable", "Session revocation is unavailable")
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		w.WriteHeader(http.StatusNoContent)
	})))
	if dependencies.OrganizationService != nil {
		registerOrganizationRoutes(mux, dependencies.TokenVerifier, dependencies.OrganizationService)
	}
	return mux
}
