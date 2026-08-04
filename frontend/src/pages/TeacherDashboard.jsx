import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Toolbar from '../components/Toolbar';
import CanvasWorkspace from '../components/CanvasWorkspace';
import HistoryDrawer from '../components/HistoryDrawer';
import ShareModal from '../components/ShareModal';
import CustomDialogModal from '../components/CustomDialogModal';
import { generate4CharRoomCode } from '../utils/codeGenerator';
import { wsService } from '../services/websocket';
import { Sparkles, Play, BookOpen } from 'lucide-react';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [sessionTitle, setSessionTitle] = useState('');
  const [roomCode, setRoomCode] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [showStartModal, setShowStartModal] = useState(true);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsReconnecting, setWsReconnecting] = useState(false);

  // Estado para Diálogos Personalizados (Reemplazo de alert y confirm)
  const [dialog, setDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'Aceptar',
    cancelText: 'Cancelar',
    onConfirm: null
  });

  // Herramientas del Lienzo
  const [activeTool, setActiveTool] = useState('pencil');
  const [color, setColor] = useState('#0f172a');
  const [brushSize, setBrushSize] = useState(4);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Historial
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const canvasRef = useRef(null);

  // Verificar autenticación y restaurar sesión activa si se refrescó la página
  useEffect(() => {
    const token = localStorage.getItem('canva_admin_token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Cargar historial local existente
    const savedHistory = localStorage.getItem('canva_history');
    if (savedHistory) {
      try {
        setHistoryList(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Error cargando historial:', e);
      }
    }

    // Restaurar clase activa únicamente si existe una clase EN VIVO activa sin finalizar
    const activeSession = localStorage.getItem('canva_active_session');
    if (activeSession) {
      try {
        const parsed = JSON.parse(activeSession);
        if (parsed.isActive && parsed.code) {
          setSessionTitle(parsed.title || 'Clase Activa');
          setRoomCode(parsed.code);
          setIsActive(true);
          setShowStartModal(false);

          // Re-conectar WebSocket en modo profesor
          wsService.connect(parsed.code, true);

          // Restaurar contenido del lienzo tras montar el componente
          setTimeout(() => {
            if (parsed.canvasData && canvasRef.current?.loadRemoteJSON) {
              canvasRef.current.loadRemoteJSON(parsed.canvasData);
            }
          }, 350);
          return;
        }
      } catch (e) {
        console.error('Error restaurando sesión activa:', e);
      }
    }

    // Si NO hay sesión activa abierta (showStartModal es true), limpiar lienzo completamente
    setShowStartModal(true);
    setIsActive(false);
    setRoomCode(null);
    setSessionTitle('');
    setTimeout(() => {
      if (canvasRef.current && canvasRef.current.clearAll) {
        canvasRef.current.clearAll();
      }
    }, 200);
  }, [navigate]);

  // Escuchar mensajes del WebSocket: contador de espectadores y estado de conexión
  useEffect(() => {
    const unsubscribe = wsService.subscribe((message) => {
      if (message.type === 'CONNECTION_STATUS') {
        setWsConnected(message.connected);
        setWsReconnecting(!!message.reconnecting);
        return;
      }

      if (message.type === 'SPECTATOR_COUNT' && typeof message.count === 'number') {
        setSpectatorCount(message.count);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Guardar estado de sesión activa en localStorage continuamente para resistir F5 / Refresco
  const persistActiveSessionState = (code, title, canvasData) => {
    if (!code) return;
    const sessionState = {
      code,
      title,
      isActive: true,
      canvasData: canvasData || canvasRef.current?.toJSON?.(),
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem('canva_active_session', JSON.stringify(sessionState));
  };

  // Helper para mostrar Alerta Personalizada
  const showAlert = (title, message, type = 'info') => {
    setDialog({
      isOpen: true,
      title,
      message,
      type,
      confirmText: 'Aceptar',
      onConfirm: null
    });
  };

  // Helper para mostrar Confirmación Personalizada
  const showConfirm = (title, message, onConfirmAction, type = 'confirm') => {
    setDialog({
      isOpen: true,
      title,
      message,
      type,
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      onConfirm: () => {
        setDialog((prev) => ({ ...prev, isOpen: false }));
        onConfirmAction();
      }
    });
  };

  // Cerrar Sesión con Confirmación Personalizada
  const handleLogout = () => {
    showConfirm(
      '¿Cerrar Sesión de Administrador?',
      '¿Estás seguro de que deseas cerrar la sesión? Volverás a la pantalla de inicio de sesión.',
      () => {
        localStorage.removeItem('canva_admin_token');
        localStorage.removeItem('canva_admin_user');
        wsService.disconnect();
        navigate('/login');
      },
      'warning'
    );
  };

  // Abrir Modal para Iniciar una Nueva Clase (Elimina sesión activa previa y limpia lienzo)
  const handleStartNewClass = () => {
    localStorage.removeItem('canva_active_session');
    setSessionTitle('');
    setRoomCode(null);
    setIsActive(false);
    setSpectatorCount(0);
    setShowStartModal(true);
    if (canvasRef.current && canvasRef.current.clearAll) {
      canvasRef.current.clearAll();
    }
  };

  // Iniciar Sesión de Lienzo (Registra en Backend y BD)
  const handleStartCanvas = async (e) => {
    e?.preventDefault();
    if (!sessionTitle.trim()) return;

    // Limpiar lienzo de dibujos viejos al iniciar clase nueva
    if (canvasRef.current && canvasRef.current.clearAll) {
      canvasRef.current.clearAll();
    }

    let finalCode = generate4CharRoomCode();

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: sessionTitle })
      });

      if (res.ok) {
        const session = await res.json();
        finalCode = session.code;
      }
    } catch (err) {
      console.warn('Backend API no disponible, usando fallback local:', err);
    }

    setRoomCode(finalCode);
    setIsActive(true);
    setSpectatorCount(0);
    setShowStartModal(false);
    wsService.connect(finalCode, true);

    // Persistir estado inicial en localStorage
    persistActiveSessionState(finalCode, sessionTitle, null);
  };

  // Transmitir Cambios en el Canvas por WebSocket (incluye viewport y persiste en localStorage)
  const handleCanvasChange = (canvasJSON, viewportTransform) => {
    if (roomCode && isActive) {
      wsService.sendCanvasUpdate(canvasJSON, viewportTransform);
      persistActiveSessionState(roomCode, sessionTitle, canvasJSON);
    }
  };

  // Transmitir solo el Viewport (pan/zoom sin dibujar) por WebSocket
  const handleViewportChange = (viewportTransform) => {
    if (roomCode && isActive) {
      wsService.sendViewportUpdate(viewportTransform);
    }
  };

  // Guardar Sesión en Historial y BD con el número de espectadores actual
  const handleSaveSession = () => {
    if (!roomCode) return;
    const canvasData = canvasRef.current?.toJSON?.();

    const newRecord = {
      id: Date.now().toString(),
      title: sessionTitle,
      code: roomCode,
      is_active: isActive,
      spectators_count: spectatorCount,
      canvas_data: canvasData,
      created_at: new Date().toISOString()
    };

    const updatedHistory = [newRecord, ...historyList.filter((h) => h.code !== roomCode)];
    setHistoryList(updatedHistory);
    localStorage.setItem('canva_history', JSON.stringify(updatedHistory));

    if (isActive) {
      persistActiveSessionState(roomCode, sessionTitle, canvasData);
    }

    showAlert('¡Clase Guardada!', `La clase "${sessionTitle}" ha sido guardada exitosamente con ${spectatorCount} alumnos.`, 'success');
  };

  // Exportar Imagen PNG
  const handleExportImage = () => {
    if (canvasRef.current && canvasRef.current.exportPNG) {
      canvasRef.current.exportPNG();
    }
  };

  // Finalizar Sesión (Invalida el código de 4 caracteres en backend y limpia lienzo)
  const handleFinishSession = () => {
    showConfirm(
      '¿Finalizar la Clase Actual?',
      'Al finalizar la clase, el código de 4 caracteres quedará inhabilitado para los estudiantes.',
      async () => {
        const currentCode = roomCode;
        const currentTitle = sessionTitle;
        const canvasData = canvasRef.current?.toJSON?.();

        // 1. Notificar al Backend para marcar la sesión como inactiva
        if (currentCode) {
          try {
            await fetch(`/api/sessions/${currentCode}/finish`, { method: 'POST' });
          } catch (e) {
            console.warn('Error notificando finalización al servidor backend:', e);
          }
        }

        // 2. Guardar en el Historial marcado como FINALIZADO (is_active: false)
        const finishedRecord = {
          id: Date.now().toString(),
          title: currentTitle,
          code: currentCode,
          is_active: false,
          spectators_count: spectatorCount,
          canvas_data: canvasData,
          created_at: new Date().toISOString()
        };

        const updatedHistory = [finishedRecord, ...historyList.filter((h) => h.code !== currentCode)];
        setHistoryList(updatedHistory);
        localStorage.setItem('canva_history', JSON.stringify(updatedHistory));

        // 3. Eliminar la sesión activa de localStorage para que refrescar no reabra la sesión vieja
        localStorage.removeItem('canva_active_session');

        // 4. Desconectar WebSocket y resetear estado a inactivo
        wsService.disconnect();
        setRoomCode(null);
        setIsActive(false);
        setSessionTitle('');
        setSpectatorCount(0);
        setShowStartModal(true);

        // 5. Limpiar el lienzo inmediatamente
        if (canvasRef.current && canvasRef.current.clearAll) {
          canvasRef.current.clearAll();
        }

        showAlert('Sesión Finalizada', 'La clase ha finalizado exitosamente. El código de acceso ha quedado inhabilitado.', 'info');
      },
      'warning'
    );
  };

  // Reabrir clase del historial
  const handleLoadClassFromHistory = (item) => {
    setSessionTitle(item.title);
    setRoomCode(item.code);
    setIsActive(false);
    setSpectatorCount(item.spectators_count || 0);
    setShowStartModal(false);
    setIsHistoryOpen(false);

    localStorage.removeItem('canva_active_session');

    if (canvasRef.current && canvasRef.current.loadRemoteJSON) {
      canvasRef.current.loadRemoteJSON(item.canvas_data);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Navbar Superior */}
      <Navbar
        sessionTitle={sessionTitle}
        roomCode={roomCode}
        isActive={isActive}
        isTeacher={true}
        spectatorCount={spectatorCount}
        wsConnected={wsConnected}
        wsReconnecting={wsReconnecting}
        onSaveSession={handleSaveSession}
        onExportImage={handleExportImage}
        onFinishSession={handleFinishSession}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onStartNewClass={handleStartNewClass}
        onShareOpen={() => setIsShareOpen(true)}
        onLogout={handleLogout}
      />

      {/* Espacio del Lienzo */}
      <CanvasWorkspace
        activeTool={activeTool}
        color={color}
        brushSize={brushSize}
        isTeacher={true}
        onCanvasChange={handleCanvasChange}
        onViewportChange={handleViewportChange}
        onZoomChange={setZoomLevel}
        ref={canvasRef}
      />

      {/* Barra de Herramientas Flotante */}
      {roomCode && (
        <Toolbar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          color={color}
          setColor={setColor}
          brushSize={brushSize}
          setBrushSize={setBrushSize}
          onAddShape={(shape) => canvasRef.current?.addShape?.(shape)}
          onImageUpload={(base64) => canvasRef.current?.addImage?.(base64)}
          onUndo={() => canvasRef.current?.undo?.()}
          onClearCanvas={() => canvasRef.current?.clearAll?.()}
          onDeleteSelected={() => canvasRef.current?.deleteSelected?.()}
          onZoomIn={() => canvasRef.current?.setZoomLevel?.(zoomLevel + 0.15)}
          onZoomOut={() => canvasRef.current?.setZoomLevel?.(Math.max(0.2, zoomLevel - 0.15))}
          onResetZoom={() => canvasRef.current?.setZoomLevel?.(1)}
          zoomLevel={zoomLevel}
        />
      )}

      {/* Modal Iniciar Lienzo */}
      {showStartModal && (
        <div className="modal-overlay">
          <div className="modal-card glass-panel animate-fade-in">
            <div className="modal-header">
              <div className="logo-icon">
                <Sparkles size={24} color="#4f46e5" />
              </div>
              <div>
                <h2 className="modal-title">Iniciar Nuevo Lienzo</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Ingresa el nombre o tema de la clase para generar el código de 4 caracteres.
                </p>
              </div>
            </div>

            <form onSubmit={handleStartCanvas} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 500 }}>
                  Nombre de la Clase / Tema
                </label>
                <div style={{ position: 'relative' }}>
                  <BookOpen size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                  <input
                    type="text"
                    className="glass-input"
                    style={{ paddingLeft: '42px' }}
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    placeholder="Ej. Ecuaciones Cuadráticas"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="glass-button"
                  onClick={() => setIsHistoryOpen(true)}
                >
                  Ver Historial
                </button>
                <button type="submit" className="glass-button active">
                  <Play size={16} /> Iniciar Lienzo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Grande de Compartir Enlace */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        roomCode={roomCode}
        sessionTitle={sessionTitle}
      />

      {/* Modal de Diálogo Personalizado (Alertas y Confirmaciones) */}
      <CustomDialogModal
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        confirmText={dialog.confirmText}
        cancelText={dialog.cancelText}
        onConfirm={dialog.onConfirm}
        onCancel={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
        onClose={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Drawer de Historial de Clases */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        historyList={historyList}
        onLoadClass={handleLoadClassFromHistory}
        onStartNewClass={handleStartNewClass}
      />
    </div>
  );
}
