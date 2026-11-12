"use client";
import { useMemo } from "react";
import { useApp } from "./AppContext";
import { matchesSearch, matchesCategory, matchesWhen, withinDistance } from "./saleFilters";

// The sales the user should currently see, after distance, search, category
// and the quick "when" filter. Used by both the home feed and the map.
export function useFilteredSales() {
  const { activeSales, upcomingSales, loc, dist, unit, search, category, when } = useApp();

  return useMemo(() => {
    const now = Date.now();
    const keep = (s) => matchesSearch(s, search) && matchesCategory(s, category) && matchesWhen(s, when, now);
    const opts = { loc, dist, unit };
    const active = withinDistance(activeSales.filter(keep), opts);
    const upcoming = withinDistance(upcomingSales.filter(keep), opts);
    // How many sales are in range before search/category/when are applied
    const inRange = withinDistance(activeSales, opts).length + withinDistance(upcomingSales, opts).length;
    return {
      active, upcoming, inRange,
      filtersOn: !!(search?.trim() || category || when),
    };
  }, [activeSales, upcomingSales, loc, dist, unit, search, category, when]);
}
