# Build the API as a small, statically linked Linux executable.
FROM golang:1.27.1-alpine AS build

WORKDIR /src
COPY go.mod ./
RUN go mod download

COPY . ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/shwayfit-api ./cmd/api

# Cloud Run supplies PORT. HOST makes the same server reachable inside the container.
FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=build /out/shwayfit-api /shwayfit-api
ENV PORT=8080
ENV HOST=0.0.0.0
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/shwayfit-api"]
