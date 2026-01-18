package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds the application configuration
type Config struct {
	// Server
	Port     int
	GRPCPort int
	Env      string

	// Database
	MongoDBURI string
	MongoDBDB  string

	// Cache
	RedisURL string

	// AI Service URLs
	AIEngineURL string
}

// Load loads configuration from environment variables
func Load() *Config {
	// Load .env file if exists
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	return &Config{
		Port:        getEnvAsInt("PORT", 8100),
		GRPCPort:    getEnvAsInt("GRPC_PORT", 50060),
		Env:         getEnv("ENV", "development"),
		MongoDBURI:  getEnv("MONGODB_URI", "mongodb://localhost:27017"),
		MongoDBDB:   getEnv("MONGODB_DB", "thinkus"),
		RedisURL:    getEnv("REDIS_URL", "redis://localhost:6379"),
		AIEngineURL: getEnv("AI_ENGINE_URL", "localhost:50054"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}
