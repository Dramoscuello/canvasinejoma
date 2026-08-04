import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import * as fabric from 'fabric';

const CanvasWorkspace = forwardRef(({
  activeTool,
  color,
  brushSize,
  isTeacher,
  onCanvasChange,
  initialData,
  onZoomChange
}, ref) => {
  const containerRef = useRef(null);
  const canvasElementRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const isSyncingRef = useRef(false);

  // Estado para el cursor borrador visual circular
  const [eraserCursor, setEraserCursor] = useState({ x: 0, y: 0, visible: false });

  // Inicializar Fabric Canvas
  useEffect(() => {
    if (!canvasElementRef.current || !containerRef.current) return;

    let canvas = null;
    try {
      const width = containerRef.current.clientWidth || window.innerWidth;
      const height = containerRef.current.clientHeight || window.innerHeight;

      canvas = new fabric.Canvas(canvasElementRef.current, {
        width,
        height,
        backgroundColor: '#ffffff',
        isDrawingMode: activeTool === 'pencil' || activeTool === 'eraser',
        selection: isTeacher && activeTool === 'select'
      });

      fabricCanvasRef.current = canvas;

      // Pincel Inicial
      const brush = new fabric.PencilBrush(canvas);
      brush.color = color || '#0f172a';
      brush.width = Number(brushSize) || 4;
      canvas.freeDrawingBrush = brush;
    } catch (err) {
      console.error('Error inicializando Fabric Canvas:', err);
      return;
    }

    // Redimensionamiento dinámico
    const handleResize = () => {
      try {
        if (containerRef.current && fabricCanvasRef.current) {
          fabricCanvasRef.current.setDimensions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight
          });
          fabricCanvasRef.current.renderAll();
        }
      } catch (e) {
        console.warn('Error en resize canvas:', e);
      }
    };
    window.addEventListener('resize', handleResize);

    // --- ARRASTRE NATIVO DEL LIENZO (PANNING CON relativePan) ---
    let isPanning = false;
    let lastPosX = 0;
    let lastPosY = 0;

    canvas.on('mouse:down', (opt) => {
      const evt = opt.e;
      // Iniciar panning si se presiona la tecla Alt, Espacio o clic en fondo vacío en modo selección
      if (evt.altKey || evt.shiftKey || (activeTool === 'select' && !opt.target)) {
        isPanning = true;
        canvas.selection = false;
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
        canvas.defaultCursor = 'grabbing';
      }
    });

    canvas.on('mouse:move', (opt) => {
      if (isPanning && fabricCanvasRef.current) {
        const evt = opt.e;
        const delta = new fabric.Point(evt.clientX - lastPosX, evt.clientY - lastPosY);
        fabricCanvasRef.current.relativePan(delta);
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
      }
    });

    canvas.on('mouse:up', () => {
      if (isPanning) {
        isPanning = false;
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.defaultCursor = activeTool === 'select' ? 'grab' : 'default';
          if (activeTool === 'select' && isTeacher) {
            fabricCanvasRef.current.selection = true;
          }
        }
      }
    });

    // Transmitir cambios en tiempo real
    const emitChange = () => {
      if (!isTeacher || isSyncingRef.current || !fabricCanvasRef.current) return;
      try {
        const json = fabricCanvasRef.current.toJSON();
        if (onCanvasChange) {
          onCanvasChange(json);
        }
      } catch (e) {
        console.error('Error emitiendo cambio de lienzo:', e);
      }
    };

    canvas.on('object:added', emitChange);
    canvas.on('object:modified', emitChange);
    canvas.on('object:removed', emitChange);
    canvas.on('path:created', emitChange);

    // Zoom con la rueda del ratón
    canvas.on('mouse:wheel', (opt) => {
      try {
        const delta = opt.e.deltaY;
        let zoom = canvas.getZoom();
        zoom *= 0.999 ** delta;
        if (zoom > 5) zoom = 5;
        if (zoom < 0.2) zoom = 0.2;
        canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
        opt.e.preventDefault();
        opt.e.stopPropagation();
        if (onZoomChange) onZoomChange(zoom);
      } catch (e) {
        console.warn('Error en zoom:', e);
      }
    });

    if (initialData) {
      isSyncingRef.current = true;
      try {
        canvas.loadFromJSON(initialData).then(() => {
          canvas.renderAll();
          isSyncingRef.current = false;
        });
      } catch (e) {
        isSyncingRef.current = false;
      }
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      try {
        canvas.dispose();
      } catch (e) {
        console.warn('Error al destruir canvas:', e);
      }
    };
  }, []);

  // Manejar posición del puntero para el Círculo de Borrador
  const handleContainerMouseMove = (e) => {
    if (activeTool === 'eraser' && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setEraserCursor({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        visible: true
      });
    } else if (eraserCursor.visible) {
      setEraserCursor((prev) => ({ ...prev, visible: false }));
    }
  };

  const handleContainerMouseLeave = () => {
    if (eraserCursor.visible) {
      setEraserCursor((prev) => ({ ...prev, visible: false }));
    }
  };

  // Actualizar herramienta activa (Lápiz, Borrador, Selección)
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    try {
      if (!isTeacher) {
        canvas.isDrawingMode = false;
        canvas.selection = false;
        canvas.defaultCursor = 'default';
        canvas.forEachObject((obj) => {
          obj.selectable = false;
          obj.evented = false;
        });
        canvas.renderAll();
        return;
      }

      if (activeTool === 'pencil') {
        canvas.isDrawingMode = true;
        canvas.selection = false;
        canvas.defaultCursor = 'crosshair';
        const pencil = new fabric.PencilBrush(canvas);
        pencil.color = color || '#0f172a';
        pencil.width = Number(brushSize) || 4;
        canvas.freeDrawingBrush = pencil;
      } else if (activeTool === 'eraser') {
        canvas.isDrawingMode = true;
        canvas.selection = false;
        canvas.defaultCursor = 'none'; // Ocultar cursor para mostrar el círculo punteado
        const eraser = new fabric.PencilBrush(canvas);
        eraser.color = '#ffffff';
        eraser.width = (Number(brushSize) || 4) * 3;
        canvas.freeDrawingBrush = eraser;
      } else if (activeTool === 'select') {
        canvas.isDrawingMode = false;
        canvas.selection = true;
        canvas.defaultCursor = 'grab';
        canvas.forEachObject((obj) => {
          obj.selectable = true;
          obj.evented = true;
        });
      } else {
        canvas.isDrawingMode = false;
        canvas.selection = false;
        canvas.defaultCursor = 'default';
      }

      canvas.renderAll();
    } catch (err) {
      console.error('Error configurando pincel/herramienta:', err);
    }
  }, [activeTool, color, brushSize, isTeacher]);

  // Métodos expuestos al componente Padre
  useImperativeHandle(ref, () => ({
    addShape: (shapeType) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !isTeacher) return;

      try {
        const center = canvas.getVpCenter();
        let shape = null;

        const currentStroke = color || '#0f172a';
        const currentWidth = Number(brushSize) || 3;

        if (shapeType === 'rectangle') {
          shape = new fabric.Rect({
            left: center.x - 75,
            top: center.y - 50,
            width: 150,
            height: 100,
            fill: 'transparent',
            stroke: currentStroke,
            strokeWidth: currentWidth,
            rx: 8,
            ry: 8
          });
        } else if (shapeType === 'circle') {
          shape = new fabric.Circle({
            left: center.x - 50,
            top: center.y - 50,
            radius: 50,
            fill: 'transparent',
            stroke: currentStroke,
            strokeWidth: currentWidth
          });
        } else if (shapeType === 'line') {
          shape = new fabric.Line([center.x - 100, center.y, center.x + 100, center.y], {
            stroke: currentStroke,
            strokeWidth: currentWidth
          });
        } else if (shapeType === 'arrow') {
          const line = new fabric.Line([center.x - 80, center.y, center.x + 80, center.y], {
            stroke: currentStroke,
            strokeWidth: currentWidth
          });
          const triangle = new fabric.Triangle({
            left: center.x + 80,
            top: center.y,
            angle: 90,
            width: currentWidth * 4,
            height: currentWidth * 4,
            fill: currentStroke,
            originX: 'center',
            originY: 'center'
          });
          shape = new fabric.Group([line, triangle]);
        } else if (shapeType === 'text') {
          shape = new fabric.IText('Haz doble clic para editar...', {
            left: center.x - 100,
            top: center.y - 15,
            fill: currentStroke,
            fontSize: 24,
            fontFamily: 'Inter'
          });
        }

        if (shape) {
          canvas.add(shape);
          canvas.setActiveObject(shape);
          canvas.renderAll();
        }
      } catch (err) {
        console.error('Error insertando figura:', err);
      }
    },

    addImage: (base64Data) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !isTeacher) return;

      try {
        fabric.FabricImage.fromURL(base64Data).then((img) => {
          const center = canvas.getVpCenter();
          img.set({
            left: center.x - (img.width || 200) / 4,
            top: center.y - (img.height || 200) / 4,
            scaleX: 0.5,
            scaleY: 0.5
          });
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();
        });
      } catch (err) {
        console.error('Error cargando imagen:', err);
      }
    },

    clearAll: () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !isTeacher) return;
      try {
        canvas.clear();
        canvas.backgroundColor = '#ffffff';
        canvas.renderAll();
        if (onCanvasChange) {
          onCanvasChange(canvas.toJSON());
        }
      } catch (err) {
        console.error('Error al limpiar el lienzo:', err);
      }
    },

    deleteSelected: () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !isTeacher) return;
      try {
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects && activeObjects.length > 0) {
          activeObjects.forEach((obj) => canvas.remove(obj));
          canvas.discardActiveObject();
          canvas.renderAll();
        }
      } catch (err) {
        console.error('Error eliminando objeto seleccionado:', err);
      }
    },

    exportPNG: () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      try {
        const dataURL = canvas.toDataURL({
          format: 'png',
          quality: 1,
          multiplier: 2
        });
        const link = document.createElement('a');
        link.download = `canva_inejoma_${Date.now()}.png`;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error('Error exportando PNG:', err);
      }
    },

    loadRemoteJSON: (json) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !json) return;
      isSyncingRef.current = true;
      try {
        canvas.loadFromJSON(json).then(() => {
          if (!isTeacher) {
            canvas.forEachObject((obj) => {
              obj.selectable = false;
              obj.evented = false;
            });
          }
          canvas.renderAll();
          isSyncingRef.current = false;
        });
      } catch (err) {
        isSyncingRef.current = false;
      }
    },

    setZoomLevel: (zoom) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      try {
        const center = canvas.getVpCenter();
        canvas.zoomToPoint({ x: center.x, y: center.y }, zoom);
        if (onZoomChange) onZoomChange(zoom);
      } catch (err) {
        console.error('Error ajustando zoom:', err);
      }
    },

    toJSON: () => {
      return fabricCanvasRef.current?.toJSON();
    }
  }));

  const eraserDiameter = (Number(brushSize) || 4) * 3;

  return (
    <div
      className="canvas-workspace-container"
      ref={containerRef}
      onMouseMove={handleContainerMouseMove}
      onMouseLeave={handleContainerMouseLeave}
    >
      <canvas ref={canvasElementRef} />

      {/* Círculo Indicador del Borrador */}
      {activeTool === 'eraser' && eraserCursor.visible && (
        <div
          style={{
            position: 'absolute',
            left: `${eraserCursor.x}px`,
            top: `${eraserCursor.y}px`,
            width: `${eraserDiameter}px`,
            height: `${eraserDiameter}px`,
            borderRadius: '50%',
            border: '1.5px dashed #4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.12)',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 999
          }}
        />
      )}
    </div>
  );
});

export default CanvasWorkspace;
