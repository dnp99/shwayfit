package main

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/dnp99/shwayfit/backend/internal/authn"
	"github.com/dnp99/shwayfit/backend/internal/httpapi"
)

func main() {
	if err := run(); err != nil {
		slog.Error("API stopped", "error", err)
		os.Exit(1)
	}
}

func run() error {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	n, err := strconv.Atoi(port)
	if err != nil || n < 1 || n > 65535 {
		return errors.New("PORT must be an integer from 1 to 65535")
	}
	// Bind locally by default. A future container can explicitly set HOST=0.0.0.0.
	host := os.Getenv("HOST")
	if host == "" {
		host = "127.0.0.1"
	}
	projectID := os.Getenv("FIREBASE_PROJECT_ID")
	if projectID == "" {
		projectID = "shwayfit-f7f0b"
	}
	verifier, err := authn.NewFirebaseVerifier(context.Background(), projectID)
	if err != nil {
		return err
	}
	server := &http.Server{
		Addr: net.JoinHostPort(host, port), Handler: httpapi.NewHandler(httpapi.Config{TokenVerifier: verifier}),
		ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second,
		WriteTimeout: 15 * time.Second, IdleTimeout: 60 * time.Second,
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	stopped := make(chan error, 1)
	go func() { stopped <- server.ListenAndServe() }()
	slog.Info("API starting", "address", server.Addr)
	select {
	case err := <-stopped:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			_ = server.Close()
			return err
		}
		return nil
	}
}
