import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CanvasWorkspace from '../components/CanvasWorkspace';
import { wsService } from '../services/websocket';
import { Radio, AlertCircle } from 'lucide-react';

export default function StudentView() {
  const { code } = useParams();
  const [sessionTitle, setSessionTitle] = useState('Clase en Vivo');
  const [isActive, setIsActive] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!code) return;

    // Conectar WebSocket como Estudiante (Solo Lectura)
    wsService.connect(code, false);

    // Escuchar actualizaciones del lienzo y viewport desde el profesor
    const unsubscribe = wsService.subscribe((message) => {
      if (message.type === 'CANVAS_UPDATE' && message.data) {
        if (canvasRef.current && canvasRef.current.loadRemoteJSON) {
          canvasRef.current.loadRemoteJSON(message.data);
        }
        // Aplicar viewport del profesor si viene incluido
        if (message.viewport && canvasRef.current && canvasRef.current.applyViewportTransform) {
          canvasRef.current.applyViewportTransform(message.viewport);
        }
      } else if (message.type === 'VIEWPORT_UPDATE' && message.viewport) {
        // Sincronizar pan/zoom del profesor sin cambios en el dibujo
        if (canvasRef.current && canvasRef.current.applyViewportTransform) {
          canvasRef.current.applyViewportTransform(message.viewport);
        }
      } else if (message.type === 'SESSION_ENDED') {
        setIsActive(false);
      }
    });

    return () => {
      unsubscribe();
      wsService.disconnect();
    };
  }, [code]);

  const handleExportImage = () => {
    if (canvasRef.current && canvasRef.current.exportPNG) {
      canvasRef.current.exportPNG();
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
          left: '50%',
          transform: 'translateX(-50%)',
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
            <span>Viendo la explicación del profesor en tiempo real (Solo lectura)</span>
          </>
        ) : (
          <>
            <AlertCircle size={16} color="#f43f5e" />
            <span style={{ color: '#fda4af' }}>La clase ha finalizado por el profesor</span>
          </>
        )}
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
