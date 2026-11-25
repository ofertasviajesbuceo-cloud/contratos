import React, { useEffect, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';

interface SignaturePadCanvasProps {
  onChange: (dataUrl: string) => void;
}

export const SignaturePadCanvas: React.FC<SignaturePadCanvasProps> = ({ onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasStrokeRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawing, setHasDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 480;
    canvas.height = 170;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = '#0f172a';
  }, []);

  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const emitSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokeRef.current) {
      onChange('');
      return;
    }
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 360;
    exportCanvas.height = 128;
    const exportCtx = exportCanvas.getContext('2d');
    if (exportCtx) {
      exportCtx.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height);
      onChange(exportCanvas.toDataURL('image/png'));
    } else {
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    const pt = getCoords(e);
    drawingRef.current = true;
    hasStrokeRef.current = true;
    setHasDrawing(true);
    lastPointRef.current = pt;

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 1.4, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const prev = lastPointRef.current;
    if (!canvas || !ctx || !prev) return;
    const pt = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPointRef.current = pt;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture already released
    }
    emitSignature();
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasStrokeRef.current = false;
    setHasDrawing(false);
    onChange('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-700">
          Dibuja tu firma dentro del recuadro
        </span>
        <button
          type="button"
          onClick={handleClear}
          disabled={!hasDrawing}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md disabled:opacity-40"
        >
          <Eraser className="w-3.5 h-3.5" aria-hidden="true" />
          Borrar firma
        </button>
      </div>
      <div className="relative border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          data-testid="signature-pad-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-40 touch-none cursor-crosshair block"
        />
        {!hasDrawing && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">
            Firma aquí con el ratón, trackpad o el dedo
          </div>
        )}
      </div>
    </div>
  );
};
