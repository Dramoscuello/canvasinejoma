import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Capturado un error de componente:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          color: '#0f172a',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div className="glass-panel" style={{ padding: '36px', maxWidth: '480px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <AlertTriangle size={48} color="#e11d48" />
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem' }}>Ocurrió un inconveniente temporal</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Se ha evitado un colapso de la pantalla. Haz clic abajo para recargar la pizarra de forma segura.
            </p>
            <button className="glass-button active" onClick={this.handleReload} style={{ marginTop: '8px' }}>
              <RefreshCw size={16} /> Recargar Pizarra
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
