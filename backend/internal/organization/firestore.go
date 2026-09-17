package organization

import (
	"context"
	"errors"
	"time"

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

func (s *FirestoreStore) CreatePackageOption(ctx context.Context, organizationID string, input PackageOptionInput) (PackageOption, error) {
	ref := s.client.Collection("organizations").Doc(organizationID).Collection("packageOptions").NewDoc()
	option := PackageOption{ID: ref.ID, Name: input.Name, IncludedSessions: input.IncludedSessions, Status: "active"}
	data := map[string]any{
		"name": option.Name, "includedSessions": option.IncludedSessions, "status": option.Status,
		"createdAt": firestore.ServerTimestamp, "updatedAt": firestore.ServerTimestamp,
	}
	if _, err := ref.Create(ctx, data); err != nil {
		return PackageOption{}, err
	}
	return option, nil
}

func (s *FirestoreStore) ListPackageOptions(ctx context.Context, organizationID string) ([]PackageOption, error) {
	iter := s.client.Collection("organizations").Doc(organizationID).Collection("packageOptions").OrderBy("name", firestore.Asc).Limit(100).Documents(ctx)
	defer iter.Stop()
	options := []PackageOption{}
	for {
		snapshot, err := iter.Next()
		if errors.Is(err, iterator.Done) {
			return options, nil
		}
		if err != nil {
			return nil, err
		}
		options = append(options, packageOptionFromData(snapshot.Ref.ID, snapshot.Data()))
	}
}

func (s *FirestoreStore) ArchivePackageOption(ctx context.Context, organizationID, optionID string) (PackageOption, error) {
	ref := s.client.Collection("organizations").Doc(organizationID).Collection("packageOptions").Doc(optionID)
	if _, err := ref.Update(ctx, []firestore.Update{{Path: "status", Value: "archived"}, {Path: "updatedAt", Value: firestore.ServerTimestamp}}); status.Code(err) == codes.NotFound {
		return PackageOption{}, ErrPackageOptionNotFound
	} else if err != nil {
		return PackageOption{}, err
	}
	snapshot, err := ref.Get(ctx)
	if err != nil {
		return PackageOption{}, err
	}
	return packageOptionFromData(ref.ID, snapshot.Data()), nil
}

func (s *FirestoreStore) AssignClientPackage(ctx context.Context, organizationID, clientID, optionID string) (clientPackage ClientPackage, resultErr error) {
	clientRef := s.client.Collection("organizations").Doc(organizationID).Collection("clients").Doc(clientID)
	optionRef := s.client.Collection("organizations").Doc(organizationID).Collection("packageOptions").Doc(optionID)
	packageRef := clientRef.Collection("packages").NewDoc()
	auditRef := packageRef.Collection("auditEvents").NewDoc()
	resultErr = s.client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		clientSnapshot, err := tx.Get(clientRef)
		if status.Code(err) == codes.NotFound {
			return ErrClientNotFound
		}
		if err != nil {
			return err
		}
		if activePackageID, _ := clientSnapshot.Data()["activePackageId"].(string); activePackageID != "" {
			return ErrActiveClientPackage
		}
		optionSnapshot, err := tx.Get(optionRef)
		if status.Code(err) == codes.NotFound {
			return ErrPackageOptionNotFound
		}
		if err != nil {
			return err
		}
		option := packageOptionFromData(optionRef.ID, optionSnapshot.Data())
		if option.Status != "active" {
			return ErrPackageOptionArchived
		}
		clientPackage = ClientPackage{ID: packageRef.ID, PackageOptionID: option.ID, PackageName: option.Name, IncludedSessions: option.IncludedSessions, RemainingSessions: option.IncludedSessions, Status: "active"}
		packageData := map[string]any{
			"packageOptionId": clientPackage.PackageOptionID, "packageName": clientPackage.PackageName,
			"includedSessions": clientPackage.IncludedSessions, "remainingSessions": clientPackage.RemainingSessions,
			"status": clientPackage.Status, "createdAt": firestore.ServerTimestamp,
		}
		auditData := map[string]any{
			"type": "opened", "balanceDelta": clientPackage.IncludedSessions,
			"balanceAfter": clientPackage.RemainingSessions, "createdAt": firestore.ServerTimestamp,
		}
		if err := tx.Create(packageRef, packageData); err != nil {
			return err
		}
		if err := tx.Create(auditRef, auditData); err != nil {
			return err
		}
		return tx.Update(clientRef, []firestore.Update{{Path: "activePackageId", Value: packageRef.ID}, {Path: "updatedAt", Value: firestore.ServerTimestamp}})
	})
	return clientPackage, resultErr
}

func (s *FirestoreStore) ListClientPackages(ctx context.Context, organizationID, clientID string) ([]ClientPackage, error) {
	iter := s.client.Collection("organizations").Doc(organizationID).Collection("clients").Doc(clientID).Collection("packages").OrderBy("createdAt", firestore.Desc).Limit(100).Documents(ctx)
	defer iter.Stop()
	packages := []ClientPackage{}
	for {
		snapshot, err := iter.Next()
		if errors.Is(err, iterator.Done) {
			return packages, nil
		}
		if err != nil {
			return nil, err
		}
		packages = append(packages, clientPackageFromData(snapshot.Ref.ID, snapshot.Data()))
	}
}

func (s *FirestoreStore) CreateAppointment(ctx context.Context, organizationID, assignedTrainerUID string, input AppointmentInput) (Appointment, error) {
	ref := s.client.Collection("organizations").Doc(organizationID).Collection("appointments").NewDoc()
	appointment := Appointment{ID: ref.ID, ClientID: input.ClientID, StartAt: input.StartAt, DurationMinutes: input.DurationMinutes, Notes: input.Notes, Status: "scheduled", AssignedTrainerUID: assignedTrainerUID}
	data := map[string]any{
		"clientId": appointment.ClientID, "assignedTrainerUid": appointment.AssignedTrainerUID,
		"startAt": appointment.StartAt, "durationMinutes": appointment.DurationMinutes, "notes": appointment.Notes,
		"status": appointment.Status, "createdAt": firestore.ServerTimestamp, "updatedAt": firestore.ServerTimestamp,
	}
	if _, err := ref.Create(ctx, data); err != nil {
		return Appointment{}, err
	}
	return appointment, nil
}

func (s *FirestoreStore) ListAppointments(ctx context.Context, organizationID string, from, to time.Time) ([]Appointment, error) {
	iter := s.client.Collection("organizations").Doc(organizationID).Collection("appointments").Where("startAt", ">=", from).Where("startAt", "<", to).OrderBy("startAt", firestore.Asc).Limit(200).Documents(ctx)
	defer iter.Stop()
	appointments := []Appointment{}
	for {
		snapshot, err := iter.Next()
		if errors.Is(err, iterator.Done) {
			return appointments, nil
		}
		if err != nil {
			return nil, err
		}
		appointments = append(appointments, appointmentFromData(snapshot.Ref.ID, snapshot.Data()))
	}
}

func clientData(input ClientInput) map[string]any {
	return map[string]any{"firstName": input.FirstName, "lastName": input.LastName, "email": input.Email, "phone": input.Phone, "goals": input.Goals, "notes": input.Notes, "preferredStartTime": input.PreferredStartTime, "preferredEndTime": input.PreferredEndTime, "status": input.Status}
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
	preferredStartTime, _ := data["preferredStartTime"].(string)
	preferredEndTime, _ := data["preferredEndTime"].(string)
	status, _ := data["status"].(string)
	assignedTrainerUID, _ := data["assignedTrainerUid"].(string)
	return Client{ID: id, FirstName: firstName, LastName: lastName, Email: email, Phone: phone, Goals: goals, Notes: notes, PreferredStartTime: preferredStartTime, PreferredEndTime: preferredEndTime, Status: status, AssignedTrainerUID: assignedTrainerUID}
}

func packageOptionFromData(id string, data map[string]any) PackageOption {
	name, _ := data["name"].(string)
	includedSessions, _ := data["includedSessions"].(int64)
	status, _ := data["status"].(string)
	return PackageOption{ID: id, Name: name, IncludedSessions: int(includedSessions), Status: status}
}

func clientPackageFromData(id string, data map[string]any) ClientPackage {
	packageOptionID, _ := data["packageOptionId"].(string)
	packageName, _ := data["packageName"].(string)
	includedSessions, _ := data["includedSessions"].(int64)
	remainingSessions, _ := data["remainingSessions"].(int64)
	status, _ := data["status"].(string)
	return ClientPackage{ID: id, PackageOptionID: packageOptionID, PackageName: packageName, IncludedSessions: int(includedSessions), RemainingSessions: int(remainingSessions), Status: status}
}

func appointmentFromData(id string, data map[string]any) Appointment {
	clientID, _ := data["clientId"].(string)
	assignedTrainerUID, _ := data["assignedTrainerUid"].(string)
	startAt, _ := data["startAt"].(time.Time)
	durationMinutes, _ := data["durationMinutes"].(int64)
	notes, _ := data["notes"].(string)
	status, _ := data["status"].(string)
	return Appointment{ID: id, ClientID: clientID, StartAt: startAt, DurationMinutes: int(durationMinutes), Notes: notes, Status: status, AssignedTrainerUID: assignedTrainerUID}
}
