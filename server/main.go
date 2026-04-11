package main

import (
	"net/http"
	"os"

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
		AllowedOrigins: []string{"http://localhost:3000"},
		AllowedMethods: []string{"GET", "POST", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	}).Handler(r)

	logger.Log.Info("Server running", zap.String("addr", "http://localhost:8000"))
	http.ListenAndServe(":8000", handler)
}
