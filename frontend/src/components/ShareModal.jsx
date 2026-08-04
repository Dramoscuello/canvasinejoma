import React, { useState } from 'react';
import { Share2, Copy, Check, X, QrCode, Monitor } from 'lucide-react';

export default function ShareModal({ isOpen, onClose, roomCode, sessionTitle }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !roomCode) return null;

  const fullStudentUrl = `${window.location.origin}/r/${roomCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullStudentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div
        className="modal-card glass-panel"
        style={{ maxWidth: '520px', padding: '32px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="logo-icon" style={{ width: '42px', height: '42px' }}>
              <Share2 size={22} color="#4f46e5" />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.25rem' }}>
                Compartir Clase en Vivo
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                {sessionTitle || 'Clase Interactiva'}
              </p>
            </div>
          </div>
          <button className="glass-button" style={{ padding: '6px' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Código Prominente de 4 Caracteres */}
        <div
          style={{
            background: 'rgba(79, 70, 229, 0.06)',
            border: '1.5px dashed rgba(79, 70, 229, 0.35)',
            borderRadius: '16px',
            padding: '20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Código de Acceso Rápido
          </span>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '2.8rem',
              fontWeight: 800,
              color: 'var(--primary)',
              letterSpacing: '0.25em'
            }}
          >
            {roomCode}
          </span>
        </div>

        {/* Campo con URL Completa para Estudiantes */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
            Enlace Directo para Estudiantes:
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              readOnly
              className="glass-input"
              value={fullStudentUrl}
              onClick={(e) => e.target.select()}
              style={{
                fontFamily: 'monospace',
                fontSize: '0.92rem',
                color: 'var(--primary)',
                fontWeight: 600,
                background: '#ffffff'
              }}
            />
            <button
              className={`glass-button ${copied ? 'success' : 'active'}`}
              onClick={handleCopy}
              style={{ minWidth: '110px', justifyContent: 'center' }}
            >
              {copied ? (
                <>
                  <Check size={16} /> ¡Copiado!
                </>
              ) : (
                <>
                  <Copy size={16} /> Copiar
                </>
              )}
            </button>
          </div>
        </div>

        {/* Instrucciones para el Aula */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: '#f8fafc',
            border: '1px solid var(--border-glass)',
            padding: '14px',
            borderRadius: '12px',
            fontSize: '0.84rem',
            color: 'var(--text-muted)'
          }}
        >
          <Monitor size={20} color="var(--primary)" style={{ shrink: 0 }} />
          <span>
            Los estudiantes pueden proyectar el enlace en su navegador o ingresar el código <strong>{roomCode}</strong> en la página principal.
          </span>
        </div>

        <div className="modal-actions">
          <button className="glass-button active" onClick={onClose} style={{ width: '100%', justifyContent: 'center' }}>
            Listo / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
