package ws

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gitshubham45/videoStreamingSite/server/logger"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func BroadcastHandler(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		logger.Log.Error("[WS] Broadcast upgrade failed", zap.Error(err))
		return
	}

	client := GlobalHub.RegisterBroadcaster()
	logger.Log.Info("[WS] Broadcaster connected")

	done := make(chan struct{})
	go writeSignals(conn, client, done)

	defer func() {
		GlobalHub.UnregisterBroadcaster(client)
		conn.Close()
		<-done
		logger.Log.Info("[WS] Broadcaster disconnected")
	}()

	for {
		var message SignalMessage
		_, data, err := conn.ReadMessage()
		if err != nil {
			logger.Log.Error("[WS] Broadcast read error", zap.Error(err))
			return
		}
		if err := json.Unmarshal(data, &message); err != nil {
			logger.Log.Error("[WS] Broadcast payload decode failed", zap.Error(err), zap.Int("bytes", len(data)))
			continue
		}
		logSignal("received", "broadcaster", client.id, message, len(data))
		GlobalHub.FromBroadcaster(message)
	}
}

func WatchHandler(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		logger.Log.Error("[WS] Watch upgrade failed", zap.Error(err))
		return
	}

	client := GlobalHub.RegisterViewer()
	logger.Log.Info("[WS] Viewer connected", zap.String("viewerID", client.id), zap.String("remote", conn.RemoteAddr().String()))

	done := make(chan struct{})
	go writeSignals(conn, client, done)

	defer func() {
		GlobalHub.UnregisterViewer(client)
		conn.Close()
		<-done
		logger.Log.Info("[WS] Viewer disconnected", zap.String("viewerID", client.id))
	}()

	for {
		var message SignalMessage
		_, data, err := conn.ReadMessage()
		if err != nil {
			return
		}
		if err := json.Unmarshal(data, &message); err != nil {
			logger.Log.Error("[WS] Watch payload decode failed", zap.Error(err), zap.String("viewerID", client.id), zap.Int("bytes", len(data)))
			continue
		}
		logSignal("received", "viewer", client.id, message, len(data))
		GlobalHub.FromViewer(client, message)
	}
}

func writeSignals(conn *websocket.Conn, client *Client, done chan<- struct{}) {
	defer close(done)

	for message := range client.send {
		payload, err := json.Marshal(message)
		if err != nil {
			logger.Log.Error("[WS] Signal encode failed", zap.Error(err), zap.String("clientID", client.id))
			continue
		}
		logSignal("sent", "server", client.id, message, len(payload))
		if err := conn.WriteMessage(websocket.TextMessage, payload); err != nil {
			return
		}
	}
}

func StatusHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"live": GlobalHub.GetLive()})
}

func logSignal(direction string, role string, clientID string, message SignalMessage, bytes int) {
	logger.Log.Info("[WS] Signal chunk",
		zap.String("direction", direction),
		zap.String("role", role),
		zap.String("clientID", clientID),
		zap.String("type", message.Type),
		zap.String("viewerID", message.ViewerID),
		zap.Bool("hasSDP", len(message.SDP) > 0),
		zap.Int("sdpBytes", len(message.SDP)),
		zap.Bool("hasCandidate", len(message.Candidate) > 0),
		zap.Int("candidateBytes", len(message.Candidate)),
		zap.Int("bytes", bytes),
	)
}
