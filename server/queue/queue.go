package queue

import (
	"context"
	"encoding/json"
	"os"

	"github.com/redis/go-redis/v9"
)

const QueueKey = "transcode_queue"

var Client *redis.Client

type TranscodeJob struct {
	VideoID            string `json:"video_id"`
	InputFilePath      string `json:"input_file_path"`
	OutputDir          string `json:"output_dir"`
	FilenameWithoutExt string `json:"filename_without_ext"`
}

func Init() {
	addr := os.Getenv("REDIS_ADDR")
	if addr == "" {
		addr = "localhost:6379"
	}
	Client = redis.NewClient(&redis.Options{Addr: addr})
}

func Publish(ctx context.Context, job TranscodeJob) error {
	data, err := json.Marshal(job)
	if err != nil {
		return err
	}
	return Client.RPush(ctx, QueueKey, data).Err()
}
