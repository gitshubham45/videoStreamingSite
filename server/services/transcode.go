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

func TranscodeService(inputFilePath, outputDir, fileNameWithoutExt string) (successfulResults, failedResults []models.TranscodeResult) {
	var (
		sem = make(chan struct{}, 2) // semaphore to limit concurrent transcoding
		wg  sync.WaitGroup
		mu  sync.Mutex
	)

	for _ , resolution := range Resoulutions {
		sem <- struct{}{}
		wg.Add(1)

		go func(resName string){
			defer func() {
				<-sem
				wg.Done()
			}()

			outputFile := filepath.Join(outputDir , fmt.Sprintf("%s_%s.mp4",fileNameWithoutExt , resName))

			smd := exec.Command("server/")
		}
	}
}
