FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install protoc
RUN apk add --no-cache protobuf protobuf-dev

# Copy go mod files
COPY go-analytics/go.mod go-analytics/go.sum ./
RUN go mod download

# Install protoc plugins
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest && \
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Copy proto files and generate
COPY proto /app/proto
RUN mkdir -p ./pkg/proto/analytics ./pkg/proto/common && \
    protoc --go_out=./pkg/proto/common --go-grpc_out=./pkg/proto/common \
    --go_opt=paths=source_relative \
    --go-grpc_opt=paths=source_relative \
    -I./proto ./proto/common.proto && \
    protoc --go_out=./pkg/proto/analytics --go-grpc_out=./pkg/proto/analytics \
    --go_opt=paths=source_relative \
    --go-grpc_opt=paths=source_relative \
    --go_opt=Mcommon.proto=github.com/thinkus/go-analytics/pkg/proto/common \
    --go-grpc_opt=Mcommon.proto=github.com/thinkus/go-analytics/pkg/proto/common \
    -I./proto ./proto/analytics.proto

# Copy source code
COPY go-analytics/ .

# Build
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server ./cmd/server

# Final stage
FROM alpine:3.19

WORKDIR /app

COPY --from=builder /app/server .

ENV GRPC_PORT=50052

EXPOSE 50052

CMD ["./server"]
