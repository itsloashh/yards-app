"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";

const MIN = 1;
const MAX = 5;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Full-screen zoomable image viewer.
 * Pinch to zoom, drag to pan, double-tap to toggle, or use the buttons.
 * Pass an array of image URLs and the index to open at.
 */
export default function ImageZoom({ images = [], index = 0, onClose, caption }) {
  const [i, setI] = useState(index);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  const pointers = useRef(new Map());
  const pinch = useRef(null);
  const panStart = useRef(null);
  const lastTap = useRef(0);

  const reset = useCallback(() => { setScale(1); setTx(0); setTy(0); }, []);

  // Reset zoom whenever we move to another image
  useEffect(() => { reset(); }, [i, reset]);

  // Lock background scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Esc to close, arrows to page
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowRight") setI((v) => Math.min(images.length - 1, v + 1));
      if (e.key === "ArrowLeft") setI((v) => Math.max(0, v - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, onClose]);

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1) {
      panStart.current = { x: e.clientX - tx, y: e.clientY - ty };

      // double-tap toggles zoom
      const now = Date.now();
      if (now - lastTap.current < 280) {
        if (scale > 1) reset();
        else setScale(2.5);
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, scale };
    }
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const next = clamp(pinch.current.scale * (dist / pinch.current.dist), MIN, MAX);
      setScale(next);
      if (next <= 1.01) { setTx(0); setTy(0); }
    } else if (pointers.current.size === 1 && scale > 1 && panStart.current) {
      setTx(e.clientX - panStart.current.x);
      setTy(e.clientY - panStart.current.y);
    }
  };

  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 1) {
      const p = [...pointers.current.values()][0];
      panStart.current = { x: p.x - tx, y: p.y - ty };
    }
  };

  const zoomBy = (delta) => {
    setScale((s) => {
      const next = clamp(s + delta, MIN, MAX);
      if (next <= 1.01) { setTx(0); setTy(0); }
      return next;
    });
  };

  if (!images.length) return null;
  const multi = images.length > 1;

  return (
    <div className="fixed inset-0 z-[900] bg-black/95 flex flex-col animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <span className="text-white/70 text-xs font-medium">
          {multi ? `${i + 1} / ${images.length}` : caption || "Rules reference"}
        </span>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Image stage */}
      <div
        className="flex-1 overflow-hidden flex items-center justify-center select-none"
        style={{ touchAction: "none", cursor: scale > 1 ? "grab" : "auto" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <img
          src={images[i]}
          alt={caption || `Reference ${i + 1}`}
          draggable={false}
          className="max-w-full max-h-full object-contain"
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transition: pointers.current.size ? "none" : "transform 0.18s ease-out",
          }}
        />
      </div>

      {/* Controls */}
      <div className="shrink-0 px-4 py-4 flex items-center justify-center gap-2">
        {multi && (
          <button
            onClick={() => setI((v) => Math.max(0, v - 1))}
            disabled={i === 0}
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-30 flex items-center justify-center transition"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        )}
        <button onClick={() => zoomBy(-0.5)} disabled={scale <= MIN}
          className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-30 flex items-center justify-center transition" aria-label="Zoom out">
          <ZoomOut className="w-5 h-5 text-white" />
        </button>
        <button onClick={reset}
          className="px-4 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-medium flex items-center gap-1.5 transition">
          <RotateCcw className="w-4 h-4" /> {Math.round(scale * 100)}%
        </button>
        <button onClick={() => zoomBy(0.5)} disabled={scale >= MAX}
          className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-30 flex items-center justify-center transition" aria-label="Zoom in">
          <ZoomIn className="w-5 h-5 text-white" />
        </button>
        {multi && (
          <button
            onClick={() => setI((v) => Math.min(images.length - 1, v + 1))}
            disabled={i === images.length - 1}
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-30 flex items-center justify-center transition"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      <p className="text-center text-white/40 text-[11px] pb-4 shrink-0">
        Pinch or double-tap to zoom · drag to move
      </p>
    </div>
  );
}
