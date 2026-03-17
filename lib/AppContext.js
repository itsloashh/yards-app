"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { store } from "./store";
import { generateMockSales } from "./mockData";
import { reverseGeocode } from "./geocode";
import { AVATAR_COLORS } from "./constants";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

function isSaleActive(sale) {
  if (!sale.expiresAt) return true;
  return Date.now() < sale.expiresAt;
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [userSales, setUserSales] = useState([]);
  const [unit, setUnitState] = useState("km");
  const [loc, setLoc] = useState(null);
  const [locName, setLocName] = useState("");
  const [locErr, setLocErr] = useState(null);
  const [locLoading, setLocLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [saved, setSaved] = useState([]);
  const [dist, setDist] = useState(10);
  const [sortBy, setSortBy] = useState("distance");
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  useEffect(() => {
    setUser(store.getUser());
    setUsers(store.getUsers());
    setUserSales(store.getUserSales().filter(isSaleActive));
    setUnitState(store.getUnit());
    setSaved(store.getSaved());
  }, []);

  useEffect(() => { store.setUser(user); }, [user]);
  useEffect(() => { store.setUsers(users); }, [users]);
  useEffect(() => { store.setUserSales(userSales); }, [userSales]);
  useEffect(() => { store.setSaved(saved); }, [saved]);

  const setUnit = (u) => { setUnitState(u); store.setUnit(u); };

  const requestLocation = useCallback(() => {
    setLocLoading(true);
    setLocErr(null);
    const loadSales = (lat, lng) => [...generateMockSales(lat, lng), ...store.getUserSales().filter(isSaleActive)];
    const fallback = (msg) => {
      setLocErr(msg);
      const d = { lat: 42.3149, lng: -83.0364 };
      setLoc(d); setSales(loadSales(d.lat, d.lng)); setLocName("Windsor, ON"); setLocLoading(false);
    };
    if (typeof navigator === "undefined" || !navigator.geolocation) return fallback("Geolocation not supported.");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const l = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLoc(l); setSales(loadSales(l.lat, l.lng)); setLocLoading(false);
        setLocName(`${l.lat.toFixed(2)}, ${l.lng.toFixed(2)}`);
        try { const geo = await reverseGeocode(l.lat, l.lng); if (geo.short && !geo.short.includes("undefined")) setLocName(geo.short); } catch {}
      },
      () => fallback("Location denied."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => { requestLocation(); }, [requestLocation]);

  const handleSignUp = (data) => {
    const u = { id: Date.now().toString(), ...data, createdAt: new Date().toISOString(), salesPosted: 0, rating: 0, bio: "", phone: "", avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)].hex };
    setUsers((p) => [...p, u]); setUser(u); setShowAuth(false);
  };
  const handleLogin = (email, pw) => {
    const u = users.find((x) => x.email === email && x.password === pw);
    if (u) { setUser(u); setShowAuth(false); return true; } return false;
  };
  const handleLogout = () => { setUser(null); };
  const handleUpdateProfile = (updates) => {
    const updated = { ...user, ...updates }; setUser(updated);
    setUsers((p) => p.map((u) => (u.id === updated.id ? updated : u)));
  };
  const handleCreateSale = (saleData) => {
    const newSale = {
      id: Date.now().toString(), ...saleData,
      seller: { name: user?.name || "You", rating: 5.0, sales: user?.salesPosted || 0, bio: user?.bio || "", phone: user?.phone || "", avatarColor: user?.avatarColor || "#059669" },
      createdAt: Date.now(),
      expiresAt: saleData.dateRaw ? new Date(saleData.dateRaw).getTime() + 86400000 : Date.now() + 7 * 86400000,
    };
    setSales((p) => [...p, newSale]); setUserSales((p) => [...p, newSale]);
    if (user) { const updated = { ...user, salesPosted: (user.salesPosted || 0) + 1 }; setUser(updated); setUsers((p) => p.map((u) => (u.id === updated.id ? updated : u))); }
  };
  const handleDeleteSale = (saleId) => { setSales((p) => p.filter((s) => s.id !== saleId)); setUserSales((p) => p.filter((s) => s.id !== saleId)); };
  const handleEditSale = (saleId, updates) => { const up = (l) => l.map((s) => s.id === saleId ? { ...s, ...updates } : s); setSales(up); setUserSales(up); };
  const toggleSaved = (id) => { setSaved((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]); };
  const isSaved = (id) => saved.includes(id);

  return <AppContext.Provider value={{
    user, users, unit, setUnit, dist, setDist, sortBy, setSortBy,
    loc, locName, locErr, locLoading, requestLocation,
    sales, userSales, saved, toggleSaved, isSaved,
    showAuth, setShowAuth, authMode, setAuthMode,
    handleSignUp, handleLogin, handleLogout, handleUpdateProfile,
    handleCreateSale, handleDeleteSale, handleEditSale,
  }}>{children}</AppContext.Provider>;
}
