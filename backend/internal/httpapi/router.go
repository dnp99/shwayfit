// Package httpapi owns the HTTP boundary. Business rules will live outside handlers.
package httpapi

import (
	"encoding/json"
	"net/http"
)

// NewHandler creates an isolated router so tests don't share global state.
func NewHandler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		_ = json.NewEncoder(w).Encode(struct {
			Status  string `json:"status"`
			Service string `json:"service"`
		}{Status: "ok", Service: "shwayfit-api"})
	})
	return mux
}
