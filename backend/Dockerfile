# Build stage: compiles the API server, migration runner, and seeder as static binaries.
FROM golang:1.27-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/api . \
 && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/migrate ./cmd/migrate \
 && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/seed ./cmd/seed

# Runtime stage: minimal image running as an unprivileged user.
FROM alpine:3
RUN apk add --no-cache ca-certificates tzdata && adduser -D -u 10001 app
WORKDIR /app
COPY --from=build /out/ /app/bin/
COPY migrations ./migrations
COPY seed ./seed
RUN mkdir -p storage/uploads && chown -R app:app /app/storage
USER app
EXPOSE 8085
CMD ["/app/bin/api"]
