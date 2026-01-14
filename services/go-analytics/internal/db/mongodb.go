package db

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	mongoClient *mongo.Client
	mongoDB     *mongo.Database
)

// InitMongoDB initializes MongoDB connection
func InitMongoDB(ctx context.Context, uri string) error {
	clientOptions := options.Client().ApplyURI(uri)
	clientOptions.SetMaxPoolSize(50)
	clientOptions.SetMinPoolSize(10)
	clientOptions.SetConnectTimeout(10 * time.Second)

	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return err
	}

	// Ping to verify connection
	if err := client.Ping(ctx, nil); err != nil {
		return err
	}

	mongoClient = client
	mongoDB = client.Database("thinkus")

	return nil
}

// CloseMongoDB closes MongoDB connection
func CloseMongoDB(ctx context.Context) error {
	if mongoClient != nil {
		return mongoClient.Disconnect(ctx)
	}
	return nil
}

// GetCollection returns a MongoDB collection
func GetCollection(name string) *mongo.Collection {
	return mongoDB.Collection(name)
}

// GetDatabase returns the MongoDB database
func GetDatabase() *mongo.Database {
	return mongoDB
}
