import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Save,
  Download,
  PowerOff,
  History,
  Share2,
  Plus,
  LogOut,
  Users
} from 'lucide-react';

export default function Navbar({
  sessionTitle,
  roomCode,
  isActive,
  isTeacher,
  spectatorCount = 0,
  onSaveSession,
  onExportImage,
  onFinishSession,
  onOpenHistory,
  onStartNewClass,
  onShareOpen,
  onLogout
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (onShareOpen) {
      onShareOpen();
    } else {
      const studentUrl = `${window.location.origin}/r/${roomCode}`;
      navigator.clipboard.writeText(studentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <header className="header-navbar glass-panel">
      {/* Brand Logo */}
      <div className="brand-container">
        <div className="logo-icon">
          <Sparkles size={20} color="#4f46e5" />
        </div>
        <div className="brand-text">
          <span className="brand-name">CanvaInejoma</span>
          <span className="brand-sub">Aula Local</span>
        </div>
      </div>

      {/* Info de Clase, Código y Contador de Estudiantes Activos */}
      {roomCode && (
        <div className="session-info">
          <span className="session-title">{sessionTitle || 'Clase Interactiva'}</span>
          <div className="code-badge" onClick={handleCopyLink} title="Abrir opciones de compartir enlace">
            <span className="code-label">Código:</span>
            <strong className="code-value">{roomCode}</strong>
            {copied ? <Check size={14} color="#059669" /> : <Copy size={14} />}
          </div>
          {isActive ? (
            <div className="live-badge">
              <span className="live-dot" /> EN VIVO
            </div>
          ) : (
            <div className="ended-badge">FINALIZADA</div>
          )}

          {/* Contador de Estudiantes Conectados en Tiempo Real */}
          {isTeacher && isActive && (
            <div className="spectator-counter-badge" title="Estudiantes activos viendo la clase en tiempo real">
              <Users size={15} color="#4f46e5" />
              <span>
                <strong>{spectatorCount}</strong> {spectatorCount === 1 ? 'Estudiante' : 'Estudiantes'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Acciones de la Barra Navbar */}
      <div className="header-actions">
        {isTeacher && (
          <>
            {/* Si la clase está ACTIVA: herramientas de la sesión en vivo */}
            {roomCode && isActive ? (
              <>
                <button className="glass-button" onClick={handleCopyLink} title="Ver Enlace y Código para Estudiantes">
                  <Share2 size={16} />
                  <span className="btn-text">Compartir</span>
                </button>

                <button className="glass-button success" onClick={onSaveSession} title="Guardar estado en Base de Datos">
                  <Save size={16} />
                  <span className="btn-text">Guardar</span>
                </button>

                <button className="glass-button danger" onClick={onFinishSession} title="Finalizar Clase e Inhabilitar Código">
                  <PowerOff size={16} />
                  <span className="btn-text">Finalizar Sesión</span>
                </button>
              </>
            ) : (
              /* Si la clase está FINALIZADA o sin clase activa: Nueva Clase, Historial y Descargar Imagen */
              <>
                <button className="glass-button active" onClick={onStartNewClass} title="Iniciar un nuevo lienzo de clase">
                  <Plus size={16} />
                  <span className="btn-text">Nueva Clase</span>
                </button>

                <button className="glass-button" onClick={onOpenHistory} title="Historial de Clases">
                  <History size={16} />
                  <span className="btn-text">Historial</span>
                </button>

                <button className="glass-button" onClick={onExportImage} title="Exportar como Imagen PNG">
                  <Download size={16} />
                  <span className="btn-text">Descargar Imagen</span>
                </button>
              </>
            )}

            {/* Botón Salir / Cerrar Sesión con Confirmación */}
            <button className="glass-button danger" onClick={onLogout} title="Cerrar Sesión de Administrador">
              <LogOut size={16} />
              <span className="btn-text">Salir</span>
            </button>
          </>
        )}

        {!isTeacher && (
          <button className="glass-button" onClick={onExportImage} title="Descargar Copia de la Pizarra">
            <Download size={16} />
            <span className="btn-text">Descargar PNG</span>
          </button>
        )}
      </div>
    </header>
  );
}
