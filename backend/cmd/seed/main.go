// Command seed writes isolated fictional organizations to the Firestore
// Emulator. It refuses production use so examples can never contaminate live
// trainer records.
package main

import (
	"context"
	"fmt"
	"os"

	"cloud.google.com/go/firestore"
)

func main() {
	if os.Getenv("FIRESTORE_EMULATOR_HOST") == "" {
		fmt.Fprintln(os.Stderr, "FIRESTORE_EMULATOR_HOST is required; seed only supports the emulator")
		os.Exit(1)
	}
	projectID := os.Getenv("FIREBASE_PROJECT_ID")
	if projectID == "" {
		projectID = "shwayfit-f7f0b"
	}
	client, err := firestore.NewClient(context.Background(), projectID)
	if err != nil {
		panic(err)
	}
	defer client.Close()
	for _, organization := range []struct{ id, name, trainerUID string }{
		{"seed-northstar", "Northstar Training", "trainer-northstar"},
		{"seed-harbour", "Harbour Movement", "trainer-harbour"},
	} {
		orgRef := client.Collection("organizations").Doc(organization.id)
		membership := map[string]any{"organizationId": organization.id, "role": "owner", "active": true, "email": organization.trainerUID + "@example.test", "createdAt": firestore.ServerTimestamp}
		if _, err := orgRef.Set(context.Background(), map[string]any{"displayName": organization.name, "createdAt": firestore.ServerTimestamp}); err != nil {
			panic(err)
		}
		if _, err := client.Collection("trainerMemberships").Doc(organization.trainerUID).Set(context.Background(), membership); err != nil {
			panic(err)
		}
		if _, err := orgRef.Collection("members").Doc(organization.trainerUID).Set(context.Background(), membership); err != nil {
			panic(err)
		}
		if _, err := orgRef.Collection("clients").Doc("seed-client").Set(context.Background(), map[string]any{"firstName": "Avery", "lastName": organization.name[:1] + " Sample", "email": "", "phone": "", "goals": "Demo record", "notes": "Fictional emulator-only data", "status": "active", "assignedTrainerUid": organization.trainerUID, "createdAt": firestore.ServerTimestamp, "updatedAt": firestore.ServerTimestamp}); err != nil {
			panic(err)
		}
	}
	fmt.Println("Seeded Northstar Training and Harbour Movement in the Firestore Emulator.")
}
