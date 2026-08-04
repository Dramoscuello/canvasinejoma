import React, { useRef, useState, useEffect } from 'react';
import {
  GripVertical,
  MousePointer,
  Pencil,
  Eraser,
  Square,
  Circle,
  Minus,
  ArrowUpRight,
  Type,
  Image as ImageIcon,
  Trash2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Undo2
} from 'lucide-react';

const PRESET_COLORS = [
  '#0f172a', // Negro / Marcador oscuro
  '#dc2626', // Rojo
  '#2563eb', // Azul
  '#16a34a', // Verde
  '#d97706', // Ámbar / Naranja
  '#9333ea', // Púrpura
  '#ea580c', // Naranja intenso
  '#475569'  // Gris
];

export default function Toolbar({
  activeTool,
  setActiveTool,
  color,
  setColor,
  brushSize,
  setBrushSize,
  onAddShape,
  onImageUpload,
  onUndo,
  onClearCanvas,
  onDeleteSelected,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  zoomLevel
}) {
  const fileInputRef = useRef(null);
  const toolbarRef = useRef(null);

  // Estado para funcionalidad de arrastre (Drag & Drop)
  const [position, setPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    // Iniciar arrastre solo desde el manejador de agarre
    if (toolbarRef.current) {
      const rect = toolbarRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const newLeft = e.clientX - dragOffset.x;
        const newTop = e.clientY - dragOffset.y;
        setPosition({ left: `${newLeft}px`, top: `${newTop}px` });
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target.result;
        onImageUpload(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  const toolbarStyle = position
    ? {
        position: 'fixed',
        left: position.left,
        top: position.top,
        bottom: 'auto',
        transform: 'none',
        zIndex: 1000,
        cursor: isDragging ? 'grabbing' : 'default'
      }
    : {
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        cursor: isDragging ? 'grabbing' : 'default'
      };

  return (
    <div
      ref={toolbarRef}
      className="floating-toolbar glass-panel animate-fade-in"
      style={toolbarStyle}
    >
      {/* Manejador de Arrastre (Grip) */}
      <div
        className="drag-handle"
        onMouseDown={handleMouseDown}
        title="Mantén presionado y arrastra para mover la paleta"
      >
        <GripVertical size={20} color="var(--text-subtle)" />
      </div>

      <div className="toolbar-divider" />

      {/* Selector de Herramientas Principal */}
      <div className="tool-group">
        <button
          className={`glass-button ${activeTool === 'select' ? 'active' : ''}`}
          onClick={() => setActiveTool('select')}
          title="Seleccionar y Mover"
        >
          <MousePointer size={18} />
        </button>
        <button
          className={`glass-button ${activeTool === 'pencil' ? 'active' : ''}`}
          onClick={() => setActiveTool('pencil')}
          title="Lápiz / Marcador"
        >
          <Pencil size={18} />
        </button>
        <button
          className={`glass-button ${activeTool === 'eraser' ? 'active' : ''}`}
          onClick={() => setActiveTool('eraser')}
          title="Borrador"
        >
          <Eraser size={18} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Insertar Figuras Geométricas y Texto */}
      <div className="tool-group">
        <button
          className="glass-button"
          onClick={() => onAddShape('rectangle')}
          title="Insertar Rectángulo"
        >
          <Square size={18} />
        </button>
        <button
          className="glass-button"
          onClick={() => onAddShape('circle')}
          title="Insertar Círculo"
        >
          <Circle size={18} />
        </button>
        <button
          className="glass-button"
          onClick={() => onAddShape('line')}
          title="Insertar Línea"
        >
          <Minus size={18} />
        </button>
        <button
          className="glass-button"
          onClick={() => onAddShape('arrow')}
          title="Insertar Flecha"
        >
          <ArrowUpRight size={18} />
        </button>
        <button
          className="glass-button"
          onClick={() => onAddShape('text')}
          title="Insertar Texto"
        >
          <Type size={18} />
        </button>

        {/* Carga de Imagen Base64 */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          style={{ display: 'none' }}
        />
        <button
          className="glass-button"
          onClick={() => fileInputRef.current?.click()}
          title="Cargar Imagen (Gráfico / Matemáticas)"
        >
          <ImageIcon size={18} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Paleta de Colores */}
      <div className="color-palette">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            className={`color-swatch ${color === c ? 'selected' : ''}`}
            style={{ backgroundColor: c }}
            onClick={() => setColor(c)}
          />
        ))}
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="color-picker-custom"
          title="Color Personalizado"
        />
      </div>

      <div className="toolbar-divider" />

      {/* Grosor de Trazo / Borrador */}
      <div className="size-slider-container" title="Grosor de Trazo / Borrador">
        <span className="slider-label">{brushSize}px</span>
        <input
          type="range"
          min="2"
          max="60"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="brush-slider"
        />
      </div>

      <div className="toolbar-divider" />

      {/* Control de Zoom & Acciones de Limpieza / Deshacer */}
      <div className="tool-group">
        <button className="glass-button" onClick={onZoomOut} title="Alejar Zoom">
          <ZoomOut size={16} />
        </button>
        <span className="zoom-text" onClick={onResetZoom} title="Restablecer Zoom">
          {Math.round(zoomLevel * 100)}%
        </span>
        <button className="glass-button" onClick={onZoomIn} title="Acercar Zoom">
          <ZoomIn size={16} />
        </button>
        <button className="glass-button" onClick={onUndo} title="Deshacer último cambio (Undo)">
          <Undo2 size={16} />
        </button>
        <button className="glass-button danger" onClick={onDeleteSelected} title="Eliminar Objeto Seleccionado">
          <Trash2 size={16} />
        </button>
        <button className="glass-button danger" onClick={onClearCanvas} title="Limpiar Lienzo Completo">
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}
