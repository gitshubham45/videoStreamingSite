package database

import (
	"database/sql"
	"fmt"
	"os"

	"github.com/gitshubham45/videoStreamingSite/server/logger"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"go.uber.org/zap"
)

var DB *sql.DB

func InitDB() {
	err := godotenv.Load()
	if err != nil {
		logger.Log.Warn("[DB] No .env file found, using system environment variables")
	}

	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = fmt.Sprintf(
			"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
			getEnv("DB_HOST", "localhost"),
			getEnv("DB_PORT", "5432"),
			getEnv("DB_USER"),
			getEnv("DB_PASSWORD"),
			getEnv("DB_NAME"),
			getEnv("DB_SSLMODE", "disable"),
		)
	}

	DB, err = sql.Open("postgres", connStr)
	if err != nil {
		logger.Log.Fatal("[DB] Failed to open database", zap.Error(err))
	}

	err = DB.Ping()
	if err != nil {
		logger.Log.Fatal("[DB] Failed to ping database", zap.Error(err))
	}

	logger.Log.Info("[DB] Connected to PostgreSQL")

	if err := ensureSchema(); err != nil {
		logger.Log.Fatal("[DB] Failed to ensure schema", zap.Error(err))
	}
}

func ensureSchema() error {
	_, err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS videos (
			id VARCHAR(255) PRIMARY KEY,
			original_filename TEXT NOT NULL,
			stored_filename TEXT NOT NULL UNIQUE,
			url TEXT NOT NULL,
			uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			file_size BIGINT,
			mime_type TEXT,
			status VARCHAR(20) NOT NULL DEFAULT 'pending'
		);

		CREATE INDEX IF NOT EXISTS idx_videos_uploaded_at ON videos (uploaded_at DESC);
	`)
	return err
}

func getEnv(key string, fallback ...string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	if len(fallback) > 0 {
		return fallback[0]
	}
	logger.Log.Fatal("[DB] Required environment variable not set", zap.String("key", key))
	return ""
}
