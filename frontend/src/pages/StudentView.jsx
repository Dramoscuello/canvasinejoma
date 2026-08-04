import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CanvasWorkspace from '../components/CanvasWorkspace';
import { wsService } from '../services/websocket';
import { Radio, AlertCircle, ZoomIn, ZoomOut, RotateCcw, Search, LogOut } from 'lucide-react';

export default function StudentView() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [sessionTitle, setSessionTitle] = useState('Clase en Vivo');
  const [isActive, setIsActive] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [sessionEndedInfo, setSessionEndedInfo] = useState({ isEnded: false, countdown: 5 });

  const canvasRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // 1. Verificación inicial de vigencia al cargar o refrescar la página
  useEffect(() => {
    if (!code) return;

    const verifySessionOnMount = async () => {
      try {
        const res = await fetch(`/api/sessions/${code}`);
        if (!res.ok) {
          // Si el código no existe (404) o ya expiró (410 GONE), expulsar de inmediato a la pantalla del PIN
          navigate('/', {
            replace: true,
            state: { error: 'No existe una clase activa con el código ingresado o ya ha finalizado.' }
          });
          return;
        }

        const sessionData = await res.json();
        if (!sessionData.is_active) {
          navigate('/', {
            replace: true,
            state: { error: 'La clase asociada a este código de 4 caracteres ya ha finalizado.' }
          });
          return;
        }

        if (sessionData.title) {
          setSessionTitle(sessionData.title);
        }
      } catch (err) {
        console.warn('Error verificando la sesión en el servidor:', err);
      }
    };

    verifySessionOnMount();

    // 2. Conectar WebSocket como Estudiante (Solo Lectura)
    wsService.connect(code, false);

    // 3. Escuchar actualizaciones del lienzo y finalización en tiempo real
    const unsubscribe = wsService.subscribe((message) => {
      if (message.type === 'CANVAS_UPDATE' && message.data) {
        if (canvasRef.current && canvasRef.current.loadRemoteJSON) {
          canvasRef.current.loadRemoteJSON(message.data);
        }
      } else if (message.type === 'SESSION_ENDED') {
        setIsActive(false);
        triggerSessionEndedCountdown();
      }
    });

    return () => {
      unsubscribe();
      wsService.disconnect();
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [code, navigate]);

  // Función para iniciar la cuenta regresiva de 5 segundos al finalizar la clase
  const triggerSessionEndedCountdown = () => {
    setSessionEndedInfo({ isEnded: true, countdown: 5 });

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    let secondsLeft = 5;
    countdownIntervalRef.current = setInterval(() => {
      secondsLeft -= 1;
      setSessionEndedInfo({ isEnded: true, countdown: secondsLeft });

      if (secondsLeft <= 0) {
        clearInterval(countdownIntervalRef.current);
        wsService.disconnect();
        navigate('/', {
          replace: true,
          state: { error: 'La sesión ha finalizado. Ingresa un nuevo código para unirte a otra clase.' }
        });
      }
    }, 1000);
  };

  const handleExportImage = () => {
    if (canvasRef.current && canvasRef.current.exportPNG) {
      canvasRef.current.exportPNG();
    }
  };

  const handleZoomIn = () => {
    if (canvasRef.current && canvasRef.current.setZoomLevel) {
      canvasRef.current.setZoomLevel(zoomLevel + 0.2);
    }
  };

  const handleZoomOut = () => {
    if (canvasRef.current && canvasRef.current.setZoomLevel) {
      canvasRef.current.setZoomLevel(Math.max(0.2, zoomLevel - 0.2));
    }
  };

  const handleResetZoom = () => {
    if (canvasRef.current && canvasRef.current.setZoomLevel) {
      canvasRef.current.setZoomLevel(1);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Navbar en modo Estudiante */}
      <Navbar
        sessionTitle={sessionTitle}
        roomCode={code}
        isActive={isActive}
        isTeacher={false}
        onExportImage={handleExportImage}
      />

      {/* Mensaje Informativo Flotante de Solo Lectura */}
      <div
        className="glass-panel animate-fade-in"
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '24px',
          zIndex: 1000,
          padding: '8px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.85rem',
          color: 'var(--text-muted)'
        }}
      >
        {isActive ? (
          <>
            <Radio size={16} color="#10b981" />
            <span>Viendo en tiempo real (Solo lectura)</span>
          </>
        ) : (
          <>
            <AlertCircle size={16} color="#f43f5e" />
            <span style={{ color: '#dc2626', fontWeight: 600 }}>La clase ha finalizado</span>
          </>
        )}
      </div>

      {/* Modal / Overlay de Redirección en 5 Segundos al Finalizar la Clase */}
      {sessionEndedInfo.isEnded && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div
            className="modal-card glass-panel animate-fade-in"
            style={{ maxWidth: '440px', padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto'
              }}
            >
              <AlertCircle size={32} color="#dc2626" />
            </div>

            <div>
              <h2 className="modal-title" style={{ fontSize: '1.35rem', color: '#0f172a', marginBottom: '8px' }}>
                Clase Finalizada por el Profesor
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: '1.5' }}>
                El docente ha dado por terminada la sesión en vivo. Serás redirigido a la pantalla principal en:
              </p>
            </div>

            <div
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '3.2rem',
                fontWeight: 800,
                color: 'var(--primary)',
                lineHeight: 1
              }}
            >
              {sessionEndedInfo.countdown}s
            </div>

            <button
              className="glass-button active"
              onClick={() => {
                if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                wsService.disconnect();
                navigate('/', { replace: true });
              }}
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            >
              <LogOut size={16} /> Ir a Ingresar Código Ahora
            </button>
          </div>
        </div>
      )}

      {/* Control Flotante de Zoom / Lupa para el Estudiante (Móvil y PC) */}
      <div
        className="glass-panel animate-fade-in"
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          zIndex: 1000,
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderRadius: '12px'
        }}
      >
        <Search size={16} color="var(--primary)" title="Lupa de acercamiento/alejamiento" />

        <button
          className="glass-button"
          style={{ padding: '6px 8px', borderRadius: '8px' }}
          onClick={handleZoomOut}
          title="Alejar (Zoom Out)"
        >
          <ZoomOut size={16} />
        </button>

        <span
          className="zoom-text"
          onClick={handleResetZoom}
          title="Clic para restablecer zoom al 100%"
          style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: '42px', textAlign: 'center' }}
        >
          {Math.round(zoomLevel * 100)}%
        </span>

        <button
          className="glass-button"
          style={{ padding: '6px 8px', borderRadius: '8px' }}
          onClick={handleZoomIn}
          title="Acercar (Zoom In)"
        >
          <ZoomIn size={16} />
        </button>

        <button
          className="glass-button"
          style={{ padding: '6px 8px', borderRadius: '8px' }}
          onClick={handleResetZoom}
          title="Restablecer vista (100%)"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Espacio de Lienzo en Solo Lectura */}
      <CanvasWorkspace
        activeTool="select"
        color="#ffffff"
        brushSize={4}
        isTeacher={false}
        onZoomChange={setZoomLevel}
        ref={canvasRef}
      />
    </div>
  );
}
