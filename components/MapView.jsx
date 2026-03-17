"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, AlertCircle, X, ChevronLeft } from "lucide-react";
import { useApp } from "@/lib/AppContext";

export default function MapView({ sales }) {
  const router = useRouter();
  const { loc, dist } = useApp();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState(null);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const L = require("leaflet");

    const center = loc ? [loc.lat, loc.lng] : [42.3149, -83.0364];
    const zoom = dist <= 2 ? 15 : dist <= 5 ? 14 : dist <= 10 ? 13 : dist <= 25 ? 12 : 11;

    try {
      const map = L.map(mapRef.current, { center, zoom, attributionControl: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

      if (loc) {
        const userIcon = L.divIcon({
          className: "",
          html: `<div style="position:relative"><div class="user-marker"></div><div class="user-marker-pulse"></div></div>`,
          iconSize: [20, 20], iconAnchor: [10, 10],
        });
        L.marker([loc.lat, loc.lng], { icon: userIcon, interactive: false }).addTo(map);
        L.circle([loc.lat, loc.lng], {
          radius: dist * 1609.34, color: "#059669", weight: 2, opacity: 0.3,
          fillColor: "#059669", fillOpacity: 0.04, dashArray: "8, 6",
        }).addTo(map);
      }

      mapInstance.current = map;
      setReady(true);
      setTimeout(() => map.invalidateSize(), 100);
    } catch (e) {
      setError(true);
    }

    return () => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; setReady(false); }
    };
  }, [loc]);

  // Update zoom
  useEffect(() => {
    if (!mapInstance.current) return;
    const zoom = dist <= 2 ? 15 : dist <= 5 ? 14 : dist <= 10 ? 13 : dist <= 25 ? 12 : 11;
    mapInstance.current.setZoom(zoom);
  }, [dist]);

  // Add markers
  useEffect(() => {
    if (!mapInstance.current || !ready) return;
    const L = require("leaflet");
    const map = mapInstance.current;

    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    sales.forEach((sale, i) => {
      const icon = L.divIcon({
        className: "sale-marker",
        html: `<div style="animation:dropPin 0.4s ease-out ${i * 0.06}s both">
          <div class="sale-marker-inner">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div class="sale-marker-arrow"></div>
        </div>`,
        iconSize: [40, 52], iconAnchor: [20, 52], popupAnchor: [0, -52],
      });

      const marker = L.marker([sale.coords.lat, sale.coords.lng], { icon });

      const popup = `<div style="padding:12px;min-width:180px;font-family:inherit;">
        <div style="font-weight:700;font-size:13px;color:#1c1917;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;">${sale.title}</div>
        ${sale.address ? `<div style="font-size:11px;color:#059669;margin-bottom:2px;">📍 ${sale.address}</div>` : ""}
        <div style="font-size:11px;color:#059669;font-weight:600;">${sale.distanceText || ""} · ${sale.date}</div>
        <div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap;">
          ${(sale.tags || []).slice(0, 3).map(t => `<span style="padding:2px 8px;background:#f5f5f4;border-radius:99px;font-size:10px;color:#57534e;">${t}</span>`).join("")}
        </div>
      </div>`;

      marker.bindPopup(popup, { closeButton: false });
      marker.on("click", () => setSelected(sale));
      marker.addTo(map);
      markersRef.current.push(marker);
    });
  }, [sales, ready]);

  return (
    <div className="relative h-full" style={{ minHeight: "calc(100dvh - 260px)" }}>
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {!ready && !error && (
        <div className="absolute inset-0 bg-yard-50 flex items-center justify-center z-10">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-yard-500 animate-spin mx-auto mb-2" />
            <p className="text-yard-700 font-medium text-sm">Loading map…</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 bg-stone-50 flex items-center justify-center z-10">
          <div className="text-center p-6">
            <AlertCircle className="w-10 h-10 text-stone-400 mx-auto mb-3" />
            <p className="text-stone-600 font-medium">Map couldn't load</p>
          </div>
        </div>
      )}

      {/* Legend — bottom left, above bottom sheet area */}
      <div className="absolute bottom-4 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 shadow-md z-[400]">
        <p className="text-[11px] font-semibold text-yard-600">{sales.length} sale{sales.length !== 1 ? "s" : ""} nearby</p>
      </div>

      {/* Bottom sheet */}
      {selected && (
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-[500] p-4 animate-slide-up">
          <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto mb-3" />
          <div className="flex gap-3 items-start cursor-pointer" onClick={() => router.push(`/sale/${selected.id}`)}>
            <img src={selected.photos?.[0]} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-stone-800 text-sm truncate">{selected.title}</h3>
              {selected.address && <p className="text-yard-600 text-xs font-medium mt-0.5">📍 {selected.address}</p>}
              <p className="text-stone-500 text-xs mt-0.5">{selected.distanceText} · {selected.date}</p>
            </div>
            <ChevronLeft className="w-5 h-5 text-stone-400 rotate-180 shrink-0 mt-1" />
          </div>
          <button onClick={() => setSelected(null)} className="absolute top-3 right-3 p-1 hover:bg-stone-100 rounded-full">
            <X className="w-4 h-4 text-stone-400" />
          </button>
        </div>
      )}
    </div>
  );
}
