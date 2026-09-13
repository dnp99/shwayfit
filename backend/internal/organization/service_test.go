package organization

import (
	"context"
	"testing"

	"github.com/dnp99/shwayfit/backend/internal/authn"
)

type fakeStore struct {
	membership Membership
	client     Client
}

func (s *fakeStore) CreateFirstOrganization(_ context.Context, _ authn.Identity, name string) (Organization, error) {
	return Organization{ID: "organization-a", DisplayName: name}, nil
}
func (s *fakeStore) CurrentMembership(_ context.Context, _ string) (Membership, error) {
	return s.membership, nil
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

func TestClientAccessRejectsUnassignedTrainer(t *testing.T) {
	service := NewService(&fakeStore{membership: Membership{OrganizationID: "organization-a", Role: "trainer", Active: true}, client: Client{ID: "client-a", AssignedTrainerUID: "other-trainer"}})
	_, err := service.GetClient(context.Background(), authn.Identity{UID: "trainer-a"}, "client-a")
	if err != ErrClientForbidden {
		t.Fatalf("error = %v; want %v", err, ErrClientForbidden)
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
