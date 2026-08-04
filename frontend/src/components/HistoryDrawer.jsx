import React from 'react';
import { X, Calendar, Eye, Plus, Users } from 'lucide-react';

export default function HistoryDrawer({ isOpen, onClose, historyList, onLoadClass, onStartNewClass }) {
  if (!isOpen) return null;

  return (
    <div className="drawer-overlay animate-fade-in" onClick={onClose}>
      <div className="drawer-panel glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="history-card-header">
          <h2 className="modal-title">Historial de Clases</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="glass-button active"
              onClick={() => {
                onClose();
                onStartNewClass();
              }}
              style={{ fontSize: '0.82rem', padding: '6px 12px' }}
            >
              <Plus size={14} /> Nueva Clase
            </button>
            <button className="glass-button" onClick={onClose} style={{ padding: '6px' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {historyList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            No hay clases guardadas previamente.
          </div>
        ) : (
          <div className="history-list">
            {historyList.map((item) => (
              <div key={item.id} className="history-card">
                <div className="history-card-header">
                  <span className="history-card-title">{item.title}</span>
                  <span className="code-value" style={{ fontSize: '0.85rem' }}>
                    {item.code}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="history-card-date">
                    <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    {new Date(item.created_at).toLocaleString()}
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={13} />
                    <span>{item.spectators_count || 0} alumnos</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button
                    className="glass-button"
                    style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                    onClick={() => onLoadClass(item)}
                  >
                    <Eye size={14} /> Reabrir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
