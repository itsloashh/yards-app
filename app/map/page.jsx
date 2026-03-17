"use client";
import dynamic from "next/dynamic";
import { useApp } from "@/lib/AppContext";
import { haversine, fmtDist } from "@/lib/distance";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function MapPage() {
  const { sales, loc, dist, unit } = useApp();

  const useKm = unit === "km";
  const withDist = sales.map(s => {
    if (!loc) return { ...s, distance: 0, distanceText: "…" };
    const d = haversine(loc.lat, loc.lng, s.coords.lat, s.coords.lng, useKm);
    return { ...s, distance: d, distanceText: fmtDist(d, unit) };
  });

  const distInUnit = useKm ? dist * 1.60934 : dist;
  const filtered = withDist.filter(s => s.distance <= distInUnit);

  return <MapView sales={filtered} />;
}
