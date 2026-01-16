FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install protoc
RUN apk add --no-cache protobuf protobuf-dev

# Copy go mod files
COPY go-sandbox/go.mod go-sandbox/go.sum ./
RUN go mod download

# Install protoc plugins
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest && \
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Copy proto files and generate
COPY proto /app/proto
RUN mkdir -p ./pkg/proto && \
    protoc --go_out=./pkg/proto --go-grpc_out=./pkg/proto \
    -I./proto ./proto/*.proto

# Copy source code
COPY go-sandbox/ .

# Build
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server ./cmd/server

# Final stage
FROM alpine:3.19

WORKDIR /app

# Install Docker CLI for container management
RUN apk add --no-cache docker-cli

COPY --from=builder /app/server .

ENV GRPC_PORT=50053
ENV DATA_DIR=/data/sandboxes

EXPOSE 50053

CMD ["./server"]
