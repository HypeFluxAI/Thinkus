# Go Canary Release Service
FROM golang:1.21-alpine AS builder

WORKDIR /app
RUN apk add --no-cache git
COPY go.mod ./
COPY . .
RUN go mod tidy && go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/main.go

FROM alpine:3.18
WORKDIR /app
RUN apk --no-cache add ca-certificates curl
COPY --from=builder /app/main .
EXPOSE 8007
CMD ["./main"]
