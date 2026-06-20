"use client";
import dynamic from "next/dynamic";
import { useApp } from "@/lib/AppContext";
import { haversine, fmtDist } from "@/lib/distance";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function MapPage() {
  const { activeSales, upcomingSales, loc, dist, unit } = useApp();

  const useKm = unit === "km";
  const showAll = !isFinite(dist); // "Anywhere" selected

  // Combine active + upcoming sales (filter out past sales) — matches home feed behavior
  const visibleSales = [...activeSales, ...upcomingSales];

  const withDist = visibleSales.map(s => {
    if (!loc || !s.coords || typeof s.coords.lat !== "number" || typeof s.coords.lng !== "number") {
      return { ...s, distance: showAll ? 0 : Infinity, distanceText: loc ? "—" : "…" };
    }
    const d = haversine(loc.lat, loc.lng, s.coords.lat, s.coords.lng, useKm);
    const safeD = isFinite(d) ? d : (showAll ? 0 : Infinity);
    return { ...s, distance: safeD, distanceText: isFinite(d) ? fmtDist(d, unit) : "—" };
  });

  const distInUnit = useKm ? dist * 1.60934 : dist;
  const filtered = showAll ? withDist : withDist.filter(s => s.distance <= distInUnit);

  return <MapView sales={filtered} />;
}
