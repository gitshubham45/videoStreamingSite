package main

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/gitshubham45/videoStreamingSite/server/database"
	"github.com/gitshubham45/videoStreamingSite/server/logger"
	"github.com/gitshubham45/videoStreamingSite/server/queue"
	service "github.com/gitshubham45/videoStreamingSite/server/services"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

func main() {
	logger.Init()
	defer logger.Log.Sync()

	database.InitDB()
	queue.Init()

	logger.Log.Info("[TRANSCODER] Worker started, waiting for jobs")

	ctx := context.Background()
	for {
		// BLPOP blocks until a job arrives; 5s timeout lets us loop cleanly on shutdown signals
		result, err := queue.Client.BLPop(ctx, 5*time.Second, queue.QueueKey).Result()
		if err != nil {
			if errors.Is(err, redis.Nil) {
				// timeout — no job yet, keep waiting
				continue
			}
			logger.Log.Error("[TRANSCODER] Redis error", zap.Error(err))
			time.Sleep(2 * time.Second)
			continue
		}

		var job queue.TranscodeJob
		if err := json.Unmarshal([]byte(result[1]), &job); err != nil {
			logger.Log.Error("[TRANSCODER] Failed to unmarshal job", zap.Error(err))
			continue
		}

		logger.Log.Info("[TRANSCODER] Picked up job",
			zap.String("video_id", job.VideoID),
			zap.String("input", job.InputFilePath),
		)

		if err := database.UpdateVideoStatus(job.VideoID, "processing"); err != nil {
			logger.Log.Error("[TRANSCODER] Failed to update status to processing", zap.Error(err))
		}

		succeeded, failed := service.TranscodeService(job.InputFilePath, job.OutputDir, job.FilenameWithoutExt)

		finalStatus := "done"
		if len(failed) > 0 {
			finalStatus = "failed"
			for _, f := range failed {
				logger.Log.Error("[TRANSCODER] Resolution failed",
					zap.String("resolution", f.Resolution),
					zap.String("error", f.Err),
				)
			}
		}

		if err := database.UpdateVideoStatus(job.VideoID, finalStatus); err != nil {
			logger.Log.Error("[TRANSCODER] Failed to update final status", zap.Error(err))
		}

		logger.Log.Info("[TRANSCODER] Job complete",
			zap.String("video_id", job.VideoID),
			zap.String("status", finalStatus),
			zap.Int("succeeded", len(succeeded)),
			zap.Int("failed", len(failed)),
		)
	}
}
