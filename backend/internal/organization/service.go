// Package organization contains authorization and client-record rules that do
// not belong in HTTP handlers or Firestore infrastructure.
package organization

import (
	"context"
	"errors"
	"net/mail"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/dnp99/shwayfit/backend/internal/authn"
)

var (
	ErrNoActiveMembership    = errors.New("no active organization membership")
	ErrAlreadyProvisioned    = errors.New("identity already has an organization membership")
	ErrClientNotFound        = errors.New("client not found")
	ErrClientForbidden       = errors.New("client is not assigned to this trainer")
	ErrPackageOptionNotFound = errors.New("package option not found")
	ErrPackageOptionArchived = errors.New("package option is archived")
	ErrActiveClientPackage   = errors.New("client already has an active package")
	ErrNoActiveClientPackage = errors.New("client has no active package")
	ErrNoRemainingSessions   = errors.New("client package has no remaining sessions")
	ErrClientArchived        = errors.New("client is archived")
	ErrAppointmentNotFound   = errors.New("appointment not found")
	ErrAppointmentCompleted  = errors.New("appointment is already completed")
	ErrIdempotencyKeyReuse   = errors.New("idempotency key was used for another appointment")
	ErrInvalidInput          = errors.New("invalid input")
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
	PreferredStartTime string `json:"preferredStartTime,omitempty"`
	PreferredEndTime   string `json:"preferredEndTime,omitempty"`
	Status             string `json:"status"`
	AssignedTrainerUID string `json:"-"`
}

type ClientInput struct {
	FirstName          string `json:"firstName"`
	LastName           string `json:"lastName"`
	Email              string `json:"email"`
	Phone              string `json:"phone"`
	Goals              string `json:"goals"`
	Notes              string `json:"notes"`
	PreferredStartTime string `json:"preferredStartTime"`
	PreferredEndTime   string `json:"preferredEndTime"`
	Status             string `json:"status"`
}

// PackageOption is a reusable organization-scoped session allowance. Client
// package instances will snapshot these values in a later slice.
type PackageOption struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	IncludedSessions int    `json:"includedSessions"`
	Status           string `json:"status"`
}

type PackageOptionInput struct {
	Name             string `json:"name"`
	IncludedSessions int    `json:"includedSessions"`
}

// ClientPackage snapshots the sold option. Later option changes can never
// rewrite its allowance or balance history.
type ClientPackage struct {
	ID                string `json:"id"`
	PackageOptionID   string `json:"packageOptionId"`
	PackageName       string `json:"packageName"`
	IncludedSessions  int    `json:"includedSessions"`
	RemainingSessions int    `json:"remainingSessions"`
	Status            string `json:"status"`
}

// Appointment records a scheduled session. Booking does not consume a package
// session; a later completion operation will own that transaction.
type Appointment struct {
	ID                 string    `json:"id"`
	ClientID           string    `json:"clientId"`
	StartAt            time.Time `json:"startAt"`
	DurationMinutes    int       `json:"durationMinutes"`
	Notes              string    `json:"notes,omitempty"`
	Status             string    `json:"status"`
	AssignedTrainerUID string    `json:"-"`
}

type AppointmentInput struct {
	ClientID        string    `json:"clientId"`
	StartAt         time.Time `json:"startAt"`
	DurationMinutes int       `json:"durationMinutes"`
	Notes           string    `json:"notes"`
}

// AppointmentCompletion is the single, atomic outcome of completing a
// session. Returning it on a retried request lets the UI recover safely from
// a lost response without debiting the client's package a second time.
type AppointmentCompletion struct {
	Appointment   Appointment   `json:"appointment"`
	ClientPackage ClientPackage `json:"clientPackage"`
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
	CreatePackageOption(context.Context, string, PackageOptionInput) (PackageOption, error)
	ListPackageOptions(context.Context, string) ([]PackageOption, error)
	ArchivePackageOption(context.Context, string, string) (PackageOption, error)
	AssignClientPackage(context.Context, string, string, string) (ClientPackage, error)
	ListClientPackages(context.Context, string, string) ([]ClientPackage, error)
	CreateAppointment(context.Context, string, string, AppointmentInput) (Appointment, error)
	ListAppointments(context.Context, string, time.Time, time.Time) ([]Appointment, error)
	GetAppointment(context.Context, string, string) (Appointment, error)
	CompleteAppointment(context.Context, string, string, string, string) (AppointmentCompletion, error)
}

func (s *Service) CreateAppointment(ctx context.Context, identity authn.Identity, input AppointmentInput) (Appointment, error) {
	if err := validateAppointmentInput(input); err != nil {
		return Appointment{}, err
	}
	membership, err := s.activeMembership(ctx, identity.UID)
	if err != nil {
		return Appointment{}, err
	}
	client, err := s.store.GetClient(ctx, membership.OrganizationID, strings.TrimSpace(input.ClientID))
	if err != nil {
		return Appointment{}, err
	}
	if membership.Role != "owner" && client.AssignedTrainerUID != identity.UID {
		return Appointment{}, ErrClientForbidden
	}
	if client.Status != "active" {
		return Appointment{}, ErrClientArchived
	}
	packages, err := s.store.ListClientPackages(ctx, membership.OrganizationID, client.ID)
	if err != nil {
		return Appointment{}, err
	}
	if !hasRemainingPackageSession(packages) {
		return Appointment{}, ErrNoRemainingSessions
	}
	input.ClientID, input.Notes = strings.TrimSpace(input.ClientID), strings.TrimSpace(input.Notes)
	return s.store.CreateAppointment(ctx, membership.OrganizationID, client.AssignedTrainerUID, input)
}

func (s *Service) ListAppointments(ctx context.Context, identity authn.Identity, from, to time.Time) ([]Appointment, error) {
	if !from.Before(to) {
		return nil, ErrInvalidInput
	}
	membership, err := s.activeMembership(ctx, identity.UID)
	if err != nil {
		return nil, err
	}
	appointments, err := s.store.ListAppointments(ctx, membership.OrganizationID, from, to)
	if err != nil || membership.Role == "owner" {
		return appointments, err
	}
	assigned := make([]Appointment, 0, len(appointments))
	for _, appointment := range appointments {
		if appointment.AssignedTrainerUID == identity.UID {
			assigned = append(assigned, appointment)
		}
	}
	return assigned, nil
}

func (s *Service) CompleteAppointment(ctx context.Context, identity authn.Identity, appointmentID, idempotencyKey string) (AppointmentCompletion, error) {
	appointmentID, idempotencyKey = strings.TrimSpace(appointmentID), strings.TrimSpace(idempotencyKey)
	if appointmentID == "" || !validIdempotencyKey(idempotencyKey) {
		return AppointmentCompletion{}, ErrInvalidInput
	}
	membership, err := s.activeMembership(ctx, identity.UID)
	if err != nil {
		return AppointmentCompletion{}, err
	}
	appointment, err := s.store.GetAppointment(ctx, membership.OrganizationID, appointmentID)
	if err != nil {
		return AppointmentCompletion{}, err
	}
	if membership.Role != "owner" && appointment.AssignedTrainerUID != identity.UID {
		return AppointmentCompletion{}, ErrClientForbidden
	}
	return s.store.CompleteAppointment(ctx, membership.OrganizationID, appointmentID, identity.UID, idempotencyKey)
}

func (s *Service) CreatePackageOption(ctx context.Context, identity authn.Identity, input PackageOptionInput) (PackageOption, error) {
	if err := validatePackageOptionInput(input); err != nil {
		return PackageOption{}, err
	}
	membership, err := s.activeMembership(ctx, identity.UID)
	if err != nil {
		return PackageOption{}, err
	}
	input.Name = strings.TrimSpace(input.Name)
	return s.store.CreatePackageOption(ctx, membership.OrganizationID, input)
}

func (s *Service) ListPackageOptions(ctx context.Context, identity authn.Identity) ([]PackageOption, error) {
	membership, err := s.activeMembership(ctx, identity.UID)
	if err != nil {
		return nil, err
	}
	return s.store.ListPackageOptions(ctx, membership.OrganizationID)
}

func (s *Service) ArchivePackageOption(ctx context.Context, identity authn.Identity, optionID string) (PackageOption, error) {
	membership, err := s.activeMembership(ctx, identity.UID)
	if err != nil {
		return PackageOption{}, err
	}
	return s.store.ArchivePackageOption(ctx, membership.OrganizationID, optionID)
}

func (s *Service) AssignClientPackage(ctx context.Context, identity authn.Identity, clientID, optionID string) (ClientPackage, error) {
	if strings.TrimSpace(optionID) == "" {
		return ClientPackage{}, ErrInvalidInput
	}
	membership, err := s.activeMembership(ctx, identity.UID)
	if err != nil {
		return ClientPackage{}, err
	}
	client, err := s.store.GetClient(ctx, membership.OrganizationID, clientID)
	if err != nil {
		return ClientPackage{}, err
	}
	if membership.Role != "owner" && client.AssignedTrainerUID != identity.UID {
		return ClientPackage{}, ErrClientForbidden
	}
	return s.store.AssignClientPackage(ctx, membership.OrganizationID, clientID, strings.TrimSpace(optionID))
}

func (s *Service) ListClientPackages(ctx context.Context, identity authn.Identity, clientID string) ([]ClientPackage, error) {
	membership, err := s.activeMembership(ctx, identity.UID)
	if err != nil {
		return nil, err
	}
	client, err := s.store.GetClient(ctx, membership.OrganizationID, clientID)
	if err != nil {
		return nil, err
	}
	if membership.Role != "owner" && client.AssignedTrainerUID != identity.UID {
		return nil, ErrClientForbidden
	}
	return s.store.ListClientPackages(ctx, membership.OrganizationID, clientID)
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
	if !validTimeWindow(input.PreferredStartTime, input.PreferredEndTime) {
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

func validatePackageOptionInput(input PackageOptionInput) error {
	if !validLength(strings.TrimSpace(input.Name), 2, 80) || input.IncludedSessions < 1 || input.IncludedSessions > 100 {
		return ErrInvalidInput
	}
	return nil
}

func validateAppointmentInput(input AppointmentInput) error {
	if strings.TrimSpace(input.ClientID) == "" || input.StartAt.IsZero() || input.DurationMinutes < 15 || input.DurationMinutes > 240 || input.DurationMinutes%5 != 0 || !optionalLength(input.Notes, 2000) {
		return ErrInvalidInput
	}
	return nil
}

func hasRemainingPackageSession(packages []ClientPackage) bool {
	for _, clientPackage := range packages {
		if clientPackage.Status == "active" && clientPackage.RemainingSessions > 0 {
			return true
		}
	}
	return false
}

func validIdempotencyKey(value string) bool {
	return validLength(value, 8, 200)
}

func normalizeClientInput(input ClientInput) ClientInput {
	input.FirstName, input.LastName = strings.TrimSpace(input.FirstName), strings.TrimSpace(input.LastName)
	input.Email, input.Phone = strings.TrimSpace(input.Email), strings.TrimSpace(input.Phone)
	input.Goals, input.Notes = strings.TrimSpace(input.Goals), strings.TrimSpace(input.Notes)
	input.PreferredStartTime, input.PreferredEndTime = strings.TrimSpace(input.PreferredStartTime), strings.TrimSpace(input.PreferredEndTime)
	return input
}

var clockTimePattern = regexp.MustCompile(`^(?:[01][0-9]|2[0-3]):[0-5][0-9]$`)

func validTimeWindow(start, end string) bool {
	if start == "" && end == "" {
		return true
	}
	return clockTimePattern.MatchString(start) && clockTimePattern.MatchString(end) && start < end
}

func validLength(value string, minimum, maximum int) bool {
	length := utf8.RuneCountInString(value)
	return length >= minimum && length <= maximum
}
func optionalLength(value string, maximum int) bool {
	return value == "" || validLength(value, 1, maximum)
}
