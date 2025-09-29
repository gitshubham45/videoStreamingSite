package controllers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gitshubham45/videoStreamingSite/server/database"
	service "github.com/gitshubham45/videoStreamingSite/server/services"
	"github.com/google/uuid"

)

func UploadController(c *gin.Context) {
	file, err := c.FormFile("video")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse Form"})
	}

	fileName := file.Filename
	inputFilePath := filepath.Join("./uploads", fileName)

	ext := filepath.Ext(fileName)
	allowedExts := map[string]bool{
		".mp4":  true,
		".mov":  true,
		".avi":  true,
		".mkv":  true,
		".webm": true,
	}

	if !allowedExts[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type. Only video file allowed"})
		return
	}

	err = c.SaveUploadedFile(file, inputFilePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	err = database.InsertVideo(database.Video{
		ID:               uuid.New().String(),
		OriginalFilename: fileName,
		StoredFilename:   fileName,
		URL:              "url",
		UploadedAt:       time.Now(),
		FileSize:         5,
		MimeType:         "video",
	})

	if err != nil {
		fmt.Println("Error : ", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error saving video file metadata in DB"})
		return
	}

	fileNameWithoutExt := strings.TrimSuffix(fileName, filepath.Ext(fileName))
	outputDir := filepath.Join("./videos", fmt.Sprintf("%s_output", fileNameWithoutExt))
	err = os.MkdirAll(outputDir, os.ModePerm)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to create folder %s [error: %s]", outputDir, err.Error())})
		return
	}

	go func() {
		successedResolution, failedResoultion := service.TranscodeService(inputFilePath, outputDir, fileNameWithoutExt)
		fmt.Printf("Transcoding completed for %s.\n", fileNameWithoutExt)
		fmt.Println("Success: ", successedResolution)
		fmt.Println("Failed: ", failedResoultion)
	}()

	c.JSON(http.StatusOK, gin.H{
		"message":     "Video uploaded successfully , transcoding in progress",
		"resoultions": service.Resoulutions,
		"filename":    fileName,
	})
}

func WatchController(c *gin.Context) {

}
