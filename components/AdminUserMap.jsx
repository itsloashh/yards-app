"use client";
import { useEffect, useRef, useState } from "react";

// Renders a dark-themed world map with a pin for every geo-located user.
// Users in the same area are clustered into a single sized/labeled pin.
export default function AdminUserMap({ users }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markersRef = useRef([]);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let map;
    let cancelled = false;

    (async () => {
      const L = require("leaflet");
      if (cancelled || !containerRef.current || mapRef.current) return;

      map = L.map(containerRef.current, {
        center: [25, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 12,
        worldCopyJump: true,
        zoomControl: true,
        attributionControl: false,
      });
      mapRef.current = map;

      // Dark tile layer (CARTO dark matter — free, no key)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      setReady(true);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Plot user pins (clustered by rounded lat/lng)
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    (async () => {
      const L = require("leaflet");
      const map = mapRef.current;

      // Clear old markers
      markersRef.current.forEach(m => map.removeLayer(m));
      markersRef.current = [];

      // Cluster users by rounding coordinates (~city level grouping)
      const clusters = {};
      for (const u of users) {
        if (typeof u.location_lat !== "number" || typeof u.location_lng !== "number") continue;
        // Round to 1 decimal (~11km) to group nearby users
        const key = `${u.location_lat.toFixed(1)},${u.location_lng.toFixed(1)}`;
        if (!clusters[key]) {
          clusters[key] = {
            lat: u.location_lat,
            lng: u.location_lng,
            city: u.location_city || u.location_region || "Unknown",
            region: u.location_region || "",
            country: u.location_country || "",
            users: [],
          };
        }
        clusters[key].users.push(u);
      }

      Object.values(clusters).forEach((cluster) => {
        const count = cluster.users.length;
        // Size scales gently with count
        const size = Math.min(46, 22 + Math.log2(count + 1) * 6);
        const icon = L.divIcon({
          className: "admin-user-pin",
          html: `<div style="
            width:${size}px;height:${size}px;
            background:radial-gradient(circle at 30% 30%, #34d399, #059669);
            border:2px solid rgba(255,255,255,0.85);
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            color:white;font-weight:700;font-size:${count > 99 ? 10 : 12}px;
            box-shadow:0 0 0 4px rgba(16,185,129,0.18), 0 2px 8px rgba(0,0,0,0.5);
          ">${count}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marker = L.marker([cluster.lat, cluster.lng], { icon }).addTo(map);
        marker.on("click", () => {
          setSelected(cluster);
          map.flyTo([cluster.lat, cluster.lng], Math.max(map.getZoom(), 6), { duration: 0.6 });
        });
        markersRef.current.push(marker);
      });
    })();
  }, [ready, users]);

  const geoCount = users.filter(u => typeof u.location_lat === "number" && typeof u.location_lng === "number").length;

  return (
    <div className="relative">
      <div ref={containerRef} className="w-full h-[calc(100dvh-220px)] min-h-[420px] rounded-2xl overflow-hidden border border-stone-800 bg-stone-900" />

      {/* Legend / count */}
      <div className="absolute top-4 left-4 z-[500] bg-stone-900/90 backdrop-blur border border-stone-700 rounded-xl px-4 py-2.5">
        <p className="text-white font-bold text-sm">{geoCount.toLocaleString()} geo-located users</p>
        <p className="text-stone-400 text-xs">{users.length.toLocaleString()} total · pins grouped by area</p>
      </div>

      {/* Selected cluster detail */}
      {selected && (
        <div className="absolute top-4 right-4 z-[500] w-72 bg-stone-900/95 backdrop-blur border border-stone-700 rounded-xl overflow-hidden max-h-[calc(100dvh-260px)] flex flex-col">
          <div className="px-4 py-3 border-b border-stone-800 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate">{selected.city}</p>
              <p className="text-stone-400 text-xs truncate">{[selected.region, selected.country].filter(Boolean).join(", ")}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-stone-500 hover:text-white text-lg leading-none shrink-0">×</button>
          </div>
          <div className="px-4 py-2 bg-emerald-500/10 border-b border-stone-800">
            <p className="text-emerald-400 text-sm font-semibold">{selected.users.length} user{selected.users.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="overflow-y-auto flex-1">
            {selected.users.map((u) => (
              <div key={u.id} className="px-4 py-2.5 border-b border-stone-800/60 last:border-0">
                <p className="text-stone-200 text-sm truncate">{u.name || "Unnamed"}</p>
                <p className="text-stone-500 text-xs truncate">{u.email}</p>
                <p className="text-stone-600 text-[11px] mt-0.5">
                  Joined {new Date(u.created_at).toLocaleDateString()} · {u.sales_posted || 0} sales
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
