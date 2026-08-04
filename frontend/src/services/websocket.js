/**
 * WebSocket Client Manager para CanvaInejoma
 * Maneja la sincronización en tiempo real del lienzo entre Profesor y Estudiantes.
 */

const MAX_RECONNECT_ATTEMPTS = 8;
const BASE_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;

class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.roomCode = null;
    this.isTeacher = false;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.mockBroadcastChannel = null;
    this.connected = false;
    this.shouldReconnect = false;
  }

  connect(roomCode, isTeacher = false) {
    this.disconnect();

    this.roomCode = roomCode;
    this.isTeacher = isTeacher;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;

    if (typeof BroadcastChannel !== 'undefined') {
      this.mockBroadcastChannel = new BroadcastChannel(`canvas_room_${roomCode}`);
      this.mockBroadcastChannel.onmessage = (event) => {
        this.notifyListeners(event.data);
      };
    }

    this.openWebSocket();
  }

  openWebSocket() {
    if (!this.roomCode) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${this.roomCode}?role=${this.isTeacher ? 'teacher' : 'student'}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        this.notifyListeners({
          type: 'CONNECTION_STATUS',
          connected: true
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyListeners(data);
        } catch {
          /* malformed message, skip */
        }
      };

      this.ws.onclose = () => {
        const wasConnected = this.connected;
        this.connected = false;
        this.ws = null;

        if (wasConnected) {
          this.notifyListeners({
            type: 'CONNECTION_STATUS',
            connected: false
          });
        }

        if (this.shouldReconnect && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(
            BASE_RECONNECT_MS * Math.pow(2, this.reconnectAttempts),
            MAX_RECONNECT_MS
          );
          this.reconnectAttempts += 1;
          this.notifyListeners({
            type: 'CONNECTION_STATUS',
            connected: false,
            reconnecting: true,
            attempt: this.reconnectAttempts
          });
          this.reconnectTimer = setTimeout(() => this.openWebSocket(), delay);
        }
      };

      this.ws.onerror = () => {
        /* onclose will fire after onerror; reconnect is handled there */
      };
    } catch {
      /* fallback to BroadcastChannel only is already active */
    }
  }

  sendCanvasUpdate(canvasJSON, viewportTransform) {
    const payload = {
      type: 'CANVAS_UPDATE',
      roomCode: this.roomCode,
      data: canvasJSON,
      viewport: viewportTransform || null,
      timestamp: Date.now()
    };

    if (this.mockBroadcastChannel) {
      this.mockBroadcastChannel.postMessage(payload);
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  sendViewportUpdate(viewportTransform) {
    const payload = {
      type: 'VIEWPORT_UPDATE',
      roomCode: this.roomCode,
      viewport: viewportTransform,
      timestamp: Date.now()
    };

    if (this.mockBroadcastChannel) {
      this.mockBroadcastChannel.postMessage(payload);
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(data) {
    this.listeners.forEach((callback) => callback(data));
  }

  disconnect() {
    this.shouldReconnect = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }

    if (this.mockBroadcastChannel) {
      this.mockBroadcastChannel.close();
      this.mockBroadcastChannel = null;
    }

    this.connected = false;
    this.roomCode = null;
    this.reconnectAttempts = 0;
  }
}

export const wsService = new WebSocketService();
