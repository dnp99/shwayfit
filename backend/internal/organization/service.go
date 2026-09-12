// Package organization contains authorization and client-record rules that do
// not belong in HTTP handlers or Firestore infrastructure.
package organization

import (
	"context"
	"errors"
	"net/mail"
	"strings"
	"unicode/utf8"

	"github.com/dnp99/shwayfit/backend/internal/authn"
)

var (
	ErrNoActiveMembership = errors.New("no active organization membership")
	ErrAlreadyProvisioned = errors.New("identity already has an organization membership")
	ErrClientNotFound     = errors.New("client not found")
	ErrClientForbidden    = errors.New("client is not assigned to this trainer")
	ErrInvalidInput       = errors.New("invalid input")
)

type Organization struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
}

type Membership struct {
	OrganizationID string
	Role           string
	Active         bool
}

type Client struct {
	ID                 string `json:"id"`
	FirstName          string `json:"firstName"`
	LastName           string `json:"lastName"`
	Email              string `json:"email,omitempty"`
	Phone              string `json:"phone,omitempty"`
	Goals              string `json:"goals,omitempty"`
	Notes              string `json:"notes,omitempty"`
	Status             string `json:"status"`
	AssignedTrainerUID string `json:"-"`
}

type ClientInput struct {
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	Goals     string `json:"goals"`
	Notes     string `json:"notes"`
	Status    string `json:"status"`
}

// Store is deliberately small so domain rules can be tested without Firestore.
type Store interface {
	CreateFirstOrganization(context.Context, authn.Identity, string) (Organization, error)
	CurrentMembership(context.Context, string) (Membership, error)
	GetOrganization(context.Context, string) (Organization, error)
	CreateClient(context.Context, string, string, ClientInput) (Client, error)
	ListClients(context.Context, string) ([]Client, error)
	GetClient(context.Context, string, string) (Client, error)
	UpdateClient(context.Context, string, string, ClientInput) (Client, error)
}

type Service struct{ store Store }

func NewService(store Store) *Service { return &Service{store: store} }

func (s *Service) CreateFirstOrganization(ctx context.Context, identity authn.Identity, displayName string) (Organization, error) {
	if err := validateOrganizationName(displayName); err != nil {
		return Organization{}, err
	}
	return s.store.CreateFirstOrganization(ctx, identity, strings.TrimSpace(displayName))
}

func (s *Service) CurrentOrganization(ctx context.Context, identity authn.Identity) (Organization, error) {
	membership, err := s.activeMembership(ctx, identity.UID)
	if err != nil {
		return Organization{}, err
	}
	return s.store.GetOrganization(ctx, membership.OrganizationID)
}

func (s *Service) CreateClient(ctx context.Context, identity authn.Identity, input ClientInput) (Client, error) {
	if err := validateClientInput(input); err != nil {
		return Client{}, err
	}
	membership, err := s.activeMembership(ctx, identity.UID)
	if err != nil {
		return Client{}, err
	}
	if membership.Role != "owner" {
		return Client{}, ErrClientForbidden
	}
	return s.store.CreateClient(ctx, membership.OrganizationID, identity.UID, normalizeClientInput(input))
}

func (s *Service) ListClients(ctx context.Context, identity authn.Identity) ([]Client, error) {
	membership, err := s.activeMembership(ctx, identity.UID)
	if err != nil {
		return nil, err
	}
	clients, err := s.store.ListClients(ctx, membership.OrganizationID)
	if err != nil {
		return nil, err
	}
	if membership.Role == "owner" {
		return clients, nil
	}
	assigned := make([]Client, 0, len(clients))
	for _, client := range clients {
		if client.AssignedTrainerUID == identity.UID {
			assigned = append(assigned, client)
		}
	}
	return assigned, nil
}

func (s *Service) GetClient(ctx context.Context, identity authn.Identity, clientID string) (Client, error) {
	membership, err := s.activeMembership(ctx, identity.UID)
	if err != nil {
		return Client{}, err
	}
	client, err := s.store.GetClient(ctx, membership.OrganizationID, clientID)
	if err != nil {
		return Client{}, err
	}
	if membership.Role != "owner" && client.AssignedTrainerUID != identity.UID {
		return Client{}, ErrClientForbidden
	}
	return client, nil
}

func (s *Service) UpdateClient(ctx context.Context, identity authn.Identity, clientID string, input ClientInput) (Client, error) {
	if err := validateClientInput(input); err != nil {
		return Client{}, err
	}
	membership, err := s.activeMembership(ctx, identity.UID)
	if err != nil {
		return Client{}, err
	}
	client, err := s.store.GetClient(ctx, membership.OrganizationID, clientID)
	if err != nil {
		return Client{}, err
	}
	if membership.Role != "owner" && client.AssignedTrainerUID != identity.UID {
		return Client{}, ErrClientForbidden
	}
	return s.store.UpdateClient(ctx, membership.OrganizationID, clientID, normalizeClientInput(input))
}

func (s *Service) activeMembership(ctx context.Context, uid string) (Membership, error) {
	membership, err := s.store.CurrentMembership(ctx, uid)
	if err != nil {
		return Membership{}, err
	}
	if !membership.Active || membership.OrganizationID == "" {
		return Membership{}, ErrNoActiveMembership
	}
	return membership, nil
}

func validateOrganizationName(value string) error {
	if !validLength(strings.TrimSpace(value), 2, 80) {
		return ErrInvalidInput
	}
	return nil
}

func validateClientInput(input ClientInput) error {
	if !validLength(strings.TrimSpace(input.FirstName), 1, 80) || !validLength(strings.TrimSpace(input.LastName), 1, 80) {
		return ErrInvalidInput
	}
	if !optionalLength(input.Phone, 40) || !optionalLength(input.Goals, 2000) || !optionalLength(input.Notes, 4000) {
		return ErrInvalidInput
	}
	if input.Status != "active" && input.Status != "archived" {
		return ErrInvalidInput
	}
	if input.Email != "" {
		address, err := mail.ParseAddress(input.Email)
		if err != nil || address.Address != input.Email || !optionalLength(input.Email, 254) {
			return ErrInvalidInput
		}
	}
	return nil
}

func normalizeClientInput(input ClientInput) ClientInput {
	input.FirstName, input.LastName = strings.TrimSpace(input.FirstName), strings.TrimSpace(input.LastName)
	input.Email, input.Phone = strings.TrimSpace(input.Email), strings.TrimSpace(input.Phone)
	input.Goals, input.Notes = strings.TrimSpace(input.Goals), strings.TrimSpace(input.Notes)
	return input
}

func validLength(value string, minimum, maximum int) bool {
	length := utf8.RuneCountInString(value)
	return length >= minimum && length <= maximum
}
func optionalLength(value string, maximum int) bool {
	return value == "" || validLength(value, 1, maximum)
}
