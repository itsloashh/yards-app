"use client";
import { useState, useRef, useEffect } from "react";
import { X, Link2, Download, Share2, Check, Loader2, Image as ImageIcon, Instagram } from "lucide-react";

// Generates a branded shareable card on a canvas + provides link sharing.
// Card layout: sale photo (top), dark gradient, title/date/location, Yard$ branding.
export default function ShareModal({ sale, onClose }) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [cardUrl, setCardUrl] = useState(null);
  const [generating, setGenerating] = useState(true);

  const saleUrl = typeof window !== "undefined" ? `${window.location.origin}/sale/${sale.id}` : `https://shopyards.ca/sale/${sale.id}`;

  // ─── Build the branded card on a canvas ───
  useEffect(() => {
    let cancelled = false;

    const draw = async () => {
      setGenerating(true);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");

      // Card dimensions — 1080x1350 (Instagram portrait 4:5)
      const W = 1080, H = 1350;
      canvas.width = W;
      canvas.height = H;

      // Background fill (fallback)
      ctx.fillStyle = "#0c0a09";
      ctx.fillRect(0, 0, W, H);

      // Load + draw the sale photo (top ~62% of card)
      const photoH = Math.round(H * 0.62);
      if (sale.photos?.[0]) {
        try {
          const img = await loadImage(sale.photos[0]);
          if (cancelled) return;
          // cover-fit the image into the photo area
          drawCover(ctx, img, 0, 0, W, photoH);
        } catch {
          drawPlaceholder(ctx, W, photoH);
        }
      } else {
        drawPlaceholder(ctx, W, photoH);
      }

      // Gradient under photo into the text zone
      const grad = ctx.createLinearGradient(0, photoH - 200, 0, photoH + 100);
      grad.addColorStop(0, "rgba(12,10,9,0)");
      grad.addColorStop(1, "rgba(12,10,9,1)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, photoH - 200, W, 300);

      // Bottom text zone background
      ctx.fillStyle = "#0c0a09";
      ctx.fillRect(0, photoH, W, H - photoH);

      // ─── Branding: top-left badge ───
      // "YARD$" wordmark pill
      ctx.save();
      const pillX = 40, pillY = 40, pillW = 200, pillH = 64;
      roundRect(ctx, pillX, pillY, pillW, pillH, 32);
      const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY);
      pillGrad.addColorStop(0, "#059669");
      pillGrad.addColorStop(1, "#84cc16");
      ctx.fillStyle = pillGrad;
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 38px system-ui, sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillText("YARD$", pillX + 32, pillY + pillH / 2 + 2);
      ctx.restore();

      // "Featured" badge if boosted
      const boosted = sale.boostedUntil && new Date(sale.boostedUntil).getTime() > Date.now();
      if (boosted) {
        ctx.save();
        const bX = W - 240, bY = 40, bW = 200, bH = 64;
        roundRect(ctx, bX, bY, bW, bH, 32);
        const bGrad = ctx.createLinearGradient(bX, bY, bX + bW, bY);
        bGrad.addColorStop(0, "#d97706");
        bGrad.addColorStop(1, "#f59e0b");
        ctx.fillStyle = bGrad;
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "700 30px system-ui, sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText("★ FEATURED", bX + 26, bY + bH / 2 + 2);
        ctx.restore();
      }

      // ─── Text content ───
      let ty = photoH + 70;
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";

      // Title (wrap to 2 lines max)
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 64px system-ui, sans-serif";
      const titleLines = wrapText(ctx, sale.title || "Yard Sale", W - 80, 2);
      for (const line of titleLines) {
        ctx.fillText(line, 40, ty);
        ty += 74;
      }

      ty += 10;

      // Date
      if (sale.date) {
        ctx.fillStyle = "#84cc16";
        ctx.font = "600 38px system-ui, sans-serif";
        ctx.fillText("📅 " + truncate(sale.date, 38), 40, ty);
        ty += 56;
      }

      // Location
      if (sale.address || sale.city) {
        ctx.fillStyle = "#a8a29e";
        ctx.font = "500 36px system-ui, sans-serif";
        const loc = sale.address || sale.city;
        ctx.fillText("📍 " + truncate(loc, 40), 40, ty);
        ty += 56;
      }

      // ─── Footer CTA ───
      ctx.fillStyle = "#57534e";
      ctx.font = "600 32px system-ui, sans-serif";
      ctx.fillText("Find it live on shopyards.ca", 40, H - 50);

      if (cancelled) return;
      // Export to data URL
      try {
        const url = canvas.toDataURL("image/png");
        setCardUrl(url);
      } catch (e) {
        console.warn("[share] canvas export failed (likely tainted by cross-origin image):", e);
        setCardUrl(null);
      }
      setGenerating(false);
    };

    draw();
    return () => { cancelled = true; };
  }, [sale]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(saleUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: sale.title,
          text: `Check out this yard sale on Yard$: ${sale.title}`,
          url: saleUrl,
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  const downloadCard = () => {
    if (!cardUrl) return;
    const a = document.createElement("a");
    a.href = cardUrl;
    a.download = `yards-${(sale.title || "sale").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
    a.click();
  };

  const shareCard = async () => {
    if (!cardUrl) return;
    try {
      // Convert data URL to a File and share via Web Share API (mobile)
      const res = await fetch(cardUrl);
      const blob = await res.blob();
      const file = new File([blob], "yards-sale.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: sale.title,
          text: `Check out this yard sale on Yard$! ${saleUrl}`,
        });
      } else {
        downloadCard();
      }
    } catch {
      downloadCard();
    }
  };

  return (
    <div className="fixed inset-0 z-[700] flex items-end sm:items-center justify-center bg-black/60 animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="relative px-6 pt-5 pb-4 text-white shrink-0" style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
            <X className="w-4 h-4 text-white" />
          </button>
          <h2 className="text-xl font-bold font-display flex items-center gap-2"><Share2 className="w-5 h-5" /> Share this sale</h2>
          <p className="text-white/85 text-sm mt-0.5">Spread the word and bring more shoppers</p>
        </div>

        <div className="px-5 py-5 overflow-y-auto flex-1">
          {/* Card preview */}
          <div className="rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 mb-4 relative" style={{ aspectRatio: "1080/1350" }}>
            {generating && (
              <div className="absolute inset-0 flex items-center justify-center bg-stone-100 z-10">
                <Loader2 className="w-7 h-7 text-emerald-500 animate-spin" />
              </div>
            )}
            {cardUrl && <img src={cardUrl} alt="Share card preview" className="w-full block" />}
            {/* Hidden working canvas */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Image card actions */}
          <p className="text-stone-500 text-xs font-semibold uppercase tracking-wide mb-2">Post to Instagram / TikTok</p>
          <div className="flex gap-2 mb-5">
            <button onClick={shareCard} disabled={!cardUrl}
              className="flex-1 py-3 text-white font-bold rounded-xl shadow flex items-center justify-center gap-2 disabled:opacity-50 transition"
              style={{ background: "linear-gradient(135deg, #7c3aed, #db2777)" }}>
              <ImageIcon className="w-4 h-4" /> Share Card
            </button>
            <button onClick={downloadCard} disabled={!cardUrl}
              className="px-4 py-3 bg-stone-100 border border-stone-200 text-stone-700 font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-stone-200 transition">
              <Download className="w-4 h-4" /> Save
            </button>
          </div>

          {/* Link actions */}
          <p className="text-stone-500 text-xs font-semibold uppercase tracking-wide mb-2">Share a link</p>
          <div className="flex gap-2">
            <button onClick={shareLink}
              className="flex-1 py-3 text-white font-bold rounded-xl shadow flex items-center justify-center gap-2 transition"
              style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>
              <Share2 className="w-4 h-4" /> Share Link
            </button>
            <button onClick={copyLink}
              className="px-4 py-3 bg-stone-100 border border-stone-200 text-stone-700 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-stone-200 transition">
              {copied ? <><Check className="w-4 h-4 text-emerald-600" /> Copied</> : <><Link2 className="w-4 h-4" /> Copy</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Canvas helpers ───
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // needed so we can export the canvas
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawCover(ctx, img, x, y, w, h) {
  const ir = img.width / img.height;
  const r = w / h;
  let sw, sh, sx, sy;
  if (ir > r) {
    sh = img.height; sw = sh * r; sx = (img.width - sw) / 2; sy = 0;
  } else {
    sw = img.width; sh = sw / r; sx = 0; sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawPlaceholder(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#059669");
  g.addColorStop(1, "#84cc16");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "800 120px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🏷️", w / 2, h / 2);
  ctx.textAlign = "left";
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth, maxLines) {
  const words = (text || "").split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    } else {
      current = test;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  // If text got cut, add ellipsis to last line
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(last + "…").width > maxWidth && last.length > 0) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = last + (words.join(" ").length > lines.join(" ").length ? "…" : "");
  }
  return lines;
}

function truncate(str, max) {
  return str && str.length > max ? str.slice(0, max - 1) + "…" : str;
}
