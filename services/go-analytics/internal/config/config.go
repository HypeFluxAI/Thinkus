package config

import (
	"os"
	"strconv"
)

// Config holds application configuration
type Config struct {
	MongoDBURI string
	RedisURL   string
	GRPCPort   int
}

// Load loads configuration from environment variables
func Load() *Config {
	port, _ := strconv.Atoi(getEnv("GRPC_PORT", "50052"))

	return &Config{
		MongoDBURI: getEnv("MONGODB_URI", "mongodb://localhost:27017/thinkus"),
		RedisURL:   getEnv("REDIS_URL", "redis://localhost:6379"),
		GRPCPort:   port,
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
