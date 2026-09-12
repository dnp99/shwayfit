package organization

import (
	"context"
	"errors"

	"cloud.google.com/go/firestore"
	"github.com/dnp99/shwayfit/backend/internal/authn"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// FirestoreStore is server-only. Firestore rules deny browser access, so the
// authorization checks in Service are always reached before client records.
type FirestoreStore struct{ client *firestore.Client }

func NewFirestoreStore(ctx context.Context, projectID string) (*FirestoreStore, error) {
	client, err := firestore.NewClient(ctx, projectID)
	if err != nil {
		return nil, err
	}
	return &FirestoreStore{client: client}, nil
}

func (s *FirestoreStore) Close() error { return s.client.Close() }

func (s *FirestoreStore) CreateFirstOrganization(ctx context.Context, identity authn.Identity, displayName string) (organization Organization, resultErr error) {
	organizationRef := s.client.Collection("organizations").NewDoc()
	membershipRef := s.client.Collection("trainerMemberships").Doc(identity.UID)
	memberRef := organizationRef.Collection("members").Doc(identity.UID)
	resultErr = s.client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		_, err := tx.Get(membershipRef)
		if err == nil {
			return ErrAlreadyProvisioned
		}
		if status.Code(err) != codes.NotFound {
			return err
		}
		organization = Organization{ID: organizationRef.ID, DisplayName: displayName}
		organizationData := map[string]any{"displayName": displayName, "createdAt": firestore.ServerTimestamp}
		membershipData := map[string]any{"organizationId": organizationRef.ID, "role": "owner", "active": true, "email": identity.Email, "createdAt": firestore.ServerTimestamp}
		if err := tx.Create(organizationRef, organizationData); err != nil {
			return err
		}
		if err := tx.Create(membershipRef, membershipData); err != nil {
			return err
		}
		return tx.Create(memberRef, membershipData)
	})
	return organization, resultErr
}

func (s *FirestoreStore) CurrentMembership(ctx context.Context, uid string) (Membership, error) {
	snapshot, err := s.client.Collection("trainerMemberships").Doc(uid).Get(ctx)
	if status.Code(err) == codes.NotFound {
		return Membership{}, ErrNoActiveMembership
	}
	if err != nil {
		return Membership{}, err
	}
	data := snapshot.Data()
	organizationID, _ := data["organizationId"].(string)
	role, _ := data["role"].(string)
	active, _ := data["active"].(bool)
	return Membership{OrganizationID: organizationID, Role: role, Active: active}, nil
}

func (s *FirestoreStore) GetOrganization(ctx context.Context, organizationID string) (Organization, error) {
	snapshot, err := s.client.Collection("organizations").Doc(organizationID).Get(ctx)
	if status.Code(err) == codes.NotFound {
		return Organization{}, ErrNoActiveMembership
	}
	if err != nil {
		return Organization{}, err
	}
	displayName, _ := snapshot.Data()["displayName"].(string)
	return Organization{ID: snapshot.Ref.ID, DisplayName: displayName}, nil
}

func (s *FirestoreStore) CreateClient(ctx context.Context, organizationID, assignedTrainerUID string, input ClientInput) (Client, error) {
	ref := s.client.Collection("organizations").Doc(organizationID).Collection("clients").NewDoc()
	data := clientData(input)
	data["assignedTrainerUid"] = assignedTrainerUID
	data["createdAt"] = firestore.ServerTimestamp
	data["updatedAt"] = firestore.ServerTimestamp
	if _, err := ref.Create(ctx, data); err != nil {
		return Client{}, err
	}
	return clientFromData(ref.ID, data), nil
}

func (s *FirestoreStore) ListClients(ctx context.Context, organizationID string) ([]Client, error) {
	iter := s.client.Collection("organizations").Doc(organizationID).Collection("clients").OrderBy("lastName", firestore.Asc).Limit(100).Documents(ctx)
	defer iter.Stop()
	clients := []Client{}
	for {
		snapshot, err := iter.Next()
		if errors.Is(err, iterator.Done) {
			return clients, nil
		}
		if err != nil {
			return nil, err
		}
		clients = append(clients, clientFromData(snapshot.Ref.ID, snapshot.Data()))
	}
}

func (s *FirestoreStore) GetClient(ctx context.Context, organizationID, clientID string) (Client, error) {
	snapshot, err := s.client.Collection("organizations").Doc(organizationID).Collection("clients").Doc(clientID).Get(ctx)
	if status.Code(err) == codes.NotFound {
		return Client{}, ErrClientNotFound
	}
	if err != nil {
		return Client{}, err
	}
	return clientFromData(snapshot.Ref.ID, snapshot.Data()), nil
}

func (s *FirestoreStore) UpdateClient(ctx context.Context, organizationID, clientID string, input ClientInput) (Client, error) {
	ref := s.client.Collection("organizations").Doc(organizationID).Collection("clients").Doc(clientID)
	data := clientData(input)
	data["updatedAt"] = firestore.ServerTimestamp
	if _, err := ref.Update(ctx, toUpdates(data)); status.Code(err) == codes.NotFound {
		return Client{}, ErrClientNotFound
	} else if err != nil {
		return Client{}, err
	}
	snapshot, err := ref.Get(ctx)
	if err != nil {
		return Client{}, err
	}
	return clientFromData(snapshot.Ref.ID, snapshot.Data()), nil
}

func clientData(input ClientInput) map[string]any {
	return map[string]any{"firstName": input.FirstName, "lastName": input.LastName, "email": input.Email, "phone": input.Phone, "goals": input.Goals, "notes": input.Notes, "status": input.Status}
}
func toUpdates(data map[string]any) []firestore.Update {
	updates := make([]firestore.Update, 0, len(data))
	for field, value := range data {
		updates = append(updates, firestore.Update{Path: field, Value: value})
	}
	return updates
}
func clientFromData(id string, data map[string]any) Client {
	firstName, _ := data["firstName"].(string)
	lastName, _ := data["lastName"].(string)
	email, _ := data["email"].(string)
	phone, _ := data["phone"].(string)
	goals, _ := data["goals"].(string)
	notes, _ := data["notes"].(string)
	status, _ := data["status"].(string)
	assignedTrainerUID, _ := data["assignedTrainerUid"].(string)
	return Client{ID: id, FirstName: firstName, LastName: lastName, Email: email, Phone: phone, Goals: goals, Notes: notes, Status: status, AssignedTrainerUID: assignedTrainerUID}
}
