"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { reverseGeocode } from "./geocode";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  // Auth
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Location
  const [loc, setLoc] = useState(null);
  const [locName, setLocName] = useState("");
  const [locErr, setLocErr] = useState(null);
  const [locLoading, setLocLoading] = useState(true);

  // Data
  const [sales, setSales] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [dist, setDist] = useState(10);
  const [unit, setUnit] = useState("km");
  const [sortBy, setSortBy] = useState("distance");

  // UI
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  // ─── AUTH: Listen for session changes ───
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) loadProfile(session.user.id);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) loadProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) setProfile(data);
  };

  // ─── AUTH HANDLERS ───
  const handleSignUp = async (name, email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      // Create profile
      await supabase.from("profiles").insert({
        id: data.user.id,
        name,
        email,
        avatar_color: ["#059669","#3b82f6","#a855f7","#f43f5e","#f59e0b","#14b8a6","#6366f1","#f97316"][Math.floor(Math.random() * 8)],
      });
      await loadProfile(data.user.id);
      setShowAuth(false);
    }
    return { error: null };
  };

  const handleLogin = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    setShowAuth(false);
    return { error: null };
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSavedIds([]);
  };

  const handleUpdateProfile = async (updates) => {
    if (!user) return;
    const { data } = await supabase.from("profiles").update(updates).eq("id", user.id).select().single();
    if (data) setProfile(data);
  };

  // ─── LOCATION ───
  const requestLocation = useCallback(() => {
    setLocLoading(true);
    setLocErr(null);
    const fallback = (msg) => {
      setLocErr(msg);
      setLoc({ lat: 42.3149, lng: -83.0364 });
      setLocName("Windsor, ON");
      setLocLoading(false);
    };
    if (typeof navigator === "undefined" || !navigator.geolocation) return fallback("Geolocation not supported.");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const l = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLoc(l);
        setLocLoading(false);
        setLocName(`${l.lat.toFixed(2)}, ${l.lng.toFixed(2)}`);
        try {
          const geo = await reverseGeocode(l.lat, l.lng);
          if (geo.short && !geo.short.includes("undefined")) setLocName(geo.short);
        } catch {}
      },
      () => fallback("Location denied."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => { requestLocation(); }, [requestLocation]);

  // ─── LOAD SALES ───
  const loadSales = useCallback(async () => {
    const { data } = await supabase
      .from("sales")
      .select("*, profiles!sales_user_id_fkey(name, bio, phone, avatar_color, rating, sales_posted)")
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (data) {
      const formatted = data.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description,
        address: s.address,
        date: s.date_display,
        dateRaw: s.date_raw,
        tags: s.tags || [],
        photos: s.photos || [],
        featuredItems: s.featured_items || [],
        coords: { lat: s.lat, lng: s.lng },
        createdAt: new Date(s.created_at).getTime(),
        expiresAt: new Date(s.expires_at).getTime(),
        userId: s.user_id,
        seller: s.profiles ? {
          name: s.profiles.name,
          bio: s.profiles.bio || "",
          phone: s.profiles.phone || "",
          avatarColor: s.profiles.avatar_color || "#059669",
          rating: s.profiles.rating || 0,
          sales: s.profiles.sales_posted || 0,
        } : { name: "Unknown", bio: "", phone: "", avatarColor: "#059669", rating: 0, sales: 0 },
      }));
      setSales(formatted);
    }
  }, []);

  useEffect(() => { loadSales(); }, [loadSales]);

  // Realtime subscription for new sales
  useEffect(() => {
    const channel = supabase.channel("sales-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => {
        loadSales(); // Reload when any sale changes
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadSales]);

  // ─── LOAD SAVED ───
  useEffect(() => {
    if (!user) { setSavedIds([]); return; }
    supabase.from("saved_sales").select("sale_id").eq("user_id", user.id)
      .then(({ data }) => { if (data) setSavedIds(data.map(s => s.sale_id)); });
  }, [user]);

  // ─── SALES HANDLERS ───
  const handleCreateSale = async (saleData) => {
    if (!user) return;
    const { error } = await supabase.from("sales").insert({
      user_id: user.id,
      title: saleData.title,
      description: saleData.description,
      address: saleData.address,
      date_display: saleData.date,
      date_raw: saleData.dateRaw || null,
      start_time: saleData.startTime || null,
      end_time: saleData.endTime || null,
      tags: saleData.tags,
      photos: saleData.photos,
      featured_items: saleData.featuredItems || [],
      lat: saleData.coords.lat,
      lng: saleData.coords.lng,
      expires_at: saleData.dateRaw
        ? new Date(new Date(saleData.dateRaw).getTime() + 86400000).toISOString()
        : new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    if (!error) {
      // Increment sales count
      await supabase.from("profiles").update({ sales_posted: (profile?.sales_posted || 0) + 1 }).eq("id", user.id);
      await loadProfile(user.id);
      await loadSales();
    }
    return { error: error?.message || null };
  };

  const handleDeleteSale = async (saleId) => {
    await supabase.from("sales").delete().eq("id", saleId);
    await loadSales();
  };

  const toggleSaved = async (saleId) => {
    if (!user) { setShowAuth(true); return; }
    if (savedIds.includes(saleId)) {
      await supabase.from("saved_sales").delete().eq("user_id", user.id).eq("sale_id", saleId);
      setSavedIds(p => p.filter(id => id !== saleId));
    } else {
      await supabase.from("saved_sales").insert({ user_id: user.id, sale_id: saleId });
      setSavedIds(p => [...p, saleId]);
    }
  };

  const isSaved = (id) => savedIds.includes(id);

  // User's own sales
  const userSales = sales.filter(s => s.userId === user?.id);

  return <AppContext.Provider value={{
    user, profile, authLoading,
    unit, setUnit, dist, setDist, sortBy, setSortBy,
    loc, locName, locErr, locLoading, requestLocation,
    sales, userSales, savedIds, toggleSaved, isSaved,
    showAuth, setShowAuth, authMode, setAuthMode,
    handleSignUp, handleLogin, handleLogout, handleUpdateProfile,
    handleCreateSale, handleDeleteSale, loadSales,
  }}>{children}</AppContext.Provider>;
}
