"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";

const MIN = 1;
const MAX = 6;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Full-screen zoomable image viewer.
 *
 * Touch handling uses NATIVE listeners registered with { passive: false }.
 * React attaches touch handlers passively, so calling preventDefault() from an
 * onTouchMove prop is ignored and the page scrolls instead of panning. Pointer
 * events + setPointerCapture also drop the second finger on mobile Safari,
 * which is why this doesn't use them.
 */
export default function ImageZoom({ images = [], index = 0, onClose, caption }) {
  const [i, setI] = useState(index);
  const [t, setT] = useState({ scale: 1, x: 0, y: 0 });

  const stageRef = useRef(null);
  const imgRef = useRef(null);
  const tRef = useRef(t);
  const baseSize = useRef({ w: 0, h: 0 });
  const pinch = useRef(null);
  const pan = useRef(null);
  const lastTap = useRef(0);
  const [animate, setAnimate] = useState(true);

  const apply = useCallback((next, smooth = false) => {
    setAnimate(smooth);
    tRef.current = next;
    setT(next);
  }, []);

  const reset = useCallback(() => apply({ scale: 1, x: 0, y: 0 }, true), [apply]);

  // Keep panning within the image bounds so it can't be flung off screen
  const clampXY = useCallback((x, y, scale) => {
    const stage = stageRef.current;
    const { w, h } = baseSize.current;
    if (!stage || !w || !h) return { x, y };
    const maxX = Math.max(0, (w * scale - stage.clientWidth) / 2);
    const maxY = Math.max(0, (h * scale - stage.clientHeight) / 2);
    return { x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
  }, []);

  const zoomTo = useCallback((nextScale, centerX = 0, centerY = 0, smooth = false) => {
    const cur = tRef.current;
    const s = clamp(nextScale, MIN, MAX);
    // keep the point under the fingers anchored
    const nx = centerX - (centerX - cur.x) * (s / cur.scale);
    const ny = centerY - (centerY - cur.y) * (s / cur.scale);
    const { x, y } = s <= 1 ? { x: 0, y: 0 } : clampXY(nx, ny, s);
    apply({ scale: s, x, y }, smooth);
  }, [apply, clampXY]);

  useEffect(() => { reset(); }, [i, reset]);

  // Record the on-screen size of the image at scale 1 for clamping
  const onImgLoad = () => {
    const el = imgRef.current;
    if (el) baseSize.current = { w: el.clientWidth, h: el.clientHeight };
  };

  // Lock page scroll while open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  // ─── Native touch + wheel handlers ───
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const centerOf = (x, y) => {
      const r = stage.getBoundingClientRect();
      return { cx: x - (r.left + r.width / 2), cy: y - (r.top + r.height / 2) };
    };

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        const [a, b] = e.touches;
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1;
        const midX = (a.clientX + b.clientX) / 2;
        const midY = (a.clientY + b.clientY) / 2;
        const { cx, cy } = centerOf(midX, midY);
        pinch.current = { dist, scale: tRef.current.scale, cx, cy };
        pan.current = null;
      } else if (e.touches.length === 1) {
        const touch = e.touches[0];
        pan.current = { x: touch.clientX - tRef.current.x, y: touch.clientY - tRef.current.y };

        const now = Date.now();
        if (now - lastTap.current < 300) {
          const { cx, cy } = centerOf(touch.clientX, touch.clientY);
          zoomTo(tRef.current.scale > 1.2 ? 1 : 2.5, cx, cy, true);
          lastTap.current = 0;
          pan.current = null;
        } else {
          lastTap.current = now;
        }
      }
    };

    const onTouchMove = (e) => {
      // Must be non-passive for this to take effect
      if (e.touches.length === 2 && pinch.current) {
        e.preventDefault();
        const [a, b] = e.touches;
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const ratio = dist / pinch.current.dist;
        zoomTo(pinch.current.scale * ratio, pinch.current.cx, pinch.current.cy);
      } else if (e.touches.length === 1 && pan.current && tRef.current.scale > 1) {
        e.preventDefault();
        const touch = e.touches[0];
        const { x, y } = clampXY(
          touch.clientX - pan.current.x,
          touch.clientY - pan.current.y,
          tRef.current.scale
        );
        apply({ scale: tRef.current.scale, x, y });
      }
    };

    const onTouchEnd = (e) => {
      if (e.touches.length < 2) pinch.current = null;
      if (e.touches.length === 0) pan.current = null;
      else if (e.touches.length === 1) {
        const touch = e.touches[0];
        pan.current = { x: touch.clientX - tRef.current.x, y: touch.clientY - tRef.current.y };
      }
      // snap back if they pinched below 1
      if (tRef.current.scale < 1.02 && tRef.current.scale !== 1) reset();
    };

    const onWheel = (e) => {
      e.preventDefault();
      const { cx, cy } = centerOf(e.clientX, e.clientY);
      zoomTo(tRef.current.scale * (e.deltaY < 0 ? 1.12 : 0.89), cx, cy);
    };

    stage.addEventListener("touchstart", onTouchStart, { passive: false });
    stage.addEventListener("touchmove", onTouchMove, { passive: false });
    stage.addEventListener("touchend", onTouchEnd, { passive: false });
    stage.addEventListener("touchcancel", onTouchEnd, { passive: false });
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      stage.removeEventListener("touchstart", onTouchStart);
      stage.removeEventListener("touchmove", onTouchMove);
      stage.removeEventListener("touchend", onTouchEnd);
      stage.removeEventListener("touchcancel", onTouchEnd);
      stage.removeEventListener("wheel", onWheel);
    };
  }, [apply, clampXY, zoomTo, reset]);

  // Mouse drag for desktop
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let dragging = null;
    const down = (e) => {
      if (tRef.current.scale <= 1) return;
      dragging = { x: e.clientX - tRef.current.x, y: e.clientY - tRef.current.y };
    };
    const move = (e) => {
      if (!dragging) return;
      const { x, y } = clampXY(e.clientX - dragging.x, e.clientY - dragging.y, tRef.current.scale);
      apply({ scale: tRef.current.scale, x, y });
    };
    const up = () => { dragging = null; };
    stage.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      stage.removeEventListener("mousedown", down);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [apply, clampXY]);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowRight") setI((v) => Math.min(images.length - 1, v + 1));
      if (e.key === "ArrowLeft") setI((v) => Math.max(0, v - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, onClose]);

  if (!images.length) return null;
  const multi = images.length > 1;

  return (
    <div className="fixed inset-0 z-[900] bg-black/95 flex flex-col animate-fade-in" style={{ touchAction: "none" }}>
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <span className="text-white/70 text-xs font-medium">
          {multi ? `${i + 1} / ${images.length}` : caption || "Rules reference"}
        </span>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition" aria-label="Close">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      <div
        ref={stageRef}
        className="flex-1 overflow-hidden flex items-center justify-center select-none"
        style={{ touchAction: "none", cursor: t.scale > 1 ? "grab" : "auto" }}
      >
        <img
          ref={imgRef}
          src={images[i]}
          alt={caption || `Reference ${i + 1}`}
          draggable={false}
          onLoad={onImgLoad}
          className="max-w-full max-h-full object-contain"
          style={{
            transform: `translate3d(${t.x}px, ${t.y}px, 0) scale(${t.scale})`,
            transition: animate ? "transform 0.2s ease-out" : "none",
            willChange: "transform",
          }}
        />
      </div>

      <div className="shrink-0 px-4 py-4 flex items-center justify-center gap-2">
        {multi && (
          <button onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0}
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-30 flex items-center justify-center transition" aria-label="Previous">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        )}
        <button onClick={() => zoomTo(t.scale - 0.5, 0, 0, true)} disabled={t.scale <= MIN}
          className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-30 flex items-center justify-center transition" aria-label="Zoom out">
          <ZoomOut className="w-5 h-5 text-white" />
        </button>
        <button onClick={reset} className="px-4 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-medium flex items-center gap-1.5 transition">
          <RotateCcw className="w-4 h-4" /> {Math.round(t.scale * 100)}%
        </button>
        <button onClick={() => zoomTo(t.scale + 0.5, 0, 0, true)} disabled={t.scale >= MAX}
          className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-30 flex items-center justify-center transition" aria-label="Zoom in">
          <ZoomIn className="w-5 h-5 text-white" />
        </button>
        {multi && (
          <button onClick={() => setI((v) => Math.min(images.length - 1, v + 1))} disabled={i === images.length - 1}
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-30 flex items-center justify-center transition" aria-label="Next">
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
