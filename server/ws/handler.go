package ws

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gitshubham45/videoStreamingSite/server/logger"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// BroadcastHandler accepts the single webcam source.
// The first binary message is treated as the WebM init segment and cached.
func BroadcastHandler(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		logger.Log.Error("[WS] Broadcast upgrade failed", zap.Error(err))
		return
	}
	defer conn.Close()

	logger.Log.Info("[WS] Broadcaster connected")

	GlobalHub.mu.Lock()
	GlobalHub.isLive = true
	GlobalHub.initSegment = nil
	GlobalHub.mu.Unlock()

	chunkCount := 0
	first := true
	for {
		_, data, err := conn.ReadMessage()
		if err != nil {
			logger.Log.Error("[WS] Broadcast read error", zap.Error(err))
			break
		}
		chunkCount++
		if first {
			GlobalHub.mu.Lock()
			GlobalHub.initSegment = data
			GlobalHub.mu.Unlock()
			first = false
			logger.Log.Info("[WS] Init segment cached", zap.Int("bytes", len(data)))
		} else {
			logger.Log.Info("[WS] Chunk received from broadcaster", zap.Int("chunk", chunkCount), zap.Int("bytes", len(data)))
		}
		GlobalHub.broadcast <- data
	}

	GlobalHub.mu.Lock()
	GlobalHub.isLive = false
	GlobalHub.initSegment = nil
	GlobalHub.mu.Unlock()

	logger.Log.Info("[WS] Broadcaster disconnected")
}

// WatchHandler streams chunks to a viewer.
func WatchHandler(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		logger.Log.Error("[WS] Watch upgrade failed", zap.Error(err))
		return
	}

	viewer := &Viewer{send: make(chan []byte, 64)}
	GlobalHub.register <- viewer
	logger.Log.Info("[WS] Viewer connected", zap.String("remote", conn.RemoteAddr().String()))

	defer func() {
		GlobalHub.unregister <- viewer
		conn.Close()
		logger.Log.Info("[WS] Viewer disconnected", zap.String("remote", conn.RemoteAddr().String()))
	}()

	sentCount := 0
	for data := range viewer.send {
		if err := conn.WriteMessage(websocket.BinaryMessage, data); err != nil {
			logger.Log.Error("[WS] Viewer write error", zap.Error(err))
			break
		}
		sentCount++
		logger.Log.Info("[WS] Chunk sent to viewer", zap.Int("chunk", sentCount), zap.Int("bytes", len(data)))
	}
}

// StatusHandler returns whether a broadcast is currently live.
func StatusHandler(c *gin.Context) {
	GlobalHub.mu.RLock()
	live := GlobalHub.isLive
	GlobalHub.mu.RUnlock()
	c.JSON(http.StatusOK, gin.H{"live": live})
}
