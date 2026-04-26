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
  const [salesLoading, setSalesLoading] = useState(true);
  const [savedIds, setSavedIds] = useState([]);
  const [dist, setDist] = useState(10);
  const [unit, setUnit] = useState("km");
  const [sortBy, setSortBy] = useState("distance");
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [salesLoadError, setSalesLoadError] = useState("");
  // Connection health — null = unknown, true = healthy, false = having trouble
  const [connOk, setConnOk] = useState(null);

  // ─── AUTH SESSION ───
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) loadProfile(session.user.id);
      setAuthLoading(false);
    }).catch((err) => {
      console.error("[auth] getSession failed:", err);
      setConnOk(false);
      setAuthLoading(false);
    });
    // IMPORTANT: Supabase SDK can deadlock if you use await inside onAuthStateChange.
    // We schedule the profile fetches with setTimeout to run outside the callback.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        setTimeout(() => {
          ensureProfile(session.user).then(() => loadProfile(session.user.id));
        }, 0);
      } else {
        setProfile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) {
        console.error("[loadProfile] failed:", error);
        return;
      }
      if (data) setProfile(data);
    } catch (err) {
      console.error("[loadProfile] exception:", err);
    }
  };

  // Auto-create profile on first login if it doesn't exist.
  // Used for both email/password signups (profile created after email confirmation & login)
  // and any future OAuth providers.
  const ensureProfile = async (authUser) => {
    try {
      const { data } = await supabase.from("profiles").select("id").eq("id", authUser.id).maybeSingle();
      if (!data) {
        const m = authUser.user_metadata || {};
        const name = m.full_name || m.name || authUser.email?.split("@")[0] || "User";
        const { error: insertErr } = await supabase.from("profiles").insert({
          id: authUser.id,
          name,
          email: authUser.email,
          avatar_color: ["#059669","#3b82f6","#a855f7","#f43f5e","#f59e0b","#14b8a6","#6366f1","#f97316"][Math.floor(Math.random() * 8)],
          location: m.location || "",
          location_city: m.location_city || "",
          location_region: m.location_region || "",
          location_country: m.location_country || "",
          location_lat: m.location_lat || null,
          location_lng: m.location_lng || null,
        });
        if (insertErr) console.error("[ensureProfile] profile insert failed:", insertErr);
        else console.log("[ensureProfile] profile created for:", authUser.email);
      }
    } catch (err) {
      console.error("[ensureProfile] exception:", err);
    }
  };

  // ─── AUTH HANDLERS ───
  // signUp works for both flows:
  // - With email confirmation OFF: user is signed in immediately (session returned)
  // - With email confirmation ON: user must confirm via email link before they can log in
  // Location is stored in user_metadata so it can be picked up by ensureProfile() on first login.
  const handleSignUp = async (name, email, password, location) => {
    try {
      const metadata = { full_name: name, name };
      if (location?.label) {
        metadata.location = location.label;
        metadata.location_city = location.city || "";
        metadata.location_region = location.region || "";
        metadata.location_country = location.country || "";
        metadata.location_lat = location.lat || null;
        metadata.location_lng = location.lng || null;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/` : undefined,
        },
      });
      if (error) return { error: error.message };

      const needsConfirmation = !data.session;
      console.log("[signup] success — needsConfirmation:", needsConfirmation);

      return { error: null, needsConfirmation };
    } catch (err) {
      console.error("[signup] exception:", err);
      return { error: "We're having trouble connecting right now — please try again in a moment." };
    }
  };

  const handleLogin = async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      setShowAuth(false);
      return { error: null };
    } catch (err) {
      console.error("[login] exception:", err);
      return { error: "We're having trouble connecting right now — please try again in a moment." };
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); setProfile(null); setSavedIds([]);
  };

  const handleUpdateProfile = async (updates) => {
    if (!user) return;
    try {
      const { data } = await supabase.from("profiles").update(updates).eq("id", user.id).select().single();
      if (data) setProfile(data);
    } catch (err) {
      console.error("[updateProfile] exception:", err);
    }
  };

  // ─── PHOTO UPLOAD TO SUPABASE STORAGE ───
  const uploadPhotos = async (base64Photos) => {
    if (!user || !base64Photos.length) return [];
    const urls = [];
    for (const b64 of base64Photos) {
      try {
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
          console.warn("[photo upload] error:", error.message);
        }
      } catch (e) {
        console.warn("[photo upload] exception:", e);
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

  // ─── LOAD SALES ───
  const loadSales = useCallback(async () => {
    try {
      // Load sales from the last 30 days + all future ones
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      // First try the embedded query with the named FK
      let { data, error } = await supabase
        .from("sales")
        .select("*, profiles!sales_user_id_fkey(name, bio, phone, avatar_color, rating, sales_posted)")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false });

      // Fallback: if the embed fails for any reason, just load sales without profile data
      if (error) {
        console.warn("[loadSales] embed failed, falling back to plain query:", error.message);
        const plain = await supabase
          .from("sales")
          .select("*")
          .gte("created_at", thirtyDaysAgo)
          .order("created_at", { ascending: false });
        data = plain.data;
        error = plain.error;
      }

      if (error) {
        console.error("[loadSales] failed:", error);
        setSalesLoadError(error.message || JSON.stringify(error));
        setConnOk(false);
        setSalesLoading(false);
        return;
      }

      if (data) {
        setSalesLoadError("");
        setSales(data.map(s => ({
          id: s.id, title: s.title, description: s.description, address: s.address,
          date: s.date_display, dateRaw: s.date_raw, endDateRaw: s.end_date_raw || null,
          tags: s.tags || [], photos: s.photos || [],
          featuredItems: s.featured_items || [],
          coords: { lat: s.lat, lng: s.lng },
          createdAt: new Date(s.created_at).getTime(),
          expiresAt: s.expires_at ? new Date(s.expires_at).getTime() : null,
          userId: s.user_id,
          startTime: s.start_time || "",
          endTime: s.end_time || "",
          seller: s.profiles ? {
            name: s.profiles.name, bio: s.profiles.bio || "", phone: s.profiles.phone || "",
            avatarColor: s.profiles.avatar_color || "#059669", rating: s.profiles.rating || 0,
            sales: s.profiles.sales_posted || 0,
          } : { name: "Unknown", bio: "", phone: "", avatarColor: "#059669", rating: 0, sales: 0 },
        })));
        setConnOk(true);
      }
      setSalesLoading(false);
    } catch (err) {
      console.error("[loadSales] exception:", err);
      setSalesLoadError(err?.message || String(err));
      setConnOk(false);
      setSalesLoading(false);
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

  // Retry connection every 30s when unhealthy
  useEffect(() => {
    if (connOk !== false) return;
    const retryTimer = setInterval(() => {
      console.log("[conn] retrying...");
      loadSales();
    }, 30000);
    return () => clearInterval(retryTimer);
  }, [connOk, loadSales]);

  // ─── SAVED ───
  useEffect(() => {
    if (!user) { setSavedIds([]); return; }
    supabase.from("saved_sales").select("sale_id").eq("user_id", user.id)
      .then(({ data, error }) => {
        if (error) {
          console.error("[loadSaved] failed:", error);
          return;
        }
        if (data) setSavedIds(data.map(s => s.sale_id));
      });
  }, [user]);

  // ─── SALES CRUD ───
  const handleCreateSale = async (saleData) => {
    if (!user) return { error: "Not signed in" };

    try {
      // Try uploading photos to storage, fall back to empty array
      let photoUrls = [];
      if (saleData.photos?.length) {
        try {
          photoUrls = await uploadPhotos(saleData.photos);
        } catch (e) {
          console.warn("[createSale] photo upload failed, continuing without photos:", e);
        }
      }

      // For expires_at: use end date if multi-day, otherwise start date.
      // Add a buffer so sales don't disappear at midnight — push to end of day + 1hr after closing time.
      const expirationDate = saleData.endDateRaw || saleData.dateRaw;
      let expiresAtMs = null;
      if (expirationDate) {
        // If endTime is set, expire 1 hour after closing time on the last day
        if (saleData.endTime && /^\d{2}:\d{2}/.test(saleData.endTime)) {
          const [eh, em] = saleData.endTime.split(":").map(Number);
          const expDate = new Date(`${expirationDate}T00:00`);
          expDate.setHours(eh, em, 0, 0);
          expiresAtMs = expDate.getTime() + 3600000; // +1 hour grace
        } else {
          // No end time set — expire at midnight of the day AFTER the last sale day
          const expDate = new Date(`${expirationDate}T00:00`);
          expDate.setDate(expDate.getDate() + 1);
          expiresAtMs = expDate.getTime();
        }
      } else {
        expiresAtMs = Date.now() + 7 * 86400000;
      }

      const insertData = {
        user_id: user.id,
        title: saleData.title,
        description: saleData.description,
        address: saleData.address || "",
        date_display: saleData.date || "TBD",
        date_raw: saleData.dateRaw || null,
        end_date_raw: saleData.endDateRaw || null,
        start_time: saleData.startTime || null,
        end_time: saleData.endTime || null,
        tags: saleData.tags || ["General"],
        photos: photoUrls,
        featured_items: saleData.featuredItems || [],
        lat: saleData.coords?.lat || 42.3149,
        lng: saleData.coords?.lng || -83.0364,
        expires_at: new Date(expiresAtMs).toISOString(),
      };

      console.log("[createSale] inserting:", insertData);
      const { data, error } = await supabase.from("sales").insert(insertData).select().single();

      if (error) {
        console.error("[createSale] DB insert failed:", error);
        return { error: error.message || "We couldn't save your sale right now. Please try again in a moment." };
      }

      console.log("[createSale] success:", data);

      // Update profile sales count (non-blocking)
      try {
        await supabase.from("profiles").update({
          sales_posted: (profile?.sales_posted || 0) + 1
        }).eq("id", user.id);
        await loadProfile(user.id);
      } catch (e) {
        console.warn("[createSale] profile update failed:", e);
      }

      await loadSales();
      return { error: null };
    } catch (err) {
      console.error("[createSale] exception:", err);
      return { error: "We're having trouble connecting right now — please try again in a moment." };
    }
  };

  const handleDeleteSale = async (saleId) => {
    try {
      await supabase.from("sales").delete().eq("id", saleId);
      await loadSales();
    } catch (err) {
      console.error("[deleteSale] exception:", err);
    }
  };

  const toggleSaved = async (saleId) => {
    if (!user) { setShowAuth(true); return; }
    try {
      if (savedIds.includes(saleId)) {
        await supabase.from("saved_sales").delete().eq("user_id", user.id).eq("sale_id", saleId);
        setSavedIds(p => p.filter(id => id !== saleId));
      } else {
        await supabase.from("saved_sales").insert({ user_id: user.id, sale_id: saleId });
        setSavedIds(p => [...p, saleId]);
      }
    } catch (err) {
      console.error("[toggleSaved] exception:", err);
    }
  };

  const isSaved = (id) => savedIds.includes(id);
  const userSales = sales.filter(s => s.userId === user?.id);

  // ─── CATEGORIZE SALES (single source of truth) ───
  // Active: sale has started but not ended (start time has passed, not expired)
  // Upcoming: sale hasn't started yet (start time is in the future)
  // Past: expired (expires_at has passed)
  const now = Date.now();

  const getSaleStatus = (s) => {
    if (s.expiresAt && s.expiresAt <= now) return "past";
    if (s.dateRaw) {
      // Combine date + start time (if set) to get the actual start moment
      // dateRaw is "YYYY-MM-DD", startTime is "HH:MM" or empty
      const startStr = s.startTime && /^\d{2}:\d{2}/.test(s.startTime)
        ? `${s.dateRaw}T${s.startTime}`
        : `${s.dateRaw}T00:00`;
      const startMs = new Date(startStr).getTime();
      if (!isNaN(startMs) && startMs > now) return "upcoming";
    }
    return "active";
  };

  const activeSales = sales.filter(s => getSaleStatus(s) === "active");
  const upcomingSales = sales.filter(s => getSaleStatus(s) === "upcoming");
  const expiredSales = sales.filter(s => getSaleStatus(s) === "past");

  // User's sales split by status (for profile)
  const userActiveSales = userSales.filter(s => getSaleStatus(s) === "active");
  const userUpcomingSales = userSales.filter(s => getSaleStatus(s) === "upcoming");
  const userPastSales = userSales.filter(s => getSaleStatus(s) === "past");

  return <AppContext.Provider value={{
    user, profile, authLoading,
    unit, setUnit, dist, setDist, sortBy, setSortBy,
    loc, locName, locErr, locLoading, requestLocation,
    sales, salesLoading, activeSales, upcomingSales, expiredSales, userSales,
    userActiveSales, userUpcomingSales, userPastSales,
    savedIds, toggleSaved, isSaved,
    showAuth, setShowAuth, authMode, setAuthMode,
    connOk, salesLoadError,
    handleSignUp, handleLogin, handleLogout, handleUpdateProfile,
    handleCreateSale, handleDeleteSale, loadSales,
  }}>{children}</AppContext.Provider>;
}
