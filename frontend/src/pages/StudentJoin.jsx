import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, ArrowRight, AlertCircle, KeyRound, UserCheck } from 'lucide-react';

export default function StudentJoin() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoinClass = async (e) => {
    e.preventDefault();
    const cleanCode = code.trim();
    if (!cleanCode || cleanCode.length !== 4) {
      setError('Por favor ingresa los 4 caracteres del código de clase');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Verificar si la sesión existe y está activa en la API del Backend
      const res = await fetch(`/api/sessions/${cleanCode}`);
      if (res.ok) {
        const sessionData = await res.json();
        if (sessionData.is_active) {
          navigate(`/r/${cleanCode}`);
        } else {
          setError('La clase asociada a este código de 4 caracteres ya ha finalizado.');
        }
      } else if (res.status === 404 || res.status === 410) {
        setError('Actualmente no hay una sesión activa con el código ingresado.');
      } else {
        // Fallback si backend no está disponible en modo offline
        navigate(`/r/${cleanCode}`);
      }
    } catch (err) {
      console.warn('Backend offline, redirigiendo a la sala local:', err);
      navigate(`/r/${cleanCode}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 30%, rgba(99, 102, 241, 0.09) 0%, #f8fafc 70%)',
        padding: '20px'
      }}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '36px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}
      >
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div className="logo-icon" style={{ width: '52px', height: '52px', borderRadius: '14px' }}>
            <Sparkles size={28} color="#4f46e5" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.65rem', fontWeight: 700, marginTop: '8px', color: '#0f172a' }}>
            CanvaInejoma
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Ingresa el código de 4 caracteres para unirte a la clase en vivo.
          </p>
        </div>

        {/* Alerta de Error Elegante si el Código no Existe */}
        {error && (
          <div
            className="animate-fade-in"
            style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              color: '#dc2626',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <AlertCircle size={20} color="#dc2626" style={{ shrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleJoinClass} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
              Código de la Clase (4 Caracteres):
            </label>
            <div style={{ position: 'relative' }}>
              <KeyRound
                size={20}
                style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }}
              />
              <input
                type="text"
                className="glass-input"
                style={{
                  paddingLeft: '48px',
                  fontFamily: 'monospace',
                  fontSize: '1.4rem',
                  letterSpacing: '0.25em',
                  textAlign: 'center',
                  fontWeight: 700,
                  color: 'var(--primary)'
                }}
                maxLength={4}
                value={code}
                onChange={(e) => {
                  setError('');
                  setCode(e.target.value);
                }}
                placeholder="aB3k"
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            className="glass-button active"
            disabled={loading}
            style={{
              justifyContent: 'center',
              padding: '14px',
              fontSize: '1rem',
              fontWeight: 600
            }}
          >
            {loading ? 'Verificando Código...' : 'Unirse a la Clase'} <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ textAlign: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '16px', marginTop: '4px' }}>
          <Link
            to="/login"
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 500
            }}
          >
            <UserCheck size={16} color="var(--primary)" /> ¿Eres docente? Iniciar Sesión de Administrador
          </Link>
        </div>
      </div>
    </div>
  );
}
