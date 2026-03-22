"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { reverseGeocode } from "./geocode";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loc, setLoc] = useState(null);
  const [locName, setLocName] = useState("");
  const [locErr, setLocErr] = useState(null);
  const [locLoading, setLocLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [dist, setDist] = useState(10);
  const [unit, setUnit] = useState("km");
  const [sortBy, setSortBy] = useState("distance");
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  // ─── AUTH SESSION ───
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) loadProfile(session.user.id);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        await ensureProfile(session.user);
        await loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) setProfile(data);
  };

  // For OAuth (Google) — auto-create profile if it doesn't exist
  const ensureProfile = async (authUser) => {
    const { data } = await supabase.from("profiles").select("id").eq("id", authUser.id).single();
    if (!data) {
      const name = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split("@")[0] || "User";
      await supabase.from("profiles").insert({
        id: authUser.id,
        name,
        email: authUser.email,
        avatar_color: ["#059669","#3b82f6","#a855f7","#f43f5e","#f59e0b","#14b8a6","#6366f1","#f97316"][Math.floor(Math.random() * 8)],
      });
    }
  };

  // ─── AUTH HANDLERS ───
  const handleSignUp = async (name, email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id, name, email,
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

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); setProfile(null); setSavedIds([]);
  };

  const handleUpdateProfile = async (updates) => {
    if (!user) return;
    const { data } = await supabase.from("profiles").update(updates).eq("id", user.id).select().single();
    if (data) setProfile(data);
  };

  // ─── PHOTO UPLOAD TO SUPABASE STORAGE ───
  const uploadPhotos = async (base64Photos) => {
    if (!user || !base64Photos.length) return [];
    const urls = [];
    for (const b64 of base64Photos) {
      try {
        // Convert base64 data URL to blob
        const parts = b64.split(",");
        const mime = parts[0]?.match(/:(.*?);/)?.[1] || "image/jpeg";
        const binary = atob(parts[1] || "");
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: mime });

        const ext = mime.includes("png") ? "png" : "jpg";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error } = await supabase.storage.from("sale-photos").upload(path, blob, {
          contentType: mime, upsert: false,
        });

        if (!error) {
          const { data: urlData } = supabase.storage.from("sale-photos").getPublicUrl(path);
          if (urlData?.publicUrl) urls.push(urlData.publicUrl);
        } else {
          console.warn("Photo upload error:", error.message);
        }
      } catch (e) {
        console.warn("Photo upload failed:", e);
      }
    }
    return urls;
  };

  // ─── LOCATION ───
  const requestLocation = useCallback(() => {
    setLocLoading(true); setLocErr(null);
    const fallback = (msg) => { setLocErr(msg); setLoc({ lat: 42.3149, lng: -83.0364 }); setLocName("Windsor, ON"); setLocLoading(false); };
    if (typeof navigator === "undefined" || !navigator.geolocation) return fallback("Geolocation not supported.");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const l = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLoc(l); setLocLoading(false);
        setLocName(`${l.lat.toFixed(2)}, ${l.lng.toFixed(2)}`);
        try { const geo = await reverseGeocode(l.lat, l.lng); if (geo.short && !geo.short.includes("undefined")) setLocName(geo.short); } catch {}
      },
      () => fallback("Location denied."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => { requestLocation(); }, [requestLocation]);

  // ─── LOAD SALES (all non-ancient sales) ───
  const loadSales = useCallback(async () => {
    // Load sales from the last 30 days + all future ones
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data, error } = await supabase
      .from("sales")
      .select("*, profiles(name, bio, phone, avatar_color, rating, sales_posted)")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load sales:", error.message);
      setSales([]);
      return;
    }

    if (data) {
      setSales(data.map(s => ({
        id: s.id, title: s.title, description: s.description, address: s.address,
        date: s.date_display, dateRaw: s.date_raw, tags: s.tags || [], photos: s.photos || [],
        featuredItems: s.featured_items || [],
        coords: { lat: s.lat, lng: s.lng },
        createdAt: new Date(s.created_at).getTime(),
        expiresAt: new Date(s.expires_at).getTime(),
        userId: s.user_id,
        seller: s.profiles ? {
          name: s.profiles.name, bio: s.profiles.bio || "", phone: s.profiles.phone || "",
          avatarColor: s.profiles.avatar_color || "#059669", rating: s.profiles.rating || 0,
          sales: s.profiles.sales_posted || 0,
        } : { name: "Unknown", bio: "", phone: "", avatarColor: "#059669", rating: 0, sales: 0 },
      })));
    }
  }, []);

  useEffect(() => { loadSales(); }, [loadSales]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel("sales-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => loadSales())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadSales]);

  // ─── SAVED ───
  useEffect(() => {
    if (!user) { setSavedIds([]); return; }
    supabase.from("saved_sales").select("sale_id").eq("user_id", user.id)
      .then(({ data }) => { if (data) setSavedIds(data.map(s => s.sale_id)); });
  }, [user]);

  // ─── SALES CRUD ───
  const handleCreateSale = async (saleData) => {
    if (!user) return { error: "Not signed in" };

    // Try uploading photos to storage, fall back to empty array
    let photoUrls = [];
    if (saleData.photos?.length) {
      try {
        photoUrls = await uploadPhotos(saleData.photos);
      } catch (e) {
        console.warn("Photo upload failed, continuing without photos:", e);
      }
    }

    const insertData = {
      user_id: user.id,
      title: saleData.title,
      description: saleData.description,
      address: saleData.address || "",
      date_display: saleData.date || "TBD",
      date_raw: saleData.dateRaw || null,
      tags: saleData.tags || ["General"],
      photos: photoUrls,
      featured_items: saleData.featuredItems || [],
      lat: saleData.coords?.lat || 42.3149,
      lng: saleData.coords?.lng || -83.0364,
      expires_at: saleData.dateRaw
        ? new Date(new Date(saleData.dateRaw).getTime() + 86400000).toISOString()
        : new Date(Date.now() + 7 * 86400000).toISOString(),
    };

    const { error } = await supabase.from("sales").insert(insertData);

    if (error) {
      console.error("Sale creation failed:", error);
      return { error: error.message };
    }

    // Update profile sales count
    await supabase.from("profiles").update({
      sales_posted: (profile?.sales_posted || 0) + 1
    }).eq("id", user.id);
    await loadProfile(user.id);
    await loadSales();
    return { error: null };
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
  const userSales = sales.filter(s => s.userId === user?.id);

  // Categorize sales
  const now = Date.now();
  const activeSales = sales.filter(s => !s.expiresAt || s.expiresAt > now);
  const upcomingSales = sales.filter(s => s.dateRaw && new Date(s.dateRaw).getTime() > now);
  const expiredSales = sales.filter(s => s.expiresAt && s.expiresAt <= now);

  return <AppContext.Provider value={{
    user, profile, authLoading,
    unit, setUnit, dist, setDist, sortBy, setSortBy,
    loc, locName, locErr, locLoading, requestLocation,
    sales, activeSales, upcomingSales, expiredSales, userSales,
    savedIds, toggleSaved, isSaved,
    showAuth, setShowAuth, authMode, setAuthMode,
    handleSignUp, handleLogin, handleGoogleLogin, handleLogout, handleUpdateProfile,
    handleCreateSale, handleDeleteSale, loadSales,
  }}>{children}</AppContext.Provider>;
}
