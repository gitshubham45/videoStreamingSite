package main

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gitshubham45/videoStreamingSite/server/controllers"
	"github.com/rs/cors"
)

func main() {
	r := gin.Default()

	api := r.Group("/api")

	api.POST("/upload", controllers.UploadController)

	handler := cors.New(cors.Options{
		AllowedOrigins: []string{"http://localhost:3000"},
		AllowedMethods: []string{"GET", "POST", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	}).Handler(r)

	fmt.Println("Server running on http://localhost:8000")
	http.ListenAndServe(":8000", handler)
}
