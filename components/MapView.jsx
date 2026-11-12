"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, AlertCircle, X, ChevronLeft } from "lucide-react";
import { useApp } from "@/lib/AppContext";
import { pinSvgForType } from "@/lib/saleTypes";
import { escapeHtml } from "@/lib/safeHtml";
import { radiusMeters } from "@/lib/saleFilters";
import "leaflet.markercluster/dist/MarkerCluster.css";

// Zoom level that fits the chosen radius (same steps as before, now unit-aware).
function zoomFor(dist, unit) {
  const miles = unit === "km" ? dist / 1.60934 : dist;
  return miles <= 2 ? 15 : miles <= 5 ? 14 : miles <= 10 ? 13 : miles <= 25 ? 12 : 11;
}

// Everything about a sale that changes how its pin or popup looks.
function pinState(sale, now) {
  const startStr = sale.startTime && /^\d{2}:\d{2}/.test(sale.startTime)
    ? `${sale.dateRaw}T${sale.startTime}`
    : `${sale.dateRaw}T00:00`;
  const startMs = sale.dateRaw ? new Date(startStr).getTime() : null;
  const isUpcoming = !!(startMs && startMs > now);
  const minutesLeft = sale.expiresAt ? Math.max(0, Math.floor((sale.expiresAt - now) / 60000)) : null;
  const isUrgent = !isUpcoming && minutesLeft !== null && minutesLeft <= 120 && minutesLeft > 0;
  const isMultiDay = !!(sale.endDateRaw && sale.endDateRaw !== sale.dateRaw);
  const boosted = !!(sale.boostedUntil && new Date(sale.boostedUntil).getTime() > now);
  return { isUpcoming, minutesLeft, isUrgent, isMultiDay, boosted };
}

function pinSignature(sale, st) {
  return [
    sale.coords?.lat, sale.coords?.lng, sale.title, sale.address, sale.date, sale.distanceText,
    (sale.tags || []).slice(0, 3).join("|"), sale.saleType, sale.photos?.[0] || "",
    st.isUpcoming, st.isUrgent, st.isMultiDay, st.boosted,
    st.isUrgent ? (st.minutesLeft < 60 ? st.minutesLeft : Math.floor(st.minutesLeft / 60) + "h") : "",
  ].join("\u0001");
}

export default function MapView({ sales }) {
  const router = useRouter();
  const { loc, dist, unit } = useApp();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const clusterRef = useRef(null);
  const markersRef = useRef(new Map()); // sale id -> { marker, sig, clustered }
  const userMarkerRef = useRef(null);
  const circleRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState(null);

  // Create the map ONCE. (Before, it was torn down and rebuilt every time the
  // location refreshed.)
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const L = require("leaflet");
    require("leaflet.markercluster");

    const center = loc ? [loc.lat, loc.lng] : [42.3149, -83.0364];

    try {
      const map = L.map(mapRef.current, { center, zoom: zoomFor(dist, unit), attributionControl: false });
      L.control.attribution({ prefix: false, position: "bottomright" }).addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
      }).addTo(map);

      // Nearby pins merge into one numbered bubble when zoomed out
      const cluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 46,
        disableClusteringAtZoom: 16,
        spiderfyOnMaxZoom: true,
        iconCreateFunction: (c) => {
          const n = c.getChildCount();
          const size = n < 10 ? 40 : n < 50 ? 46 : 52;
          return L.divIcon({
            className: "",
            html: `<div class="sale-cluster" style="width:${size}px;height:${size}px;">${n}</div>`,
            iconSize: [size, size], iconAnchor: [size / 2, size / 2],
          });
        },
      });
      map.addLayer(cluster);
      clusterRef.current = cluster;

      mapInstance.current = map;
      setReady(true);
      setTimeout(() => map.invalidateSize(), 100);
    } catch (e) {
      console.error("[map] failed to start:", e);
      setError(true);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        clusterRef.current = null;
        userMarkerRef.current = null;
        circleRef.current = null;
        markersRef.current = new Map();
        setReady(false);
      }
    };
  }, []);

  // "You are here" dot + radius circle. Moves in place when location or radius changes.
  useEffect(() => {
    if (!mapInstance.current || !ready) return;
    const L = require("leaflet");
    const map = mapInstance.current;

    if (!loc) return;
    const here = [loc.lat, loc.lng];

    if (!userMarkerRef.current) {
      const userIcon = L.divIcon({
        className: "",
        html: `<div style="position:relative"><div class="user-marker"></div><div class="user-marker-pulse"></div></div>`,
        iconSize: [20, 20], iconAnchor: [10, 10],
      });
      // Sits underneath sale pins so it never covers one
      userMarkerRef.current = L.marker(here, { icon: userIcon, interactive: false, zIndexOffset: -1000 }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng(here);
    }

    const meters = radiusMeters(dist, unit); // null when "Anywhere"
    if (meters === null) {
      if (circleRef.current) { map.removeLayer(circleRef.current); circleRef.current = null; }
    } else if (!circleRef.current) {
      circleRef.current = L.circle(here, {
        radius: meters, color: "#059669", weight: 2, opacity: 0.3,
        fillColor: "#059669", fillOpacity: 0.04, dashArray: "8, 6", interactive: false,
      }).addTo(map);
    } else {
      circleRef.current.setLatLng(here);
      circleRef.current.setRadius(meters);
    }
  }, [loc, dist, unit, ready]);

  // Re-centre when the location changes (e.g. tapping the location button)
  useEffect(() => {
    if (!mapInstance.current || !ready || !loc) return;
    mapInstance.current.setView([loc.lat, loc.lng], zoomFor(dist, unit));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc, ready]);

  // Update zoom when the radius changes
  useEffect(() => {
    if (!mapInstance.current) return;
    mapInstance.current.setZoom(zoomFor(dist, unit));
  }, [dist, unit]);

  // Pins. Only pins that are new or actually changed are touched — the rest
  // stay put, so a live update no longer makes every pin drop in again.
  useEffect(() => {
    if (!mapInstance.current || !ready || !clusterRef.current) return;
    const L = require("leaflet");
    const map = mapInstance.current;
    const cluster = clusterRef.current;
    const existing = markersRef.current;
    const now = Date.now();

    const removeEntry = (entry) => {
      if (entry.clustered) cluster.removeLayer(entry.marker);
      else map.removeLayer(entry.marker);
    };

    // Remove pins for sales that are no longer in the list
    const wanted = new Set(sales.map((s) => s.id));
    for (const [id, entry] of existing) {
      if (!wanted.has(id)) { removeEntry(entry); existing.delete(id); }
    }

    let fresh = 0;
    sales.forEach((sale) => {
      if (!sale.coords || typeof sale.coords.lat !== "number" || typeof sale.coords.lng !== "number") return;

      const st = pinState(sale, now);
      const { isUpcoming, minutesLeft, isUrgent, isMultiDay, boosted } = st;
      const sig = pinSignature(sale, st);
      const prev = existing.get(sale.id);
      if (prev && prev.sig === sig) return; // unchanged — leave it alone

      // Brand-new pins drop in (staggered, capped so a big list isn't slow).
      // Pins that are just being refreshed appear in place with no animation.
      const dropStyle = prev ? "" : `animation:dropPin 0.4s ease-out ${Math.min(fresh, 12) * 0.05}s both`;
      if (!prev) fresh += 1;
      if (prev) { removeEntry(prev); existing.delete(sale.id); }

      // Pin color tiers: GOLD (boosted) > blue (upcoming) > red pulse (≤2h) > purple pulse (active event) > green (active)
      const isEvent = sale.saleType === "event";
      let pinBg = "#10b981"; // emerald-500 (default active)
      let arrowColor = "#10b981";
      let pulseClass = "";
      if (boosted) {
        pinBg = "linear-gradient(135deg, #d97706, #f59e0b)";
        arrowColor = "#f59e0b";
      } else if (isUpcoming) {
        pinBg = "#3b82f6"; // blue-500
        arrowColor = "#3b82f6";
      } else if (isUrgent) {
        pinBg = "#ef4444"; // red-500
        arrowColor = "#ef4444";
        pulseClass = "sale-marker-urgent";
      } else if (isEvent) {
        // Active events get a distinct purple identity + pulse to stand out
        pinBg = "#9333ea"; // purple-600
        arrowColor = "#9333ea";
        pulseClass = "sale-marker-event";
      }

      // Boosted pins are larger and render above all others
      const pinSize = boosted ? 50 : 40;
      const innerSize = boosted ? 50 : 40;

      const icon = L.divIcon({
        className: `sale-marker ${pulseClass} ${boosted ? "sale-marker-boosted" : ""}`,
        html: `<div style="${dropStyle}">
          <div class="sale-marker-inner" style="background:${pinBg};width:${innerSize}px;height:${innerSize}px;${boosted ? "border-color:#fde68a;" : ""}">
            ${boosted
              ? `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21 8 14 2 9.4h7.6z"/></svg>`
              : pinSvgForType(sale.saleType)}
          </div>
          <div class="sale-marker-arrow" style="border-top-color:${arrowColor};"></div>
        </div>`,
        iconSize: [pinSize, pinSize + 12], iconAnchor: [pinSize / 2, pinSize + 12], popupAnchor: [0, -(pinSize + 12)],
      });

      const marker = L.marker([sale.coords.lat, sale.coords.lng], {
        icon,
        zIndexOffset: boosted ? 1000 : 0, // boosted pins always on top
      });

      const badgeHtml = boosted
        ? `<div style="display:inline-block;padding:2px 8px;background:#fef3c7;color:#92400e;border-radius:99px;font-size:10px;font-weight:700;margin-bottom:6px;">⭐ FEATURED</div>`
        : isUpcoming
        ? `<div style="display:inline-block;padding:2px 8px;background:#dbeafe;color:#1e40af;border-radius:99px;font-size:10px;font-weight:700;margin-bottom:6px;">UPCOMING</div>`
        : isUrgent
        ? `<div style="display:inline-block;padding:2px 8px;background:#fee2e2;color:#991b1b;border-radius:99px;font-size:10px;font-weight:700;margin-bottom:6px;">${minutesLeft < 60 ? `${minutesLeft}M LEFT` : `${Math.floor(minutesLeft/60)}H LEFT`}</div>`
        : isMultiDay
        ? `<div style="display:inline-block;padding:2px 8px;background:#f3e8ff;color:#6b21a8;border-radius:99px;font-size:10px;font-weight:700;margin-bottom:6px;">MULTI-DAY</div>`
        : "";

      const popup = `<div style="padding:12px;min-width:180px;font-family:inherit;">
        ${badgeHtml}
        <div style="font-weight:700;font-size:13px;color:#1c1917;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;">${escapeHtml(sale.title)}</div>
        ${sale.address ? `<div style="font-size:11px;color:#059669;margin-bottom:2px;">📍 ${escapeHtml(sale.address)}</div>` : ""}
        <div style="font-size:11px;color:#059669;font-weight:600;">${escapeHtml(sale.distanceText || "")} · ${escapeHtml(sale.date)}</div>
        <div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap;">
          ${(sale.tags || []).slice(0, 3).map(t => `<span style="padding:2px 8px;background:#f5f5f4;border-radius:99px;font-size:10px;color:#57534e;">${escapeHtml(t)}</span>`).join("")}
        </div>
      </div>`;

      marker.bindPopup(popup, { closeButton: false });
      marker.on("click", () => setSelected({ ...sale, isUpcoming, isUrgent, isMultiDay, minutesLeft, boosted }));

      // Featured (boosted) pins never hide inside a bubble — they stay visible on their own
      const clustered = !boosted;
      if (clustered) cluster.addLayer(marker);
      else marker.addTo(map);
      existing.set(sale.id, { marker, sig, clustered });
    });
  }, [sales, ready]);

  return (
    <div className="relative h-full" style={{ minHeight: 320 }}>
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
            {selected.photos?.[0]
              ? <img src={selected.photos[0]} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
              : <div className="w-16 h-16 rounded-xl bg-stone-100 flex items-center justify-center shrink-0 text-2xl" aria-hidden="true">🏷️</div>}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {selected.isUpcoming && (
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold uppercase tracking-wide">Upcoming</span>
                )}
                {selected.isUrgent && (
                  <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded text-[9px] font-bold uppercase tracking-wide animate-pulse">
                    {selected.minutesLeft < 60 ? `${selected.minutesLeft}m left` : `${Math.floor(selected.minutesLeft/60)}h left`}
                  </span>
                )}
                {selected.isMultiDay && !selected.isUpcoming && !selected.isUrgent && (
                  <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-bold uppercase tracking-wide">Multi-day</span>
                )}
                <h3 className="font-bold text-stone-800 text-sm truncate">{selected.title}</h3>
              </div>
              {selected.address && <p className="text-yard-600 text-xs font-medium mt-0.5">📍 {selected.address}</p>}
              <p className="text-stone-500 text-xs mt-0.5">{selected.distanceText} · {selected.date}</p>
            </div>
            <ChevronLeft className="w-5 h-5 text-stone-400 rotate-180 shrink-0 mt-1" />
          </div>
          <button onClick={() => setSelected(null)} aria-label="Close" className="absolute top-1 right-1 w-10 h-10 flex items-center justify-center hover:bg-stone-100 rounded-full">
            <X className="w-4 h-4 text-stone-400" />
          </button>
        </div>
      )}
    </div>
  );
}
