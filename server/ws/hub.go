package ws

import (
	"encoding/json"
	"sync"

	"github.com/gitshubham45/videoStreamingSite/server/logger"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// SignalMessage is the JSON envelope used for WebRTC signaling.
type SignalMessage struct {
	Type      string          `json:"type"`
	ViewerID  string          `json:"viewerId,omitempty"`
	SDP       json.RawMessage `json:"sdp,omitempty"`
	Candidate json.RawMessage `json:"candidate,omitempty"`
	Reason    string          `json:"reason,omitempty"`
}

// Client represents one websocket participant in the live room.
type Client struct {
	id   string
	send chan SignalMessage
}

type Hub struct {
	mu          sync.Mutex
	broadcaster *Client
	viewers     map[string]*Client
	isLive      bool
}

var GlobalHub = &Hub{
	viewers: make(map[string]*Client),
}

// Run is kept for compatibility with main.go. This hub is mutex-driven because
// websocket handlers need immediate registration and cleanup.
func (h *Hub) Run() {
	select {}
}

func (h *Hub) RegisterBroadcaster() *Client {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.broadcaster != nil {
		h.safeSend(h.broadcaster, SignalMessage{Type: "broadcast-ended", Reason: "replaced"})
		close(h.broadcaster.send)
	}

	client := &Client{
		id:   "broadcaster",
		send: make(chan SignalMessage, 64),
	}
	h.broadcaster = client
	h.isLive = true

	for viewerID := range h.viewers {
		h.safeSend(client, SignalMessage{Type: "viewer-joined", ViewerID: viewerID})
	}

	return client
}

func (h *Hub) UnregisterBroadcaster(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.broadcaster != client {
		return
	}

	h.broadcaster = nil
	h.isLive = false
	close(client.send)

	for _, viewer := range h.viewers {
		h.safeSend(viewer, SignalMessage{Type: "broadcast-ended"})
	}
}

func (h *Hub) RegisterViewer() *Client {
	h.mu.Lock()
	defer h.mu.Unlock()

	client := &Client{
		id:   uuid.NewString(),
		send: make(chan SignalMessage, 64),
	}
	h.viewers[client.id] = client
	h.safeSend(client, SignalMessage{Type: "viewer-id", ViewerID: client.id})

	if h.broadcaster != nil {
		h.safeSend(h.broadcaster, SignalMessage{Type: "viewer-joined", ViewerID: client.id})
	} else {
		h.safeSend(client, SignalMessage{Type: "no-broadcaster"})
	}

	return client
}

func (h *Hub) UnregisterViewer(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.viewers[client.id] != client {
		return
	}

	delete(h.viewers, client.id)
	close(client.send)

	if h.broadcaster != nil {
		h.safeSend(h.broadcaster, SignalMessage{Type: "viewer-left", ViewerID: client.id})
	}
}

func (h *Hub) FromBroadcaster(message SignalMessage) {
	h.mu.Lock()
	defer h.mu.Unlock()

	viewer := h.viewers[message.ViewerID]
	if viewer == nil {
		logger.Log.Info("[WS] Signal chunk dropped",
			zap.String("reason", "viewer-not-found"),
			zap.String("type", message.Type),
			zap.String("viewerID", message.ViewerID),
			zap.Int("bytes", signalBytes(message)),
		)
		return
	}
	h.safeSend(viewer, message)
}

func (h *Hub) FromViewer(client *Client, message SignalMessage) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.broadcaster == nil {
		h.safeSend(client, SignalMessage{Type: "no-broadcaster"})
		return
	}

	message.ViewerID = client.id
	h.safeSend(h.broadcaster, message)
}

func (h *Hub) GetLive() bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	return h.isLive
}

func (h *Hub) safeSend(client *Client, message SignalMessage) {
	bytes := signalBytes(message)
	select {
	case client.send <- message:
		logger.Log.Info("[WS] Signal chunk queued",
			zap.String("clientID", client.id),
			zap.String("type", message.Type),
			zap.String("viewerID", message.ViewerID),
			zap.Bool("hasSDP", len(message.SDP) > 0),
			zap.Int("sdpBytes", len(message.SDP)),
			zap.Bool("hasCandidate", len(message.Candidate) > 0),
			zap.Int("candidateBytes", len(message.Candidate)),
			zap.Int("bytes", bytes),
		)
	default:
		logger.Log.Info("[WS] Signal chunk dropped",
			zap.String("reason", "client-send-buffer-full"),
			zap.String("clientID", client.id),
			zap.String("type", message.Type),
			zap.String("viewerID", message.ViewerID),
			zap.Int("bytes", bytes),
		)
	}
}

func signalBytes(message SignalMessage) int {
	payload, err := json.Marshal(message)
	if err != nil {
		return 0
	}
	return len(payload)
}
