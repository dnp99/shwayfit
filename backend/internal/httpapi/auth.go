package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/dnp99/shwayfit/backend/internal/authn"
)

type identityContextKey struct{}

func requireIdentity(verifier authn.Verifier, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if verifier == nil {
			writeError(w, http.StatusServiceUnavailable, "authentication_unavailable", "Authentication is not configured")
			return
		}
		rawToken, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
		if !ok || rawToken == "" {
			writeError(w, http.StatusUnauthorized, "unauthenticated", "A Firebase ID token is required")
			return
		}
		identity, err := verifier.VerifyIDToken(r.Context(), rawToken)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "unauthenticated", "The Firebase ID token is invalid or expired")
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), identityContextKey{}, identity)))
	})
}

func identityFromContext(ctx context.Context) authn.Identity {
	identity, _ := ctx.Value(identityContextKey{}).(authn.Identity)
	return identity
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(struct {
		Error struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}{Error: struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	}{Code: code, Message: message}})
}
