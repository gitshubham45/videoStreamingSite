package controllers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gitshubham45/videoStreamingSite/server/database"
	"github.com/google/uuid"
)

func UploadController(c *gin.Context) {
	err := c.Request.ParseMultipartForm(1000 << 20)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse Form"})
	}

	file, header, err := c.Request.FormFile("video")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No Video file uploaded"})
	}
	defer file.Close()

	ext := filepath.Ext(header.Filename)
	allowedExts := map[string]bool{
		".mp4":  true,
		".mov":  true,
		".avi":  true,
		".mkv":  true,
		".webm": true,
	}

	err = database.InsertVideo(database.Video{
		ID:               uuid.New().String(),
		OriginalFilename: header.Filename,
		StoredFilename:   header.Filename,
		URL:              "url",
		UploadedAt:       time.Now(),
		FileSize:         5,
		MimeType:         "video",
	})

	if err != nil {
		fmt.Println("Error while daving video metadata in db")
	}

	if !allowedExts[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type. Only video file allowed"})
		return
	}

	os.Mkdir("./uploads", os.ModePerm)

	filename := fmt.Sprintf("./uploads/%s", header.Filename)

	dst, err := os.Create(filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create file"})
		return
	}
	defer dst.Close()

	// copy uploaded file to destination
	_, err = io.Copy(dst, file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Video uploaded successfully",
		"filename": header.Filename,
		"path":     filename,
	})

}

func WatchController(c *gin.Context) {

}
