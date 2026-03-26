package main

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/gitshubham45/videoStreamingSite/server/controllers"
	"github.com/gitshubham45/videoStreamingSite/server/database"
	"github.com/gitshubham45/videoStreamingSite/server/logger"
	"github.com/gitshubham45/videoStreamingSite/server/queue"
	"github.com/rs/cors"
	"go.uber.org/zap"
)

func main() {
	logger.Init()
	defer logger.Log.Sync()

	database.InitDB()
	queue.Init()

	os.MkdirAll("./uploads", os.ModePerm)
	os.MkdirAll("./videos", os.ModePerm)

	r := gin.Default()

	r.Static("/videos", "./videos")

	api := r.Group("/api")
	api.POST("/upload", controllers.UploadController)
	api.GET("/videos", controllers.ListVideosController)
	api.GET("/watch/:video_id", controllers.WatchController)

	handler := cors.New(cors.Options{
		AllowedOrigins: []string{"http://localhost:3000"},
		AllowedMethods: []string{"GET", "POST", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	}).Handler(r)

	logger.Log.Info("Server running", zap.String("addr", "http://localhost:8000"))
	http.ListenAndServe(":8000", handler)
}
