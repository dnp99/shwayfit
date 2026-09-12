// Package authn verifies Firebase identities at the API boundary.
package authn

import (
	"context"
	"errors"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
)

// Identity contains only claims that handlers need before organization
// authorization. Organization roles always come from ShwayFit data, not token
// custom claims, so membership changes take effect immediately.
type Identity struct {
	UID           string
	Email         string
	EmailVerified bool
}

// Verifier lets HTTP tests supply a deterministic verifier without making
// network calls to Firebase.
type Verifier interface {
	VerifyIDToken(ctx context.Context, rawToken string) (Identity, error)
}

// FirebaseVerifier checks signed Firebase ID tokens using the Admin SDK.
type FirebaseVerifier struct {
	client *auth.Client
}

// NewFirebaseVerifier uses Application Default Credentials. Cloud Run supplies
// them from its runtime service account; local development can use the Auth
// emulator or local ADC without storing a service-account key in this project.
func NewFirebaseVerifier(ctx context.Context, projectID string) (*FirebaseVerifier, error) {
	if projectID == "" {
		return nil, errors.New("Firebase project ID is required")
	}
	app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: projectID})
	if err != nil {
		return nil, err
	}
	client, err := app.Auth(ctx)
	if err != nil {
		return nil, err
	}
	return &FirebaseVerifier{client: client}, nil
}

func (v *FirebaseVerifier) VerifyIDToken(ctx context.Context, rawToken string) (Identity, error) {
	token, err := v.client.VerifyIDToken(ctx, rawToken)
	if err != nil {
		return Identity{}, err
	}
	email, _ := token.Claims["email"].(string)
	emailVerified, _ := token.Claims["email_verified"].(bool)
	return Identity{UID: token.UID, Email: email, EmailVerified: emailVerified}, nil
}
