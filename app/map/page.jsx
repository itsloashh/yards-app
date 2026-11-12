"use client";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useFilteredSales } from "@/lib/useFilteredSales";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function MapPage() {
  // Active + upcoming sales after distance, search and filters — same rules as the home feed
  const { active, upcoming } = useFilteredSales();
  const visible = useMemo(() => [...active, ...upcoming], [active, upcoming]);
  return <MapView sales={visible} />;
}
