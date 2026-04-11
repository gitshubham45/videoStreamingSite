package ws

import "sync"

// Viewer represents a connected watch client
type Viewer struct {
	send chan []byte
}

type Hub struct {
	mu          sync.RWMutex
	viewers     map[*Viewer]bool
	register    chan *Viewer
	unregister  chan *Viewer
	broadcast   chan []byte
	initSegment []byte // first WebM chunk — cached for late joiners
	isLive      bool
}

var GlobalHub = &Hub{
	viewers:    make(map[*Viewer]bool),
	register:   make(chan *Viewer, 16),
	unregister: make(chan *Viewer, 16),
	broadcast:  make(chan []byte, 64),
}

func (h *Hub) Run() {
	for {
		select {
		case v := <-h.register:
			h.mu.Lock()
			h.viewers[v] = true
			// Send cached init segment so viewer can decode from current position
			if h.initSegment != nil {
				v.send <- h.initSegment
			}
			h.mu.Unlock()

		case v := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.viewers[v]; ok {
				delete(h.viewers, v)
				close(v.send)
			}
			h.mu.Unlock()

		case chunk := <-h.broadcast:
			h.mu.RLock()
			for v := range h.viewers {
				select {
				case v.send <- chunk:
				default:
					// Slow viewer — drop chunk rather than block
				}
			}
			h.mu.RUnlock()
		}
	}
}
