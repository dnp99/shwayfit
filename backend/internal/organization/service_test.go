package organization

import (
	"context"
	"testing"
	"time"

	"github.com/dnp99/shwayfit/backend/internal/authn"
)

type fakeStore struct {
	membership  Membership
	client      Client
	options     []PackageOption
	packages    []ClientPackage
	appointment Appointment
	completion  AppointmentCompletion
	profile     TrainerProfile
}

func (s *fakeStore) CreateFirstOrganization(_ context.Context, _ authn.Identity, name string) (Organization, error) {
	return Organization{ID: "organization-a", DisplayName: name}, nil
}
func (s *fakeStore) CurrentMembership(_ context.Context, _ string) (Membership, error) {
	return s.membership, nil
}
func (s *fakeStore) GetTrainerProfile(_ context.Context, _ string) (TrainerProfile, error) {
	return s.profile, nil
}
func (s *fakeStore) UpdateTrainerProfile(_ context.Context, _ string, _ string, input TrainerProfileInput) (TrainerProfile, error) {
	s.profile = TrainerProfile{Phone: input.Phone}
	return s.profile, nil
}
func (s *fakeStore) GetOrganization(_ context.Context, id string) (Organization, error) {
	return Organization{ID: id, DisplayName: "Northstar Training"}, nil
}
func (s *fakeStore) CreateClient(_ context.Context, _ string, _ string, input ClientInput) (Client, error) {
	return Client{ID: "client-a", FirstName: input.FirstName, LastName: input.LastName, Status: input.Status}, nil
}
func (s *fakeStore) ListClients(_ context.Context, _ string) ([]Client, error) {
	return []Client{s.client}, nil
}
func (s *fakeStore) GetClient(_ context.Context, _ string, _ string) (Client, error) {
	return s.client, nil
}
func (s *fakeStore) UpdateClient(_ context.Context, _ string, id string, input ClientInput) (Client, error) {
	return Client{ID: id, FirstName: input.FirstName, LastName: input.LastName, Status: input.Status, AssignedTrainerUID: s.client.AssignedTrainerUID}, nil
}
func (s *fakeStore) CreatePackageOption(_ context.Context, _ string, input PackageOptionInput) (PackageOption, error) {
	return PackageOption{ID: "option-a", Name: input.Name, IncludedSessions: input.IncludedSessions, Status: "active"}, nil
}
func (s *fakeStore) ListPackageOptions(_ context.Context, _ string) ([]PackageOption, error) {
	return s.options, nil
}
func (s *fakeStore) ArchivePackageOption(_ context.Context, _ string, id string) (PackageOption, error) {
	return PackageOption{ID: id, Name: "Ten sessions", IncludedSessions: 10, Status: "archived"}, nil
}
func (s *fakeStore) AssignClientPackage(_ context.Context, _ string, _ string, optionID string) (ClientPackage, error) {
	return ClientPackage{ID: "package-a", PackageOptionID: optionID, PackageName: "Five sessions", IncludedSessions: 5, RemainingSessions: 5, Status: "active"}, nil
}
func (s *fakeStore) ListClientPackages(_ context.Context, _ string, _ string) ([]ClientPackage, error) {
	if s.packages != nil {
		return s.packages, nil
	}
	return []ClientPackage{{ID: "package-a", Status: "active", RemainingSessions: 1}}, nil
}
func (s *fakeStore) CreateAppointment(_ context.Context, _ string, _ string, input AppointmentInput) (Appointment, error) {
	return Appointment{ID: "appointment-a", ClientID: input.ClientID, StartAt: input.StartAt, DurationMinutes: input.DurationMinutes, Notes: input.Notes, Status: "scheduled"}, nil
}
func (s *fakeStore) ListAppointments(_ context.Context, _ string, _ time.Time, _ time.Time) ([]Appointment, error) {
	return []Appointment{}, nil
}
func (s *fakeStore) GetAppointment(_ context.Context, _ string, _ string) (Appointment, error) {
	if s.appointment.ID != "" {
		return s.appointment, nil
	}
	return Appointment{ID: "appointment-a", ClientID: "client-a", AssignedTrainerUID: s.client.AssignedTrainerUID, Status: "scheduled"}, nil
}
func (s *fakeStore) CompleteAppointment(_ context.Context, _ string, appointmentID, _ string, _ string) (AppointmentCompletion, error) {
	if s.completion.Appointment.ID != "" {
		return s.completion, nil
	}
	return AppointmentCompletion{Appointment: Appointment{ID: appointmentID, ClientID: "client-a", Status: "completed"}, ClientPackage: ClientPackage{ID: "package-a", RemainingSessions: 4, Status: "active"}}, nil
}

func TestClientAccessRejectsUnassignedTrainer(t *testing.T) {
	service := NewService(&fakeStore{membership: Membership{OrganizationID: "organization-a", Role: "trainer", Active: true}, client: Client{ID: "client-a", AssignedTrainerUID: "other-trainer"}})
	_, err := service.GetClient(context.Background(), authn.Identity{UID: "trainer-a"}, "client-a")
	if err != ErrClientForbidden {
		t.Fatalf("error = %v; want %v", err, ErrClientForbidden)
	}
}

func TestTrainerProfileRequiresAnActiveMembershipAndValidPhone(t *testing.T) {
	service := NewService(&fakeStore{membership: Membership{OrganizationID: "organization-a", Role: "owner", Active: true}})
	identity := authn.Identity{UID: "trainer-a", Name: "Avery Trainer", Email: "google@example.com"}
	profile, err := service.UpdateTrainerProfile(context.Background(), identity, TrainerProfileInput{Phone: "+1 (416) 555-0123"})
	if err != nil || profile.Name != "Avery Trainer" || profile.Email != "google@example.com" {
		t.Fatalf("profile = %#v, err = %v", profile, err)
	}
	if _, err := service.UpdateTrainerProfile(context.Background(), identity, TrainerProfileInput{Phone: "call me"}); err != ErrInvalidInput {
		t.Fatalf("invalid profile error = %v; want %v", err, ErrInvalidInput)
	}
}

func TestTrainerProfileUsesFirebaseIdentityWhenNoProfileIsSaved(t *testing.T) {
	service := NewService(&fakeStore{membership: Membership{OrganizationID: "organization-a", Role: "owner", Active: true}})
	profile, err := service.CurrentTrainerProfile(context.Background(), authn.Identity{UID: "trainer-a", Name: "Avery Trainer", Email: "google@example.com"})
	if err != nil || profile.Name != "Avery Trainer" || profile.Email != "google@example.com" {
		t.Fatalf("profile = %#v, err = %v", profile, err)
	}
}

func TestClientListOnlyIncludesAssignedClientsForTrainer(t *testing.T) {
	service := NewService(&fakeStore{membership: Membership{OrganizationID: "organization-a", Role: "trainer", Active: true}, client: Client{ID: "client-a", AssignedTrainerUID: "other-trainer"}})
	clients, err := service.ListClients(context.Background(), authn.Identity{UID: "trainer-a"})
	if err != nil {
		t.Fatal(err)
	}
	if len(clients) != 0 {
		t.Fatalf("clients = %#v; expected no unassigned clients", clients)
	}
}

func TestClientInputRequiresNamesAndApprovedStatus(t *testing.T) {
	service := NewService(&fakeStore{membership: Membership{OrganizationID: "organization-a", Role: "owner", Active: true}})
	_, err := service.CreateClient(context.Background(), authn.Identity{UID: "owner-a"}, ClientInput{FirstName: "", LastName: "Sample", Status: "active"})
	if err != ErrInvalidInput {
		t.Fatalf("error = %v; want %v", err, ErrInvalidInput)
	}
}

func TestClientInputValidatesPreferredTimeWindow(t *testing.T) {
	valid := ClientInput{FirstName: "Avery", LastName: "Sample", Status: "active"}
	for _, test := range []struct {
		name       string
		start, end string
		want       error
	}{
		{name: "omitted", want: nil},
		{name: "valid", start: "09:00", end: "11:30", want: nil},
		{name: "only start", start: "09:00", want: ErrInvalidInput},
		{name: "invalid format", start: "9:00", end: "11:30", want: ErrInvalidInput},
		{name: "end before start", start: "11:30", end: "09:00", want: ErrInvalidInput},
		{name: "zero length", start: "09:00", end: "09:00", want: ErrInvalidInput},
	} {
		t.Run(test.name, func(t *testing.T) {
			input := valid
			input.PreferredStartTime, input.PreferredEndTime = test.start, test.end
			err := validateClientInput(input)
			if err != test.want {
				t.Fatalf("validateClientInput() = %v, want %v", err, test.want)
			}
		})
	}
}

func TestClientInputValidatesOptionalContactDetails(t *testing.T) {
	valid := ClientInput{FirstName: "Avery", LastName: "Sample", Status: "active"}
	for _, test := range []struct {
		name  string
		email string
		phone string
		want  error
	}{
		{name: "omitted", want: nil},
		{name: "valid", email: "avery@example.com", phone: "+1 (416) 555-0123", want: nil},
		{name: "invalid email", email: "avery.example.com", want: ErrInvalidInput},
		{name: "phone letters", phone: "call Avery", want: ErrInvalidInput},
		{name: "phone too short", phone: "555-123", want: ErrInvalidInput},
	} {
		t.Run(test.name, func(t *testing.T) {
			input := valid
			input.Email, input.Phone = test.email, test.phone
			if err := validateClientInput(input); err != test.want {
				t.Fatalf("validateClientInput() = %v, want %v", err, test.want)
			}
		})
	}
}

func TestClientInputValidatesStartingMeasurements(t *testing.T) {
	valid := ClientInput{FirstName: "Avery", LastName: "Sample", Status: "active"}
	weight := 72.5
	height := 172.0
	for _, test := range []struct {
		name  string
		input ClientInput
		want  error
	}{
		{name: "omitted", input: valid, want: nil},
		{name: "height only", input: ClientInput{FirstName: valid.FirstName, LastName: valid.LastName, Status: valid.Status, HeightCM: &height}, want: nil},
		{name: "dated starting weight", input: ClientInput{FirstName: valid.FirstName, LastName: valid.LastName, Status: valid.Status, StartingWeightKG: &weight, StartingMeasurementDate: "2026-09-17", StartingMeasurementNotes: "Baseline"}, want: nil},
		{name: "weight needs date", input: ClientInput{FirstName: valid.FirstName, LastName: valid.LastName, Status: valid.Status, StartingWeightKG: &weight}, want: ErrInvalidInput},
		{name: "date without weight", input: ClientInput{FirstName: valid.FirstName, LastName: valid.LastName, Status: valid.Status, StartingMeasurementDate: "2026-09-17"}, want: ErrInvalidInput},
		{name: "height out of range", input: ClientInput{FirstName: valid.FirstName, LastName: valid.LastName, Status: valid.Status, HeightCM: float64Pointer(301)}, want: ErrInvalidInput},
	} {
		t.Run(test.name, func(t *testing.T) {
			if err := validateClientInput(test.input); err != test.want {
				t.Fatalf("validateClientInput() = %v, want %v", err, test.want)
			}
		})
	}
}

func float64Pointer(value float64) *float64 { return &value }

func TestPackageOptionAllowsActiveTrainerMembership(t *testing.T) {
	service := NewService(&fakeStore{membership: Membership{OrganizationID: "organization-a", Role: "trainer", Active: true}})
	option, err := service.CreatePackageOption(context.Background(), authn.Identity{UID: "trainer-a"}, PackageOptionInput{Name: "Five sessions", IncludedSessions: 5})
	if err != nil {
		t.Fatal(err)
	}
	if option.Name != "Five sessions" || option.IncludedSessions != 5 {
		t.Fatalf("option = %#v", option)
	}
}

func TestPackageOptionValidatesNameAndSessionCount(t *testing.T) {
	for _, input := range []PackageOptionInput{
		{Name: "", IncludedSessions: 5},
		{Name: "Five sessions", IncludedSessions: 0},
		{Name: "Five sessions", IncludedSessions: 101},
	} {
		if err := validatePackageOptionInput(input); err != ErrInvalidInput {
			t.Fatalf("validatePackageOptionInput(%+v) = %v; want %v", input, err, ErrInvalidInput)
		}
	}
	if err := validatePackageOptionInput(PackageOptionInput{Name: "Five sessions", IncludedSessions: 5}); err != nil {
		t.Fatalf("valid package option error = %v", err)
	}
}

func TestAssignClientPackageRejectsUnassignedTrainer(t *testing.T) {
	service := NewService(&fakeStore{membership: Membership{OrganizationID: "organization-a", Role: "trainer", Active: true}, client: Client{ID: "client-a", AssignedTrainerUID: "other-trainer"}})
	_, err := service.AssignClientPackage(context.Background(), authn.Identity{UID: "trainer-a"}, "client-a", "option-a")
	if err != ErrClientForbidden {
		t.Fatalf("error = %v; want %v", err, ErrClientForbidden)
	}
}

func TestAssignClientPackageRequiresOption(t *testing.T) {
	service := NewService(&fakeStore{membership: Membership{OrganizationID: "organization-a", Role: "owner", Active: true}, client: Client{ID: "client-a"}})
	_, err := service.AssignClientPackage(context.Background(), authn.Identity{UID: "owner-a"}, "client-a", "")
	if err != ErrInvalidInput {
		t.Fatalf("error = %v; want %v", err, ErrInvalidInput)
	}
}

func TestCreateAppointmentAllowsAnOverlapBecauseConflictWarningsAreClientSide(t *testing.T) {
	service := NewService(&fakeStore{membership: Membership{OrganizationID: "organization-a", Role: "owner", Active: true}, client: Client{ID: "client-a", Status: "active"}})
	appointment, err := service.CreateAppointment(context.Background(), authn.Identity{UID: "owner-a"}, AppointmentInput{ClientID: "client-a", StartAt: time.Date(2026, time.September, 17, 9, 0, 0, 0, time.UTC), DurationMinutes: 60})
	if err != nil {
		t.Fatal(err)
	}
	if appointment.Status != "scheduled" {
		t.Fatalf("status = %q", appointment.Status)
	}
}

func TestCreateAppointmentValidatesScheduleInput(t *testing.T) {
	for _, input := range []AppointmentInput{{}, {ClientID: "client-a", StartAt: time.Now(), DurationMinutes: 10}, {ClientID: "client-a", StartAt: time.Now(), DurationMinutes: 61}} {
		if validateAppointmentInput(input) != ErrInvalidInput {
			t.Fatalf("input %#v should be invalid", input)
		}
	}
}

func TestCreateAppointmentRequiresAnActivePackage(t *testing.T) {
	service := NewService(&fakeStore{membership: Membership{OrganizationID: "organization-a", Role: "owner", Active: true}, client: Client{ID: "client-a", Status: "active"}, packages: []ClientPackage{}})
	_, err := service.CreateAppointment(context.Background(), authn.Identity{UID: "owner-a"}, AppointmentInput{ClientID: "client-a", StartAt: time.Date(2026, time.September, 17, 9, 0, 0, 0, time.UTC), DurationMinutes: 60})
	if err != ErrNoRemainingSessions {
		t.Fatalf("error = %v, want %v", err, ErrNoRemainingSessions)
	}
}

func TestCreateAppointmentRequiresRemainingPackageSessions(t *testing.T) {
	service := NewService(&fakeStore{membership: Membership{OrganizationID: "organization-a", Role: "owner", Active: true}, client: Client{ID: "client-a", Status: "active"}, packages: []ClientPackage{{ID: "package-a", Status: "active", RemainingSessions: 0}}})
	_, err := service.CreateAppointment(context.Background(), authn.Identity{UID: "owner-a"}, AppointmentInput{ClientID: "client-a", StartAt: time.Date(2026, time.September, 17, 9, 0, 0, 0, time.UTC), DurationMinutes: 60})
	if err != ErrNoRemainingSessions {
		t.Fatalf("error = %v, want %v", err, ErrNoRemainingSessions)
	}
}

func TestCompleteAppointmentAllowsAssignedTrainer(t *testing.T) {
	service := NewService(&fakeStore{membership: Membership{OrganizationID: "organization-a", Role: "trainer", Active: true}, client: Client{ID: "client-a", AssignedTrainerUID: "trainer-a"}, appointment: Appointment{ID: "appointment-a", ClientID: "client-a", AssignedTrainerUID: "trainer-a", Status: "scheduled"}})
	completion, err := service.CompleteAppointment(context.Background(), authn.Identity{UID: "trainer-a"}, "appointment-a", "completion-key-123")
	if err != nil {
		t.Fatal(err)
	}
	if completion.Appointment.Status != "completed" || completion.ClientPackage.RemainingSessions != 4 {
		t.Fatalf("completion = %#v", completion)
	}
}

func TestCompleteAppointmentRejectsInvalidKeyAndUnassignedTrainer(t *testing.T) {
	service := NewService(&fakeStore{membership: Membership{OrganizationID: "organization-a", Role: "trainer", Active: true}, client: Client{ID: "client-a", AssignedTrainerUID: "other-trainer"}, appointment: Appointment{ID: "appointment-a", ClientID: "client-a", AssignedTrainerUID: "other-trainer", Status: "scheduled"}})
	if _, err := service.CompleteAppointment(context.Background(), authn.Identity{UID: "trainer-a"}, "appointment-a", "short"); err != ErrInvalidInput {
		t.Fatalf("short key error = %v", err)
	}
	if _, err := service.CompleteAppointment(context.Background(), authn.Identity{UID: "trainer-a"}, "appointment-a", "completion-key-123"); err != ErrClientForbidden {
		t.Fatalf("access error = %v", err)
	}
}
