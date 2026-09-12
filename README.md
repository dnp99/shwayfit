# ShwayFit

A mobile-first client-management app for independent fitness trainers.

## Current milestone

Public landing page and API foundation: separate React + TypeScript/Vite frontend and Go REST API. Firebase Hosting serves the landing page and proxies `/api/**` to Cloud Run. Firestore is provisioned with browser access denied. Authentication and business workflows are not implemented yet.

## Run locally

Prerequisites: Node.js 24 LTS, npm, and Go 1.26 or newer. The lockfile is committed for reproducible frontend installs. The current local machine also passed checks using Node 20.20.1; use Node 24 for new setups.

If using nvm, run `nvm install` then `nvm use` from the repository root.

Terminal 1:

```sh
cd backend
go run ./cmd/api
```

Terminal 2:

```sh
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173 to view the landing page. The API remains available locally at `/api/v1/health` through Vite's proxy.

```sh
curl --fail http://127.0.0.1:8080/api/v1/health
```

Expected: `{"status":"ok","service":"shwayfit-api"}`.

Go was absent on the initial development machine. A checksum-verified official distribution was installed at `~/.local/share/shwayfit-tools/go`. To use that installation in your shell:

```sh
export PATH="$HOME/.local/share/shwayfit-tools/go/bin:$PATH"
```

### Configuration

The API defaults to `HOST=127.0.0.1` and `PORT=8080`; it reads environment variables directly. It does not load `.env` files. Example: `PORT=8081 go run ./cmd/api`.

Vite proxies `/api` to the Go server, so local requests use one browser origin. To change the backend port, copy `frontend/.env.example` to `frontend/.env.local` and update `API_PROXY_TARGET`. Restart Vite after changes. Never put secrets in `VITE_*` variables: those are public browser configuration.

Vite's proxy is development-only; `npm run preview` serves the built UI but does not provide an API proxy. Firebase Hosting proxies `/api/**` to the deployed Cloud Run API. A green health check only verifies the HTTP process, not database readiness.

## Checks and builds

```sh
cd backend
go test -race ./...
go vet ./...
go build -o bin/shwayfit-api ./cmd/api
```

```sh
cd frontend
npm run lint
npm run build
```

Outputs are independent: `frontend/dist/` and `backend/bin/shwayfit-api`. See [Cloud Run deployment](docs/cloud-run.md) for the active cloud configuration.

## Project map

- `frontend/`: phone-first React application.
- `backend/cmd/api/`: process configuration and graceful shutdown.
- `backend/internal/httpapi/`: HTTP routes and boundary tests.
- `docs/`: original BRD and proposal, implementation plan, API contract.

See [implementation plan](docs/implementation-plan.md), [API documentation](docs/api.md), and [BRD](docs/fitness-trainer-brd.md).
