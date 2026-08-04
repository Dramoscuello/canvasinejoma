/**
 * Servidor WebSocket Client Manager para CanvaInejoma
 * Maneja la sincronización en tiempo real del lienzo entre el Profesor y los Estudiantes.
 */

class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.roomCode = null;
    this.isTeacher = false;
    this.reconnectAttempts = 0;
    this.mockBroadcastChannel = null;
  }

  connect(roomCode, isTeacher = false) {
    this.roomCode = roomCode;
    this.isTeacher = isTeacher;

    // Intentar BroadcastChannel como fallback ultrarrápido entre pestañas del mismo navegador local
    if (typeof BroadcastChannel !== 'undefined') {
      this.mockBroadcastChannel = new BroadcastChannel(`canvas_room_${roomCode}`);
      this.mockBroadcastChannel.onmessage = (event) => {
        this.notifyListeners(event.data);
      };
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${roomCode}?role=${isTeacher ? 'teacher' : 'student'}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`[WebSocket] Conectado a la sala ${roomCode}`);
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyListeners(data);
        } catch (e) {
          console.error('[WebSocket] Error parseando mensaje:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Conexión cerrada');
      };

      this.ws.onerror = (err) => {
        console.warn('[WebSocket] Servidor backend no disponible aún (usando modo simulación local LAN)', err);
      };
    } catch (err) {
      console.warn('[WebSocket] Error al intentar conectar:', err);
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

    // Broadcast local si existe
    if (this.mockBroadcastChannel) {
      this.mockBroadcastChannel.postMessage(payload);
    }

    // Enviar por WebSocket si está abierto
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.mockBroadcastChannel) {
      this.mockBroadcastChannel.close();
      this.mockBroadcastChannel = null;
    }
    this.listeners.clear();
  }
}

export const wsService = new WebSocketService();
