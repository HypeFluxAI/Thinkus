# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git

# Copy go mod file from go-orchestrator directory
COPY go-orchestrator/go.mod ./
RUN go mod download && go mod verify

# Copy source code from go-orchestrator directory
COPY go-orchestrator/ ./

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o orchestrator ./cmd/server

# Runtime stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the binary from builder
COPY --from=builder /app/orchestrator .

# Expose ports
EXPOSE 8100 50060

# Run the application
CMD ["./orchestrator"]
