package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq" // PostgreSQL driver (blank import for side-effect)
)

var DB *sql.DB

func InitDB() {
	// Load .env file (optional)
	err := godotenv.Load()
	if err != nil {
		log.Println("⚠️  No .env file found, using system environment variables")
	}

	// Build connection string
	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_PORT", "5432"),
		getEnv("DB_USER"),
		getEnv("DB_PASSWORD"),
		getEnv("DB_NAME"),
		getEnv("DB_SSLMODE", "disable"),
	)

	// Open DB connection
	DB, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("❌ Failed to open database: ", err)
	}

	// Test connection
	err = DB.Ping()
	if err != nil {
		log.Fatal("❌ Failed to ping database: ", err)
	}

	fmt.Println("✅ Successfully connected to PostgreSQL!")
}

func getEnv(key string, fallback ...string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	if len(fallback) > 0 {
		return fallback[0]
	}
	log.Fatal("❌ Required environment variable not set: ", key)
	return ""
}
