package service

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"sync"

	"github.com/gitshubham45/videoStreamingSite/server/logger"
	"github.com/gitshubham45/videoStreamingSite/server/models"
	"go.uber.org/zap"
)

var Resoulutions = []string{
	"1080p",
	"720p",
	"480p",
	"360p",
	"240p",
	"144p",
}

func TranscodeService(inputFilePath, outputDir, fileNameWithoutExt string) (successfulResults, failedResolutions []models.TranscodeResult) {
	var (
		sem = make(chan struct{}, 2) // semaphore to limit concurrent transcoding
		wg  sync.WaitGroup
		mu  sync.Mutex
	)

	logger.Log.Info("[TRANSCODE] Starting transcoding", zap.String("file", fileNameWithoutExt))

	for _, resolution := range Resoulutions {
		sem <- struct{}{}
		wg.Add(1)

		go func(resolution string) {
			defer func() {
				<-sem
				wg.Done()
			}()

			// Each resolution gets its own subdirectory: <outputDir>/<resolution>/
			resolutionDir := filepath.Join(outputDir, resolution)
			playlistPath := filepath.Join(resolutionDir, "index.m3u8")

			cmd := exec.Command("scripts/transcode.sh", inputFilePath, resolution, resolutionDir)
			logger.Log.Info("[TRANSCODE] Running",
				zap.String("resolution", resolution),
				zap.String("output_dir", resolutionDir),
			)
			cmdOutput, err := cmd.CombinedOutput()
			if err != nil {
				logger.Log.Error("[TRANSCODE] Failed",
					zap.String("resolution", resolution),
					zap.Error(err),
					zap.String("output", string(cmdOutput)),
				)
				mu.Lock()
				failedResolutions = append(failedResolutions, models.TranscodeResult{
					Resolution: resolution,
					Err:        fmt.Sprintf("%v: %s", err, string(cmdOutput)),
					Success:    false,
				})
				mu.Unlock()
			} else {
				logger.Log.Info("[TRANSCODE] Done",
					zap.String("resolution", resolution),
					zap.String("playlist", playlistPath),
				)
				mu.Lock()
				successfulResults = append(successfulResults, models.TranscodeResult{
					Resolution: resolution,
					OutputPath: playlistPath,
					Success:    true,
				})
				mu.Unlock()
			}
		}(resolution)
	}

	wg.Wait()
	return successfulResults, failedResolutions
}
