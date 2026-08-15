"use client";
import { useState } from "react";
import { Flag, ShoppingBag, X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useGolfProducts, money } from "@/lib/golf";

export default function GolfShop() {
  const { products, loading } = useGolfProducts();
  const [selected, setSelected] = useState(null);

  return (
    <div className="pb-8">
      <div className="px-5 pt-5 pb-3">
        <h1 className="text-white text-2xl font-bold font-display flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-lime-300" /> The Shop
        </h1>
        <p className="text-amber-50/70 text-sm mt-1">Yard$ Golf apparel, gear & accessories</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 text-lime-300 animate-spin" /></div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 px-6">
          <Flag className="w-12 h-12 text-amber-50/20 mx-auto mb-3" />
          <p className="text-amber-50/70 text-sm">No products yet — the shop is being stocked. Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4">
          {products.map((p) => (
            <button key={p.id} onClick={() => setSelected(p)} className="text-left rounded-2xl overflow-hidden golf-card active:scale-[0.98] transition">
              {p.images?.[0] ? (
                <img src={p.images[0]} alt={p.name} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-emerald-900/60 flex items-center justify-center"><Flag className="w-8 h-8 text-amber-50/30" /></div>
              )}
              <div className="p-3">
                <p className="text-white text-sm font-semibold leading-tight">{p.name}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-lime-300 font-bold">{money(p.price_cents)}</p>
                  {!p.in_stock && <span className="text-[10px] text-amber-200/70 bg-amber-900/40 px-2 py-0.5 rounded-full">Sold out</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && <ProductDetail product={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ProductDetail({ product, onClose }) {
  const [imgIdx, setImgIdx] = useState(0);
  const images = product.images?.length ? product.images : [];

  return (
    <div className="fixed inset-0 z-[700] flex items-end sm:items-center justify-center bg-black/70 animate-fade-in" onClick={onClose}>
      <div className="w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up max-h-[92vh] flex flex-col golf-felt" onClick={(e) => e.stopPropagation()}>
        {/* Image */}
        <div className="relative shrink-0">
          {images.length > 0 ? (
            <img src={images[imgIdx]} alt={product.name} className="w-full h-64 object-cover" />
          ) : (
            <div className="w-full h-64 bg-emerald-900/60 flex items-center justify-center"><Flag className="w-12 h-12 text-amber-50/30" /></div>
          )}
          <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center">
            <X className="w-5 h-5 text-white" />
          </button>
          {images.length > 1 && (
            <>
              <button onClick={() => setImgIdx((imgIdx - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center">
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button onClick={() => setImgIdx((imgIdx + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center">
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {images.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === imgIdx ? "w-4 bg-lime-300" : "w-1.5 bg-white/50"}`} />)}
              </div>
            </>
          )}
        </div>

        {/* Details */}
        <div className="p-5 overflow-y-auto flex-1">
          {product.category && <span className="inline-block text-[11px] text-lime-300 bg-emerald-900/50 px-2.5 py-0.5 rounded-full mb-2 uppercase tracking-wide">{product.category}</span>}
          <h2 className="text-white text-xl font-bold font-display">{product.name}</h2>
          <p className="text-lime-300 text-2xl font-bold mt-1">{money(product.price_cents)}</p>
          {product.description && <p className="text-amber-50/85 text-sm mt-3 leading-relaxed whitespace-pre-wrap">{product.description}</p>}
        </div>

        {/* Buy button — purchasing wired in next build */}
        <div className="p-5 pt-3 border-t border-lime-200/15 shrink-0">
          {product.in_stock ? (
            <button
              onClick={() => alert("Checkout is coming soon! Purchasing will be enabled shortly.")}
              className="w-full py-3.5 rounded-xl font-bold text-emerald-950 shadow-lg transition active:scale-[0.99]"
              style={{ background: "linear-gradient(135deg, #a3e635, #84cc16)" }}
            >
              Buy Now — {money(product.price_cents)}
            </button>
          ) : (
            <button disabled className="w-full py-3.5 rounded-xl font-bold bg-stone-700 text-stone-400">Sold Out</button>
          )}
          <p className="text-center text-amber-50/50 text-[11px] mt-2">Secure checkout powered by Stripe</p>
        </div>
      </div>
    </div>
  );
}
