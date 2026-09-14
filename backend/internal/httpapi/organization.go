package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/dnp99/shwayfit/backend/internal/authn"
	"github.com/dnp99/shwayfit/backend/internal/organization"
)

const maxRequestBodyBytes = 64 << 10

func registerOrganizationRoutes(mux *http.ServeMux, verifier authn.Verifier, service *organization.Service) {
	mux.Handle("POST /api/v1/organizations", requireIdentity(verifier, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var request struct {
			DisplayName string `json:"displayName"`
		}
		if !decodeJSON(w, r, &request) {
			return
		}
		organization, err := service.CreateFirstOrganization(r.Context(), identityFromContext(r.Context()), request.DisplayName)
		if err != nil {
			writeOrganizationError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, organization)
	})))
	mux.Handle("GET /api/v1/organizations/current", requireIdentity(verifier, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		organization, err := service.CurrentOrganization(r.Context(), identityFromContext(r.Context()))
		if err != nil {
			writeOrganizationError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, organization)
	})))
	mux.Handle("GET /api/v1/organizations/current/clients", requireIdentity(verifier, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		clients, err := service.ListClients(r.Context(), identityFromContext(r.Context()))
		if err != nil {
			writeOrganizationError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"clients": clients})
	})))
	mux.Handle("POST /api/v1/organizations/current/clients", requireIdentity(verifier, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var input organization.ClientInput
		if !decodeJSON(w, r, &input) {
			return
		}
		client, err := service.CreateClient(r.Context(), identityFromContext(r.Context()), input)
		if err != nil {
			writeOrganizationError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, client)
	})))
	mux.Handle("GET /api/v1/organizations/current/clients/{clientID}", requireIdentity(verifier, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		client, err := service.GetClient(r.Context(), identityFromContext(r.Context()), r.PathValue("clientID"))
		if err != nil {
			writeOrganizationError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, client)
	})))
	mux.Handle("PATCH /api/v1/organizations/current/clients/{clientID}", requireIdentity(verifier, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var input organization.ClientInput
		if !decodeJSON(w, r, &input) {
			return
		}
		client, err := service.UpdateClient(r.Context(), identityFromContext(r.Context()), r.PathValue("clientID"), input)
		if err != nil {
			writeOrganizationError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, client)
	})))
	registerPackageOptionRoutes(mux, verifier, service)
}

func registerPackageOptionRoutes(mux *http.ServeMux, verifier authn.Verifier, service *organization.Service) {
	mux.Handle("GET /api/v1/organizations/current/package-options", requireIdentity(verifier, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		options, err := service.ListPackageOptions(r.Context(), identityFromContext(r.Context()))
		if err != nil {
			writeOrganizationError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"packageOptions": options})
	})))
	mux.Handle("POST /api/v1/organizations/current/package-options", requireIdentity(verifier, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var input organization.PackageOptionInput
		if !decodeJSON(w, r, &input) {
			return
		}
		option, err := service.CreatePackageOption(r.Context(), identityFromContext(r.Context()), input)
		if err != nil {
			writeOrganizationError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, option)
	})))
	mux.Handle("PATCH /api/v1/organizations/current/package-options/{optionID}/archive", requireIdentity(verifier, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		option, err := service.ArchivePackageOption(r.Context(), identityFromContext(r.Context()), r.PathValue("optionID"))
		if err != nil {
			writeOrganizationError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, option)
	})))
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxRequestBodyBytes)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Request body is invalid")
		return false
	}
	if decoder.More() {
		writeError(w, http.StatusBadRequest, "invalid_request", "Request body must contain one JSON object")
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeOrganizationError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, organization.ErrInvalidInput):
		writeError(w, http.StatusBadRequest, "invalid_request", "One or more fields are invalid")
	case errors.Is(err, organization.ErrNoActiveMembership):
		writeError(w, http.StatusNotFound, "organization_not_found", "No active organization is available")
	case errors.Is(err, organization.ErrAlreadyProvisioned):
		writeError(w, http.StatusConflict, "organization_already_exists", "This account already has an organization")
	case errors.Is(err, organization.ErrClientNotFound):
		writeError(w, http.StatusNotFound, "client_not_found", "Client not found")
	case errors.Is(err, organization.ErrClientForbidden):
		writeError(w, http.StatusForbidden, "forbidden", "You do not have access to this client")
	case errors.Is(err, organization.ErrPackageOptionNotFound):
		writeError(w, http.StatusNotFound, "package_option_not_found", "Package option not found")
	default:
		writeError(w, http.StatusInternalServerError, "internal_error", "ShwayFit could not complete this request")
	}
}
