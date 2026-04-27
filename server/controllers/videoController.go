package controllers

import (
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gitshubham45/videoStreamingSite/server/database"
	"github.com/gitshubham45/videoStreamingSite/server/logger"
	"github.com/gitshubham45/videoStreamingSite/server/queue"
	service "github.com/gitshubham45/videoStreamingSite/server/services"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

func UploadController(c *gin.Context) {
	file, err := c.FormFile("video")
	if err != nil {
		logger.Log.Error("[UPLOAD] Failed to parse form", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form"})
		return
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
		".MOV":  true,
	}

	if !allowedExts[ext] {
		logger.Log.Warn("[UPLOAD] Rejected unsupported file type",
			zap.String("filename", fileName),
			zap.String("ext", ext),
		)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type. Only video files are allowed"})
		return
	}

	err = c.SaveUploadedFile(file, inputFilePath)
	if err != nil {
		logger.Log.Error("[UPLOAD] Failed to save file",
			zap.String("filename", fileName),
			zap.Error(err),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	fileNameWithoutExt := strings.TrimSuffix(fileName, filepath.Ext(fileName))
	outputDir := filepath.Join("./videos", fmt.Sprintf("%s_output", fileNameWithoutExt))
	err = os.MkdirAll(outputDir, os.ModePerm)
	if err != nil {
		logger.Log.Error("[UPLOAD] Failed to create output directory",
			zap.String("dir", outputDir),
			zap.Error(err),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to create folder %s: %s", outputDir, err.Error())})
		return
	}

	// Store relative path (without leading "./") so it matches the static file URL
	relativeOutputDir := fmt.Sprintf("videos/%s_output", fileNameWithoutExt)
	videoID := uuid.New().String()
	err = database.InsertVideo(database.Video{
		ID:               videoID,
		OriginalFilename: fileName,
		StoredFilename:   fileName,
		URL:              relativeOutputDir,
		UploadedAt:       time.Now(),
		FileSize:         file.Size,
		MimeType:         file.Header.Get("Content-Type"),
		Status:           "pending",
	})
	if err != nil {
		logger.Log.Error("[UPLOAD] Failed to insert video metadata",
			zap.String("filename", fileName),
			zap.Error(err),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error saving video file metadata in DB"})
		return
	}

	job := queue.TranscodeJob{
		VideoID:            videoID,
		InputFilePath:      inputFilePath,
		OutputDir:          outputDir,
		FilenameWithoutExt: fileNameWithoutExt,
	}
	if err := queue.Publish(c.Request.Context(), job); err != nil {
		logger.Log.Error("[UPLOAD] Failed to publish transcode job", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to queue transcoding job"})
		return
	}

	logger.Log.Info("[UPLOAD] File received, job queued", zap.String("filename", fileName), zap.String("video_id", videoID))

	c.JSON(http.StatusOK, gin.H{
		"message":  "Video uploaded successfully, transcoding in progress",
		"video_id": videoID,
		"filename": fileName,
	})
}

func ListVideosController(c *gin.Context) {
	videos, err := database.GetAllVideos()
	if err != nil {
		logger.Log.Error("[LIST] Failed to fetch videos", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch videos"})
		return
	}
	if videos == nil {
		videos = []database.Video{}
	}
	c.JSON(http.StatusOK, gin.H{"videos": videos})
}

func DeleteController(c *gin.Context) {
	videoID := c.Param("video_id")

	video, err := database.GetVideoByID(videoID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Video not found"})
		return
	}
	if err != nil {
		logger.Log.Error("[DELETE] Failed to fetch video", zap.String("video_id", videoID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch video"})
		return
	}

	// Delete transcoded files
	outputDir := "./" + video.URL
	if err := os.RemoveAll(outputDir); err != nil {
		logger.Log.Error("[DELETE] Failed to remove output dir", zap.String("dir", outputDir), zap.Error(err))
	}

	// Delete original upload
	originalPath := filepath.Join("./uploads", video.StoredFilename)
	if err := os.Remove(originalPath); err != nil && !os.IsNotExist(err) {
		logger.Log.Error("[DELETE] Failed to remove original file", zap.String("path", originalPath), zap.Error(err))
	}

	if err := database.DeleteVideo(videoID); err != nil {
		logger.Log.Error("[DELETE] Failed to delete from DB", zap.String("video_id", videoID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete video"})
		return
	}

	logger.Log.Info("[DELETE] Video deleted", zap.String("video_id", videoID))
	c.JSON(http.StatusOK, gin.H{"message": "Video deleted"})
}

func WatchController(c *gin.Context) {
	videoId := c.Param("video_id")
	logger.Log.Info("[WATCH] Request received", zap.String("video_id", videoId))

	video, err := database.GetVideoByID(videoId)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Video not found"})
		return
	}
	if err != nil {
		logger.Log.Error("[WATCH] Failed to fetch video", zap.String("video_id", videoId), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch video"})
		return
	}

	// Build HLS playlist URLs — one per resolution that has been transcoded
	resolutions := map[string]string{}
	publicURL := strings.TrimRight(getEnv("PUBLIC_URL", "http://localhost:8000"), "/")
	for _, r := range service.Resoulutions {
		playlistPath := fmt.Sprintf("%s/%s/index.m3u8", video.URL, r)
		if _, statErr := os.Stat("./" + playlistPath); statErr == nil {
			resolutions[r] = publicURL + "/" + playlistPath
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"video":       video,
		"resolutions": resolutions,
	})
}

func getEnv(key string, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
