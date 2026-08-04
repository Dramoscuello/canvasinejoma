import React from 'react';
import { AlertCircle, CheckCircle2, HelpCircle, Info } from 'lucide-react';

export default function CustomDialogModal({
  isOpen,
  title,
  message,
  type = 'info', // 'info' | 'success' | 'warning' | 'confirm'
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  onClose
}) {
  if (!isOpen) return null;

  const handleConfirmClick = () => {
    if (onConfirm) {
      onConfirm();
    } else if (onClose) {
      onClose();
    }
  };

  const handleCancelClick = () => {
    if (onCancel) {
      onCancel();
    } else if (onClose) {
      onClose();
    }
  };

  const isConfirmDialog = Boolean(onCancel);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={32} color="#059669" />;
      case 'warning':
        return <AlertCircle size={32} color="#d97706" />;
      case 'confirm':
        return <HelpCircle size={32} color="#4f46e5" />;
      default:
        return <Info size={32} color="#4f46e5" />;
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={handleCancelClick}>
      <div
        className="modal-card glass-panel"
        style={{ maxWidth: '420px', padding: '28px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div
            style={{
              padding: '10px',
              borderRadius: '12px',
              background:
                type === 'success'
                  ? '#ecfdf5'
                  : type === 'warning'
                  ? '#fffbeb'
                  : 'rgba(79, 70, 229, 0.08)'
            }}
          >
            {getIcon()}
          </div>
          <div style={{ flex: 1 }}>
            <h3 className="modal-title" style={{ fontSize: '1.2rem', marginBottom: '6px' }}>
              {title}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.45' }}>
              {message}
            </p>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: '20px' }}>
          {isConfirmDialog ? (
            <>
              <button className="glass-button" onClick={handleCancelClick}>
                {cancelText}
              </button>
              <button className="glass-button active" onClick={handleConfirmClick}>
                {confirmText}
              </button>
            </>
          ) : (
            <button className="glass-button active" onClick={handleConfirmClick}>
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
