FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install protoc
RUN apk add --no-cache protobuf protobuf-dev

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy proto files and generate
COPY ../proto /app/proto
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest && \
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest && \
    protoc --go_out=./pkg/proto --go-grpc_out=./pkg/proto \
    -I./proto ./proto/*.proto

# Copy source code
COPY . .

# Build
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server ./cmd/server

# Final stage
FROM alpine:3.19

WORKDIR /app

COPY --from=builder /app/server .

ENV GRPC_PORT=50052

EXPOSE 50052

CMD ["./server"]
