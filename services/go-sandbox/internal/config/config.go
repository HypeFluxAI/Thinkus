package config

import (
	"os"
	"strconv"
)

// Config holds application configuration
type Config struct {
	MongoDBURI   string
	RedisURL     string
	GRPCPort     int
	DataDir      string
	MaxSandboxes int
	SandboxTTL   int // seconds
}

// Load loads configuration from environment variables
func Load() *Config {
	port, _ := strconv.Atoi(getEnv("GRPC_PORT", "50053"))
	maxSandboxes, _ := strconv.Atoi(getEnv("MAX_SANDBOXES", "100"))
	sandboxTTL, _ := strconv.Atoi(getEnv("SANDBOX_TTL", "3600"))

	return &Config{
		MongoDBURI:   getEnv("MONGODB_URI", "mongodb://localhost:27017/thinkus"),
		RedisURL:     getEnv("REDIS_URL", "redis://localhost:6379"),
		GRPCPort:     port,
		DataDir:      getEnv("DATA_DIR", "/data/sandboxes"),
		MaxSandboxes: maxSandboxes,
		SandboxTTL:   sandboxTTL,
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
