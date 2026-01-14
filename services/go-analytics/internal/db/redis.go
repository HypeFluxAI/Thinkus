package db

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

var redisClient *redis.Client

// InitRedis initializes Redis connection
func InitRedis(url string) error {
	opt, err := redis.ParseURL(url)
	if err != nil {
		return err
	}

	opt.PoolSize = 50
	opt.MinIdleConns = 10
	opt.ConnMaxIdleTime = 5 * time.Minute

	client := redis.NewClient(opt)

	// Ping to verify connection
	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		return err
	}

	redisClient = client
	return nil
}

// CloseRedis closes Redis connection
func CloseRedis() error {
	if redisClient != nil {
		return redisClient.Close()
	}
	return nil
}

// GetRedis returns the Redis client
func GetRedis() *redis.Client {
	return redisClient
}

// Set sets a key-value pair with expiration
func Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	return redisClient.Set(ctx, key, value, expiration).Err()
}

// Get gets a value by key
func Get(ctx context.Context, key string) (string, error) {
	return redisClient.Get(ctx, key).Result()
}

// Delete deletes a key
func Delete(ctx context.Context, key string) error {
	return redisClient.Del(ctx, key).Err()
}

// Publish publishes a message to a channel
func Publish(ctx context.Context, channel string, message interface{}) error {
	return redisClient.Publish(ctx, channel, message).Err()
}

// Subscribe subscribes to a channel
func Subscribe(ctx context.Context, channel string) *redis.PubSub {
	return redisClient.Subscribe(ctx, channel)
}
