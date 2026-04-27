package main

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/gitshubham45/videoStreamingSite/server/controllers"
	"github.com/gitshubham45/videoStreamingSite/server/database"
	"github.com/gitshubham45/videoStreamingSite/server/logger"
	"github.com/gitshubham45/videoStreamingSite/server/queue"
	wshandler "github.com/gitshubham45/videoStreamingSite/server/ws"
	"github.com/rs/cors"
	"go.uber.org/zap"
)

func main() {
	logger.Init()
	defer logger.Log.Sync()

	database.InitDB()
	queue.Init()
	go wshandler.GlobalHub.Run()

	os.MkdirAll("./uploads", os.ModePerm)
	os.MkdirAll("./videos", os.ModePerm)

	r := gin.Default()

	r.Static("/videos", "./videos")

	api := r.Group("/api")
	api.POST("/upload", controllers.UploadController)
	api.GET("/videos", controllers.ListVideosController)
	api.GET("/watch/:video_id", controllers.WatchController)
	api.DELETE("/videos/:video_id", controllers.DeleteController)
	api.GET("/live/status", wshandler.StatusHandler)

	r.GET("/ws/broadcast", wshandler.BroadcastHandler)
	r.GET("/ws/watch", wshandler.WatchHandler)

	handler := cors.New(cors.Options{
		AllowedOrigins: allowedOrigins(),
		AllowedMethods: []string{"GET", "POST", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	}).Handler(r)

	port := getEnv("PORT", "8000")
	logger.Log.Info("Server running", zap.String("addr", "http://localhost:"+port))
	http.ListenAndServe(":"+port, handler)
}

func allowedOrigins() []string {
	raw := getEnv("ALLOWED_ORIGINS", "http://localhost:3000")
	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		origin := strings.TrimSpace(part)
		if origin != "" {
			origins = append(origins, origin)
		}
	}
	return origins
}

func getEnv(key string, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
