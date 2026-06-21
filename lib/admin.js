"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

// ─── ADMIN AUTH GATE ───
// Returns { status, user, profile } where status is:
//   "loading"  — still checking
//   "noauth"   — not logged in
//   "denied"   — logged in but not an admin
//   "ok"       — logged in admin
export function useAdminAuth() {
  const [status, setStatus] = useState("loading");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;

        if (!session?.user) {
          setStatus("noauth");
          return;
        }
        setUser(session.user);

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error || !data) {
          setStatus("denied");
          return;
        }
        setProfile(data);
        setStatus(data.role === "admin" ? "ok" : "denied");
      } catch (err) {
        console.error("[useAdminAuth] error:", err);
        if (!cancelled) setStatus("denied");
      }
    };

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  return { status, user, profile };
}

// ─── ADMIN DATA: all users ───
export function useAdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setUsers(data || []);
      setError(null);
    } catch (err) {
      console.error("[useAdminUsers] error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { users, loading, error, reload };
}

// ─── ADMIN DATA: all sales ───
export function useAdminSales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSales(data || []);
    } catch (err) {
      console.error("[useAdminSales] error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { sales, loading, reload };
}

// ─── ADMIN DATA: all boosts (revenue) ───
export function useAdminBoosts() {
  const [boosts, setBoosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("boosts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setBoosts(data || []);
    } catch (err) {
      console.error("[useAdminBoosts] error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { boosts, loading, reload };
}

// ─── DERIVED STATS ───
export function computeRegionStats(users) {
  const byRegion = {};
  for (const u of users) {
    const region = u.location_region || "Unknown";
    const country = u.location_country || "Unknown";
    const key = `${region}|${country}`;
    if (!byRegion[key]) {
      byRegion[key] = {
        region, country,
        users: 0,
        withLocation: 0,
        sellers: 0,
      };
    }
    byRegion[key].users += 1;
    if (u.location_lat && u.location_lng) byRegion[key].withLocation += 1;
    if ((u.sales_posted || 0) > 0) byRegion[key].sellers += 1;
  }
  return Object.values(byRegion).sort((a, b) => b.users - a.users);
}

export function computeCountryStats(users) {
  const byCountry = {};
  for (const u of users) {
    const country = u.location_country || "Unknown";
    byCountry[country] = (byCountry[country] || 0) + 1;
  }
  return Object.entries(byCountry)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count);
}
