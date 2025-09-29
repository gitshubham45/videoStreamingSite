package service

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"sync"

	"github.com/gitshubham45/videoStreamingSite/server/models"
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

	fmt.Println("Inside transcode func")

	for _, resolution := range Resoulutions {
		sem <- struct{}{}
		wg.Add(1)

		go func(resolution string) {
			defer func() {
				<-sem
				wg.Done()
			}()

			outputFile := filepath.Join(outputDir, fmt.Sprintf("%s_%s.mp4", fileNameWithoutExt, resolution))

			cmd := exec.Command("scripts/transcode.sh", inputFilePath, resolution, outputFile)
			fmt.Println("Running command:", cmd.String())
			cmdOutput, err := cmd.CombinedOutput()
			if err != nil {
				mu.Lock()
				failedResolutions = append(failedResolutions, models.TranscodeResult{
					Resolution: resolution,
					Err:        fmt.Sprintf("Error transcoding %s: %v, output: %s\n", resolution, err, string(cmdOutput)),
					Success:    false,
				})
				mu.Unlock()
			} else {
				fmt.Printf("Successfully transcoded to %s\n", resolution)
				mu.Lock()
				successfulResults = append(successfulResults, models.TranscodeResult{
					Resolution: resolution,
					OutputPath: outputFile,
					Success:    true,
				})
				mu.Unlock()
			}
		}(resolution)
	}

	wg.Wait()
	return successfulResults, failedResolutions
}
