import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  MapPin, Search, Plus, User, Heart, Clock, Navigation, ChevronLeft, X,
  Camera, DollarSign, Calendar, Home, Map, LogOut, Eye, ChevronDown, Locate,
  AlertCircle, Check, Mail, Lock, UserCircle, Star, Tag, Filter, RefreshCw, Crosshair
} from "lucide-react";

/* ─────────────────── CONSTANTS ─────────────────── */
const DIST_VALUES = [2, 5, 10, 25, 50];

const CATEGORIES = [
  "Furniture", "Electronics", "Kids", "Clothing", "Tools",
  "Books", "Antiques", "Kitchen", "Sports", "Garden", "Music", "Art",
  "Toys", "Baby", "Outdoor", "Vintage", "Jewelry", "Automotive",
];

const AVATAR_COLORS = [
  { name: "Emerald", bg: "bg-emerald-500", hex: "#059669" },
  { name: "Blue", bg: "bg-blue-500", hex: "#3b82f6" },
  { name: "Purple", bg: "bg-purple-500", hex: "#a855f7" },
  { name: "Rose", bg: "bg-rose-500", hex: "#f43f5e" },
  { name: "Amber", bg: "bg-amber-500", hex: "#f59e0b" },
  { name: "Teal", bg: "bg-teal-500", hex: "#14b8a6" },
  { name: "Indigo", bg: "bg-indigo-500", hex: "#6366f1" },
  { name: "Orange", bg: "bg-orange-500", hex: "#f97316" },
];

const SALE_PHOTOS = [
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=300&fit=crop",
];

/* ─────────────── HAVERSINE DISTANCE ─────────────── */
const haversine = (lat1, lng1, lat2, lng2, useKm = false) => {
  const R = useKm ? 6371 : 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const fmtDist = (d, unit) => {
  const u = unit === "km" ? "km" : "mi";
  return d < 0.1 ? `< 0.1 ${u}` : `${d.toFixed(1)} ${u}`;
};

const distLabel = (val, unit) => `${val} ${unit === "km" ? "km" : "mi"}`;

/* ────────── GENERATE MOCK SALES AROUND USER ─────── */
const STREET_NAMES = ["Oak St", "Maple Ave", "Pine Rd", "Birch Ln", "Cedar Dr", "Elm Way", "Willow Ct"];
const generateMockSales = (lat, lng) => {
  const sales = [
    { title: "Moving Sale — Everything Must Go!", desc: "Furniture, electronics, kids toys, kitchen appliances, vintage records, and much more. 20+ years of treasures!", tags: ["Furniture", "Electronics", "Kids"], off: [0.008, 0.005], seller: { name: "Martha J.", rating: 4.8, sales: 12, bio: "Love finding new homes for old treasures!", phone: "", avatarColor: "#059669" } },
    { title: "Estate Sale — Antiques & Collectibles", desc: "Beautiful antique furniture, fine china, crystal glassware, vintage jewelry, old books, and rare collectibles.", tags: ["Antiques", "Jewelry", "Books"], off: [-0.012, 0.018], seller: { name: "Robert K.", rating: 4.9, sales: 8, bio: "Collector for 30 years. Time to share.", phone: "", avatarColor: "#3b82f6" } },
    { title: "Baby & Kids Mega Sale", desc: "Gently used baby gear, strollers, cribs, toys, clothes (newborn to size 8), books, and outdoor play equipment.", tags: ["Baby", "Kids", "Toys"], off: [0.025, -0.015], seller: { name: "Sarah M.", rating: 4.7, sales: 5, bio: "Mom of 3 — outgrown everything!", phone: "", avatarColor: "#a855f7" } },
    { title: "Tools & Garage Cleanout", desc: "Power tools, hand tools, lawn equipment, automotive supplies, workbenches, and miscellaneous garage items.", tags: ["Tools", "Automotive", "Garden"], off: [-0.035, -0.028], seller: { name: "Dave P.", rating: 4.6, sales: 3, bio: "", phone: "", avatarColor: "#f59e0b" } },
    { title: "Vintage Vinyl & Music Gear", desc: "Thousands of vinyl records, turntables, speakers, guitars, amps, and music memorabilia.", tags: ["Music", "Vintage", "Electronics"], off: [0.055, 0.042], seller: { name: "Mike T.", rating: 5.0, sales: 15, bio: "DJ & vinyl addict since '85", phone: "", avatarColor: "#6366f1" } },
    { title: "Designer Clothing & Accessories", desc: "High-end designer clothing, handbags, shoes, and accessories. Most items 70-90% off retail!", tags: ["Clothing", "Vintage", "Jewelry"], off: [-0.068, 0.055], seller: { name: "Lisa R.", rating: 4.9, sales: 22, bio: "Fashion buyer downsizing my closet", phone: "", avatarColor: "#f43f5e" } },
    { title: "Outdoor & Camping Gear Sale", desc: "Tents, sleeping bags, hiking gear, fishing equipment, kayaks, bikes, and more outdoor adventure gear.", tags: ["Outdoor", "Sports"], off: [0.095, -0.075], seller: { name: "Tom H.", rating: 4.7, sales: 9, bio: "", phone: "", avatarColor: "#14b8a6" } },
  ];
  return sales.map((s, i) => ({
    id: i + 1,
    title: s.title,
    description: s.desc,
    address: `${1234 + i * 111} ${STREET_NAMES[i]}`,
    date: i % 2 === 0 ? "Today, 8am – 2pm" : "Sat–Sun, 9am – 4pm",
    photos: [SALE_PHOTOS[i], SALE_PHOTOS[(i + 3) % SALE_PHOTOS.length]],
    seller: s.seller,
    tags: s.tags,
    coords: { lat: lat + s.off[0], lng: lng + s.off[1] },
    saved: i === 1,
    locationName: "",
  }));
};

/* ─── REVERSE GEOCODE (free Nominatim / OpenStreetMap) ─── */
const reverseGeocode = async (lat, lng) => {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const d = await r.json();
    const a = d.address || {};
    const road = a.road || a.pedestrian || a.neighbourhood || "";
    const city = a.city || a.town || a.village || a.hamlet || "";
    const state = a.state || "";
    return { short: road ? `${road}, ${city}` : city || d.display_name?.split(",").slice(0, 2).join(","), full: d.display_name, city, state };
  } catch {
    return { short: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, full: "", city: "", state: "" };
  }
};

/* ══════════════════════════════════════════════════════════
   MAIN APP
   ══════════════════════════════════════════════════════════ */
export default function YardsApp() {
  const [view, setView] = useState("browse");
  const [selectedSale, setSelectedSale] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [dist, setDist] = useState(10);
  const [distOpen, setDistOpen] = useState(false);
  const [unit, setUnit] = useState("mi"); // "mi" or "km"
  const [catFilter, setCatFilter] = useState(null); // null = all, or a category string
  const [showCatFilter, setShowCatFilter] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  // Location
  const [loc, setLoc] = useState(null);
  const [locName, setLocName] = useState("");
  const [locErr, setLocErr] = useState(null);
  const [locLoading, setLocLoading] = useState(true);

  // User + sales
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [sales, setSales] = useState([]);

  /* ── Request geolocation ── */
  const requestLocation = useCallback(() => {
    setLocLoading(true);
    setLocErr(null);

    const fallback = (msg) => {
      setLocErr(msg);
      const d = { lat: 42.3149, lng: -83.0364 }; // Windsor, ON default
      setLoc(d);
      setSales(generateMockSales(d.lat, d.lng));
      setLocName("Windsor, ON");
      setLocLoading(false);
    };

    if (!navigator.geolocation) return fallback("Geolocation not supported. Using default.");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const l = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLoc(l);
        setSales(generateMockSales(l.lat, l.lng));
        setLocLoading(false);
        // Show coords immediately as placeholder
        setLocName(`${l.lat.toFixed(2)}, ${l.lng.toFixed(2)}`);
        // Reverse-geocode for friendly name
        try {
          const geo = await reverseGeocode(l.lat, l.lng);
          if (geo.short && !geo.short.includes("undefined")) setLocName(geo.short);
        } catch {
          // Keep coordinate display as fallback
        }
      },
      () => fallback("Location denied. Using default."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => { requestLocation(); }, [requestLocation]);

  /* ── Sales with distance ── */
  const useKm = unit === "km";
  const withDist = sales.map((s) => {
    if (!loc) return { ...s, distance: 0, distanceText: "…" };
    const d = haversine(loc.lat, loc.lng, s.coords.lat, s.coords.lng, useKm);
    return { ...s, distance: d, distanceText: fmtDist(d, unit) };
  });

  const distInUnit = useKm ? dist * 1.60934 : dist;
  const filtered = withDist
    .filter((s) => s.distance <= distInUnit)
    .filter((s) => !catFilter || s.tags.some((t) => t === catFilter))
    .filter(
      (s) =>
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        s.description.toLowerCase().includes(query.toLowerCase()) ||
        s.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
    )
    .sort((a, b) => a.distance - b.distance);

  const toggleSaved = (id) =>
    setSales((p) => p.map((s) => (s.id === id ? { ...s, saved: !s.saved } : s)));

  /* ── Auth ── */
  const handleSignUp = (data) => {
    const u = { id: Date.now(), ...data, createdAt: new Date().toISOString(), salesPosted: 0, rating: 0, bio: "", phone: "", avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)].hex };
    setUsers((p) => [...p, u]);
    setUser(u);
    setShowAuth(false);
  };
  const handleLogin = (email, pw) => {
    const u = users.find((x) => x.email === email && x.password === pw);
    if (u) { setUser(u); setShowAuth(false); return true; }
    return false;
  };
  const handleLogout = () => { setUser(null); setView("browse"); };
  const handleUpdateProfile = (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    setUsers((p) => p.map((u) => u.id === updated.id ? updated : u));
    setShowEditProfile(false);
  };

  /* ── Create sale ── */
  const handleCreateSale = (saleData) => {
    const newSale = {
      id: Date.now(),
      ...saleData,
      seller: { name: user?.name || "You", rating: 5.0, sales: 0 },
      saved: false,
    };
    setSales((p) => [...p, newSale]);
    setShowCreate(false);
  };

  /* ═══════════ RENDER ═══════════ */
  return (
    <div className="min-h-screen bg-stone-200" style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Archivo+Black&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>{`
        @keyframes fadeUp   { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
        @keyframes slideUp  { from { transform:translateY(100%) }           to { transform:translateY(0) } }
        @keyframes fadeIn   { from { opacity:0 }                            to { opacity:1 } }
        @keyframes pulse-ring { 0% { transform:scale(.8); opacity:.6 } 100% { transform:scale(2.2); opacity:0 } }
        @keyframes dropIn   { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes dropPin  { 0% { opacity:0; transform:translateY(-20px) scale(0.5) } 60% { transform:translateY(4px) scale(1.1) } 100% { opacity:1; transform:translateY(0) scale(1) } }
        .leaflet-container { width:100%; height:100%; font-family: inherit; }
        .leaflet-control-attribution { display:none !important; }
        .leaflet-control-zoom { border:none !important; box-shadow: 0 2px 12px rgba(0,0,0,0.15) !important; border-radius: 12px !important; overflow:hidden; }
        .leaflet-control-zoom a { width:36px !important; height:36px !important; line-height:36px !important; font-size:18px !important; color:#374151 !important; }
        .sale-marker { background:none; border:none; }
        .sale-marker-inner { width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#059669,#84cc16); border:3px solid white; box-shadow:0 3px 12px rgba(0,0,0,0.3); cursor:pointer; transition:transform 0.15s; }
        .sale-marker-inner:hover { transform:scale(1.2); }
        .sale-marker-inner svg { width:20px; height:20px; color:white; }
        .sale-marker-arrow { width:12px; height:12px; background:linear-gradient(135deg,#059669,#84cc16); transform:rotate(45deg); margin:-7px auto 0; border-right:3px solid white; border-bottom:3px solid white; }
        .user-marker { width:20px; height:20px; background:#3b82f6; border-radius:50%; border:3px solid white; box-shadow:0 2px 8px rgba(59,130,246,0.5); }
        .user-marker-pulse { position:absolute; inset:-8px; background:rgba(59,130,246,0.25); border-radius:50%; animation:pulse-ring 2s ease-out infinite; }
        .leaflet-popup-content-wrapper { border-radius:16px !important; box-shadow:0 4px 20px rgba(0,0,0,0.15) !important; padding:0 !important; }
        .leaflet-popup-content { margin:0 !important; }
        .leaflet-popup-tip { background:white !important; }
        @keyframes dropPin  { 0% { opacity:0; transform:translate(-50%,-200%) scale(0.3) } 60% { transform:translate(-50%,-100%) scale(1.1) } 100% { opacity:1; transform:translate(-50%,-100%) scale(1) } }
      `}</style>

      {/* ──── PHONE FRAME ──── */}
      <div className="max-w-md mx-auto bg-white min-h-screen relative shadow-2xl overflow-hidden">

        {/* ──── HEADER ──── */}
        <header className="relative px-4 pt-11 pb-4 z-[1100]" style={{ background: "linear-gradient(135deg, #065f46 0%, #059669 40%, #84cc16 100%)" }}>
          {/* Subtle gradient overlay only — no circles blocking the logo */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-lime-400 opacity-[0.15]" />
          </div>

          <div className="relative z-10">
            {/* Title row */}
            <div className="flex items-center justify-between mb-3">
              {/* Original wooden sign logo */}
              <LogoImage />

              <div className="flex items-center gap-2">
                {/* Location chip */}
                <button onClick={requestLocation}
                  className="flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full text-xs font-semibold text-white/90 bg-white/15 backdrop-blur hover:bg-white/25 transition-all max-w-[160px] truncate">
                  {locLoading
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : locErr ? <AlertCircle className="w-3.5 h-3.5 text-amber-300" /> : <Crosshair className="w-3.5 h-3.5" />}
                  <span className="truncate">{locLoading ? "Locating…" : locName || "Get Location"}</span>
                </button>

                {/* Profile */}
                <button onClick={() => user ? setView("profile") : setShowAuth(true)}
                  className="w-10 h-10 rounded-full bg-white/15 backdrop-blur flex items-center justify-center hover:bg-white/25 transition-all">
                  {user
                    ? <span className="text-white font-bold text-sm">{user.name.split(" ").map((n) => n[0]).join("").toUpperCase()}</span>
                    : <User className="w-5 h-5 text-white" />}
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-2.5">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-emerald-600" />
              <input type="text" placeholder="Search yard sales near you…" value={query} onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white shadow-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-lime-400 text-sm" />
            </div>

            {/* Distance dropdown + category filter */}
            <div className="flex items-center gap-2 relative z-50">
              <button onClick={(e) => { e.stopPropagation(); setDistOpen(!distOpen); }}
                className="flex items-center gap-1.5 px-3.5 py-[7px] bg-white/20 backdrop-blur rounded-full text-white text-[13px] font-semibold hover:bg-white/30 transition">
                <MapPin className="w-3.5 h-3.5" />
                {distLabel(dist, unit)}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${distOpen ? "rotate-180" : ""}`} />
              </button>
              {/* Category filter */}
              <button onClick={(e) => { e.stopPropagation(); setShowCatFilter(!showCatFilter); }}
                className={`flex items-center gap-1.5 px-3 py-[7px] backdrop-blur rounded-full text-[13px] font-semibold transition ${catFilter ? "bg-white text-emerald-700" : "bg-white/20 text-white hover:bg-white/30"}`}>
                <Filter className="w-3.5 h-3.5" />
                {catFilter || "All"}
              </button>
              {distOpen && <>
                <div className="fixed inset-0 z-40" onClick={() => setDistOpen(false)} />
                <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl overflow-hidden min-w-[160px] border border-stone-100 z-50" style={{ animation: "dropIn .2s ease-out" }}>
                  {/* Unit toggle */}
                  <div className="px-3 pt-3 pb-2 flex gap-1">
                    {["mi", "km"].map((u) => (
                      <button key={u} onClick={(e) => { e.stopPropagation(); setUnit(u); }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${unit === u ? "bg-emerald-500 text-white" : "bg-stone-100 text-stone-500"}`}>
                        {u === "mi" ? "Miles" : "Kilometers"}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-stone-100" />
                  {DIST_VALUES.map((o) => (
                    <button key={o} onClick={(e) => { e.stopPropagation(); setDist(o); setDistOpen(false); }}
                      className={`w-full px-4 py-3 text-left text-sm font-medium flex items-center justify-between hover:bg-emerald-50 transition ${dist === o ? "bg-emerald-50 text-emerald-600" : "text-stone-700"}`}>
                      {distLabel(o, unit)}
                      {dist === o && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </>}
              {showCatFilter && <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCatFilter(false)} />
                <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl overflow-hidden w-[200px] max-h-[300px] overflow-y-auto border border-stone-100 z-50" style={{ animation: "dropIn .2s ease-out" }}>
                  <button onClick={(e) => { e.stopPropagation(); setCatFilter(null); setShowCatFilter(false); }}
                    className={`w-full px-4 py-3 text-left text-sm font-medium hover:bg-emerald-50 transition ${!catFilter ? "bg-emerald-50 text-emerald-600" : "text-stone-700"}`}>
                    All Categories
                  </button>
                  {CATEGORIES.map((c) => (
                    <button key={c} onClick={(e) => { e.stopPropagation(); setCatFilter(c); setShowCatFilter(false); }}
                      className={`w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-emerald-50 transition ${catFilter === c ? "bg-emerald-50 text-emerald-600" : "text-stone-600"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </>}
            </div>
          </div>
        </header>

        {/* Location error banner */}
        {locErr && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-amber-700 text-[13px]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{locErr}</span>
            <button onClick={requestLocation} className="font-semibold hover:underline">Retry</button>
          </div>
        )}

        {/* ──── MAIN CONTENT ──── */}
        <main className="pb-24 overflow-y-auto" style={{ height: "calc(100vh - 210px)" }}>
          {view === "browse" && <BrowseView sales={filtered} onSelect={setSelectedSale} onToggleSaved={toggleSaved} dist={dist} unit={unit} loading={locLoading} catFilter={catFilter} onClearCat={() => setCatFilter(null)} />}
          {view === "map" && <LeafletMapView sales={filtered} onSelect={setSelectedSale} userLocation={loc} dist={dist} />}
          {view === "saved" && <SavedView sales={withDist.filter((s) => s.saved)} onSelect={setSelectedSale} onToggleSaved={toggleSaved} />}
          {view === "profile" && <ProfileView user={user} onLogout={handleLogout} onCreateSale={() => setShowCreate(true)} onLogin={() => setShowAuth(true)} onEditProfile={() => setShowEditProfile(true)} unit={unit} onToggleUnit={() => setUnit(unit === "mi" ? "km" : "mi")} />}
        </main>

        {/* ──── BOTTOM NAV ──── */}
        <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-6 py-3 flex justify-around items-center z-30">
          <NavBtn icon={Home} label="Browse" active={view === "browse"} onClick={() => setView("browse")} />
          <NavBtn icon={Map} label="Map" active={view === "map"} onClick={() => setView("map")} />
          <button onClick={() => user ? setShowCreate(true) : setShowAuth(true)}
            className="w-14 h-14 -mt-7 rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>
            <Plus className="w-7 h-7 text-white" />
          </button>
          <NavBtn icon={Heart} label="Saved" active={view === "saved"} onClick={() => setView("saved")} />
          <NavBtn icon={User} label="Profile" active={view === "profile"} onClick={() => user ? setView("profile") : setShowAuth(true)} />
        </nav>

        {/* ──── MODALS ──── */}
        {selectedSale && <SaleDetail sale={selectedSale} onClose={() => setSelectedSale(null)} onToggleSaved={toggleSaved} userLocation={loc} />}
        {showAuth && <AuthModal mode={authMode} onModeChange={setAuthMode} onClose={() => setShowAuth(false)} onSignUp={handleSignUp} onLogin={handleLogin} users={users} />}
        {showCreate && <CreateSaleModal onClose={() => setShowCreate(false)} userLocation={loc} onCreate={handleCreateSale} />}
        {showEditProfile && user && <EditProfileModal user={user} onClose={() => setShowEditProfile(false)} onSave={handleUpdateProfile} />}
      </div>
    </div>
  );
}

/* ══════════════════ LOGO IMAGE ══════════════════ */
const LOGO_B64 = "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";

function LogoImage() {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    try {
      const bin = atob(LOGO_B64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "image/png" });
      const url = URL.createObjectURL(blob);
      setSrc(url);
      return () => URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Logo load failed:", e);
    }
  }, []);
  if (!src) return <span style={{ fontFamily: "'Archivo Black',sans-serif", fontSize: 28, color: "white" }}>Yard<span style={{ color: "#bef264" }}>$</span></span>;
  return <img src={src} alt="Yard$" style={{ height: 54, width: "auto", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.25))" }} />;
}

/* ══════════════════ NAV BUTTON ══════════════════ */
function NavBtn({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-0.5 transition ${active ? "text-emerald-600" : "text-stone-400 hover:text-stone-600"}`}>
      <Icon className="w-6 h-6" />
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}

/* ══════════════════ BROWSE VIEW ══════════════════ */
function BrowseView({ sales, onSelect, onToggleSaved, dist, unit, loading, catFilter, onClearCat }) {
  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl shadow overflow-hidden border border-stone-100">
            <div className="h-40 bg-stone-200 animate-pulse" />
            <div className="p-4 space-y-3">
              <div className="h-5 w-3/4 bg-stone-200 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-stone-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">Nearby Sales</h2>
        <span className="text-[13px] text-stone-500">{sales.length} within {distLabel(dist, unit)}</span>
      </div>

      {/* Active category filter chip */}
      {catFilter && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500">Filtered by:</span>
          <button onClick={onClearCat}
            className="flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
            {catFilter} <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {sales.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-stone-300" />
          </div>
          <h3 className="font-bold text-stone-800 mb-1">No Sales Found</h3>
          <p className="text-stone-500 text-sm">Try expanding your search distance.</p>
        </div>
      ) : (
        sales.map((s, i) => <SaleCard key={s.id} sale={s} onClick={() => onSelect(s)} onToggleSaved={() => onToggleSaved(s.id)} delay={i * 0.04} />)
      )}
    </div>
  );
}

/* ══════════════════ SALE CARD ══════════════════ */
function SaleCard({ sale, onClick, onToggleSaved, delay = 0 }) {
  return (
    <div onClick={onClick}
      className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-all cursor-pointer border border-stone-100"
      style={{ animation: `fadeUp .4s ease-out ${delay}s both` }}>
      <div className="relative h-40 bg-stone-200">
        <img src={sale.photos[0]} alt="" className="w-full h-full object-cover" />
        <button onClick={(e) => { e.stopPropagation(); onToggleSaved(); }}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition ${sale.saved ? "bg-rose-500 text-white" : "bg-white/90 text-stone-600 hover:bg-white"}`}>
          <Heart className={`w-5 h-5 ${sale.saved ? "fill-current" : ""}`} />
        </button>
        <div className="absolute bottom-3 left-3 px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full shadow">{sale.distanceText}</div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-stone-800 mb-1 truncate">{sale.title}</h3>
        {sale.address && (
          <div className="flex items-center gap-1.5 text-emerald-600 text-[12px] mb-1 font-medium">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{sale.address}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-stone-500 text-[13px] mb-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>{sale.date}</span>
        </div>
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {sale.tags.slice(0, 3).map((t) => (
            <span key={t} className="px-2 py-0.5 bg-stone-100 text-stone-600 text-[11px] font-medium rounded-full">{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ REAL LEAFLET MAP VIEW ══════════════════
   Interactive OpenStreetMap with real streets, zoom, and pan.
   Sales shown as custom pins. User location as blue pulsing dot.
   ═══════════════════════════════════════════════════════════ */

// Global Leaflet loader — shared across all map instances
let leafletLoadPromise = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletLoadPromise) return leafletLoadPromise;
  leafletLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Failed to load Leaflet"));
    document.head.appendChild(script);
  });
  return leafletLoadPromise;
}

function LeafletMapView({ sales, onSelect, userLocation, dist }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [selectedPin, setSelectedPin] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  // Load Leaflet and initialize map
  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    loadLeaflet().then((L) => {
      if (cancelled || !mapRef.current || mapInstanceRef.current) return;

      const center = userLocation ? [userLocation.lat, userLocation.lng] : [42.3149, -83.0364];
      const zoom = dist <= 2 ? 15 : dist <= 5 ? 14 : dist <= 10 ? 13 : dist <= 25 ? 12 : 11;

      const map = L.map(mapRef.current, {
        center,
        zoom,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      // User location marker
      if (userLocation) {
        const userIcon = L.divIcon({
          className: "user-marker-container",
          html: `<div style="position:relative"><div class="user-marker"></div><div class="user-marker-pulse"></div></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, interactive: false }).addTo(map);

        // Radius circle
        const radiusMeters = dist * 1609.34;
        L.circle([userLocation.lat, userLocation.lng], {
          radius: radiusMeters,
          color: "#059669",
          weight: 2,
          opacity: 0.3,
          fillColor: "#059669",
          fillOpacity: 0.04,
          dashArray: "8, 6",
        }).addTo(map);
      }

      mapInstanceRef.current = map;
      setMapReady(true);

      // Fix map size after render
      setTimeout(() => map.invalidateSize(), 100);
    }).catch(() => {
      if (!cancelled) setMapError(true);
    });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapReady(false);
      }
    };
  }, [userLocation]);

  // Update zoom when distance changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const zoom = dist <= 2 ? 15 : dist <= 5 ? 14 : dist <= 10 ? 13 : dist <= 25 ? 12 : 11;
    mapInstanceRef.current.setZoom(zoom);
  }, [dist]);

  // Add sale markers
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    sales.forEach((sale, i) => {
      const saleIcon = L.divIcon({
        className: "sale-marker",
        html: `<div style="animation:dropPin 0.4s ease-out ${i * 0.06}s both">
          <div class="sale-marker-inner">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div class="sale-marker-arrow"></div>
        </div>`,
        iconSize: [40, 52],
        iconAnchor: [20, 52],
        popupAnchor: [0, -52],
      });

      const marker = L.marker([sale.coords.lat, sale.coords.lng], { icon: saleIcon });

      const popupContent = `
        <div style="padding:12px;min-width:180px;font-family:'DM Sans',sans-serif;">
          <div style="font-weight:700;font-size:13px;color:#1c1917;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;">${sale.title}</div>
          ${sale.address ? `<div style="font-size:11px;color:#059669;margin-bottom:2px;">📍 ${sale.address}</div>` : ""}
          <div style="font-size:11px;color:#059669;font-weight:600;">${sale.distanceText} · ${sale.date}</div>
          <div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap;">
            ${sale.tags.slice(0, 3).map((t) => `<span style="padding:2px 8px;background:#f5f5f4;border-radius:99px;font-size:10px;color:#57534e;">${t}</span>`).join("")}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { closeButton: false, offset: [0, 0] });
      marker.on("click", () => setSelectedPin(sale.id));
      marker.addTo(map);
      markersRef.current.push(marker);
    });
  }, [sales, mapReady]);

  return (
    <div className="relative h-full" style={{ minHeight: 500 }}>
      {/* Map container */}
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {!mapReady && !mapError && (
        <div className="absolute inset-0 bg-emerald-50 flex items-center justify-center z-10">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-2" />
            <p className="text-emerald-700 font-medium text-sm">Loading map…</p>
          </div>
        </div>
      )}

      {mapError && (
        <div className="absolute inset-0 bg-stone-50 flex items-center justify-center z-10">
          <div className="text-center p-6">
            <AlertCircle className="w-10 h-10 text-stone-400 mx-auto mb-3" />
            <p className="text-stone-600 font-medium">Map couldn't load</p>
            <p className="text-stone-400 text-sm mt-1">Check your internet connection</p>
          </div>
        </div>
      )}

      {/* Floating info overlays */}
      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur rounded-xl px-3 py-2 shadow-lg z-[1000]">
        <p className="text-[11px] text-stone-500 font-medium">Showing</p>
        <p className="text-sm font-bold text-emerald-600">{sales.length} sale{sales.length !== 1 ? "s" : ""} nearby</p>
      </div>
      <div className="absolute top-3 right-3 bg-white/95 backdrop-blur rounded-xl p-2.5 shadow-lg z-[1000] space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] text-stone-600">
          <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow" />You
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-stone-600">
          <div className="w-3 h-3 rounded-full" style={{ background: "linear-gradient(135deg,#059669,#84cc16)" }} />Sale
        </div>
      </div>

      {/* Selected sale bottom sheet */}
      {selectedPin && (() => {
        const sale = sales.find((s) => s.id === selectedPin);
        if (!sale) return null;
        return (
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-[1000] p-4"
            style={{ animation: "slideUp .25s ease-out" }}>
            <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto mb-3" />
            <div className="flex gap-3 items-start cursor-pointer" onClick={() => { onSelect(sale); setSelectedPin(null); }}>
              <img src={sale.photos[0]} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-stone-800 text-sm truncate">{sale.title}</h3>
                {sale.address && <p className="text-emerald-600 text-xs font-medium mt-0.5">📍 {sale.address}</p>}
                <p className="text-stone-500 text-xs mt-0.5">{sale.distanceText} · {sale.date}</p>
                <div className="flex gap-1 mt-1.5">
                  {sale.tags.slice(0, 2).map((t) => (
                    <span key={t} className="px-2 py-0.5 bg-stone-100 text-stone-500 text-[10px] font-medium rounded-full">{t}</span>
                  ))}
                </div>
              </div>
              <ChevronLeft className="w-5 h-5 text-stone-400 rotate-180 flex-shrink-0 mt-1" />
            </div>
            <button onClick={() => setSelectedPin(null)} className="absolute top-3 right-3 p-1 hover:bg-stone-100 rounded-full">
              <X className="w-4 h-4 text-stone-400" />
            </button>
          </div>
        );
      })()}
    </div>
  );
}

/* ══════════════════ SAVED VIEW ══════════════════ */
function SavedView({ sales, onSelect, onToggleSaved }) {
  if (!sales.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-4">
          <Heart className="w-10 h-10 text-stone-300" />
        </div>
        <h3 className="text-lg font-bold text-stone-800 mb-1">No Saved Sales</h3>
        <p className="text-stone-500 text-sm">Tap the heart on any sale to save it!</p>
      </div>
    );
  }
  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-bold text-stone-800">Saved Sales</h2>
      {sales.map((s, i) => <SaleCard key={s.id} sale={s} onClick={() => onSelect(s)} onToggleSaved={() => onToggleSaved(s.id)} delay={i * 0.04} />)}
    </div>
  );
}

/* ══════════════════ PROFILE VIEW ══════════════════ */
function ProfileView({ user, onLogout, onCreateSale, onLogin, onEditProfile, unit, onToggleUnit }) {
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <User className="w-10 h-10 text-emerald-500" />
        </div>
        <h3 className="text-lg font-bold text-stone-800 mb-2">Sign In to Continue</h3>
        <p className="text-stone-500 mb-6 text-sm">Create an account to post your own yard sales!</p>
        <button onClick={onLogin}
          className="px-8 py-3 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition"
          style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>
          Sign In or Create Account
        </button>
      </div>
    );
  }

  const initials = user.name.split(" ").map((n) => n[0]).join("").toUpperCase();
  const avatarBg = user.avatarColor || "#059669";

  return (
    <div className="p-4">
      {/* Profile card */}
      <div className="rounded-2xl p-6 text-white mb-4 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #065f46, #059669, #84cc16)" }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg border-2 border-white/30" style={{ background: avatarBg }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-white/70 text-sm">{user.email}</p>
            {user.bio && <p className="text-white/60 text-xs mt-1 truncate">{user.bio}</p>}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-stone-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-stone-800">{user.salesPosted || 0}</p>
          <p className="text-stone-500 text-[11px]">Sales Posted</p>
        </div>
        <div className="bg-stone-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-stone-800">{user.rating || "—"}</p>
          <p className="text-stone-500 text-[11px]">Rating</p>
        </div>
        <div className="bg-stone-50 rounded-xl p-3 text-center">
          <p className="text-[11px] text-stone-500 mb-1">Distance</p>
          <button onClick={onToggleUnit}
            className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full hover:bg-emerald-200 transition">
            {unit === "mi" ? "Miles" : "km"} ↔
          </button>
        </div>
      </div>

      {/* Member since */}
      <div className="bg-stone-50 rounded-xl p-4 mb-4">
        <p className="text-stone-500 text-sm">Member since</p>
        <p className="text-stone-800 font-medium">{new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
      </div>

      <div className="space-y-3">
        <ProfileBtn icon={UserCircle} color="emerald" label="Edit Profile" onClick={onEditProfile} />
        <ProfileBtn icon={Plus} color="emerald" label="Post a Yard Sale" onClick={onCreateSale} />
        <ProfileBtn icon={Eye} color="stone" label="My Sales" />
        <ProfileBtn icon={LogOut} color="rose" label="Sign Out" onClick={onLogout} />
      </div>
    </div>
  );
}

function ProfileBtn({ icon: Icon, color, label, onClick }) {
  const bg = { emerald: "bg-emerald-100", stone: "bg-stone-100", rose: "bg-rose-100" }[color];
  const fg = { emerald: "text-emerald-600", stone: "text-stone-600", rose: "text-rose-600" }[color];
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-stone-100 hover:shadow-md transition">
      <div className={`w-10 h-10 ${bg} rounded-full flex items-center justify-center`}><Icon className={`w-5 h-5 ${fg}`} /></div>
      <span className="font-medium text-stone-800">{label}</span>
    </button>
  );
}

/* ══════════════════ SALE DETAIL ══════════════════ */
function SaleDetail({ sale, onClose, onToggleSaved, userLocation }) {
  const [photo, setPhoto] = useState(0);

  const openDirections = () => {
    const dest = `${sale.coords.lat},${sale.coords.lng}`;
    const orig = userLocation ? `${userLocation.lat},${userLocation.lng}` : "";
    window.open(`https://www.google.com/maps/dir/${orig}/${dest}`, "_blank");
  };

  return (
    <div className="absolute inset-0 bg-white z-50 overflow-y-auto" style={{ animation: "slideUp .3s ease-out" }}>
      {/* Photos */}
      <div className="relative h-72 bg-stone-200">
        <img src={sale.photos[photo]} alt="" className="w-full h-full object-cover" />
        <button onClick={onClose} className="absolute top-12 left-4 w-10 h-10 bg-black/40 backdrop-blur rounded-full flex items-center justify-center">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <button onClick={() => onToggleSaved(sale.id)}
          className={`absolute top-12 right-4 w-10 h-10 rounded-full flex items-center justify-center ${sale.saved ? "bg-rose-500 text-white" : "bg-black/40 backdrop-blur text-white"}`}>
          <Heart className={`w-5 h-5 ${sale.saved ? "fill-current" : ""}`} />
        </button>
        {sale.photos.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {sale.photos.map((_, i) => (
              <button key={i} onClick={() => setPhoto(i)}
                className={`h-2 rounded-full transition-all ${photo === i ? "bg-white w-6" : "bg-white/50 w-2"}`} />
            ))}
          </div>
        )}
      </div>

      <div className="p-6 space-y-5 pb-8">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold text-stone-800">{sale.title}</h1>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-bold rounded-full whitespace-nowrap">{sale.distanceText}</span>
          </div>
          {sale.address && (
            <div className="flex items-center gap-1.5 text-stone-600 mt-2 text-sm">
              <MapPin className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>{sale.address}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-emerald-600 font-medium mt-1.5 text-sm">
            <Clock className="w-4 h-4" />{sale.date}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {sale.tags.map((t) => <span key={t} className="px-3 py-1 bg-stone-100 text-stone-600 text-sm font-medium rounded-full">{t}</span>)}
        </div>

        <div>
          <h2 className="font-bold text-stone-800 mb-1.5">About This Sale</h2>
          <p className="text-stone-600 text-sm leading-relaxed">{sale.description}</p>
        </div>

        {/* Seller */}
        <div className="p-4 bg-stone-50 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow"
              style={{ background: sale.seller.avatarColor || "#059669" }}>
              {sale.seller.name.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="font-bold text-stone-800">{sale.seller.name}</p>
              <div className="flex items-center gap-2 text-sm text-stone-500">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> {sale.seller.rating} · {sale.seller.sales} sales
              </div>
            </div>
          </div>
          {sale.seller.bio && (
            <p className="text-stone-500 text-xs mt-3 leading-relaxed border-t border-stone-200 pt-3">"{sale.seller.bio}"</p>
          )}
        </div>

        {/* Mini map — Real Leaflet map */}
        <div>
          <h2 className="font-bold text-stone-800 mb-2">Location</h2>
          <MiniMap lat={sale.coords.lat} lng={sale.coords.lng} address={sale.address} />
        </div>

        <button onClick={openDirections}
          className="w-full py-4 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition"
          style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>
          <Navigation className="w-5 h-5" /> Get Directions
        </button>
      </div>
    </div>
  );
}

/* ══════════════════ MINI MAP ══════════════════ */
function MiniMap({ lat, lng, address }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!window.L || !ref.current) {
      // Try again after Leaflet loads
      const check = setInterval(() => {
        if (window.L && ref.current) {
          clearInterval(check);
          init();
        }
      }, 200);
      return () => clearInterval(check);
    }
    init();
    function init() {
      const L = window.L;
      const map = L.map(ref.current, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        attributionControl: false,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
      const icon = L.divIcon({
        className: "sale-marker",
        html: `<div class="sale-marker-inner"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div><div class="sale-marker-arrow"></div>`,
        iconSize: [40, 52],
        iconAnchor: [20, 52],
      });
      L.marker([lat, lng], { icon }).addTo(map);
      return () => map.remove();
    }
  }, [lat, lng]);

  return (
    <div className="relative h-40 rounded-xl overflow-hidden shadow-inner">
      <div ref={ref} className="absolute inset-0" />
      {address && (
        <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur rounded-lg px-2.5 py-1.5 text-[11px] text-stone-700 font-medium shadow z-[1000]">
          📍 {address}
        </div>
      )}
    </div>
  );
}

/* ══════════════════ AUTH MODAL ══════════════════ */
function AuthModal({ mode, onModeChange, onClose, onSignUp, onLogin, users: existingUsers }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [errs, setErrs] = useState({});
  const [loginErr, setLoginErr] = useState("");
  const [showPw, setShowPw] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setLoginErr("");
    const newErrs = {};

    if (mode === "signup") {
      if (!name.trim()) newErrs.name = "Name is required";
      if (!email.trim()) newErrs.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrs.email = "Invalid email";
      else if (existingUsers.some((u) => u.email.toLowerCase() === email.toLowerCase())) newErrs.email = "Account already exists";
      if (!pw || pw.length < 8) newErrs.pw = "At least 8 characters";
      if (pw !== pw2) newErrs.pw2 = "Passwords don't match";
      setErrs(newErrs);
      if (!Object.keys(newErrs).length) onSignUp({ name: name.trim(), email: email.trim().toLowerCase(), password: pw });
    } else {
      if (!email.trim()) newErrs.email = "Email required";
      if (!pw) newErrs.pw = "Password required";
      setErrs(newErrs);
      if (!Object.keys(newErrs).length && !onLogin(email.trim().toLowerCase(), pw)) setLoginErr("Invalid email or password");
    }
  };

  const reset = () => { setErrs({}); setLoginErr(""); setName(""); setEmail(""); setPw(""); setPw2(""); onModeChange(mode === "login" ? "signup" : "login"); };

  return (
    <div className="absolute inset-0 bg-black/50 z-50 flex items-end" style={{ animation: "fadeIn .2s ease-out" }}>
      <div className="bg-white w-full rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto" style={{ animation: "slideUp .3s ease-out" }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold text-stone-800">{mode === "login" ? "Welcome Back!" : "Create Account"}</h2>
            <p className="text-stone-500 text-sm mt-0.5">{mode === "login" ? "Sign in to your Yard$ account" : "Join Yard$ to buy and sell locally"}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full"><X className="w-6 h-6 text-stone-500" /></button>
        </div>

        {loginErr && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />{loginErr}
          </div>
        )}

        <div className="space-y-4">
          {mode === "signup" && <AuthField icon={UserCircle} label="Full Name" value={name} onChange={setName} err={errs.name} placeholder="John Doe" />}
          <AuthField icon={Mail} label="Email" type="email" value={email} onChange={setEmail} err={errs.email} placeholder="you@example.com" />
          <AuthField icon={Lock} label="Password" type={showPw ? "text" : "password"} value={pw} onChange={setPw} err={errs.pw} placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
            right={<button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"><Eye className="w-5 h-5" /></button>} />
          {mode === "signup" && <AuthField icon={Lock} label="Confirm Password" type={showPw ? "text" : "password"} value={pw2} onChange={setPw2} err={errs.pw2} placeholder="Confirm password" />}

          <button onClick={submit}
            className="w-full py-4 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition"
            style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>
            {mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200" /></div>
          <div className="relative flex justify-center text-sm"><span className="px-4 bg-white text-stone-500">or</span></div>
        </div>

        <p className="text-center text-stone-600 text-sm">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={reset} className="text-emerald-600 font-semibold hover:underline">{mode === "login" ? "Sign Up" : "Sign In"}</button>
        </p>
      </div>
    </div>
  );
}

function AuthField({ icon: Icon, label, type = "text", value, onChange, err, placeholder, right }) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
        <input type={type} placeholder={placeholder} value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full pl-10 ${right ? "pr-12" : "pr-4"} py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm ${err ? "border-rose-300 bg-rose-50" : "border-stone-200"}`} />
        {right}
      </div>
      {err && <p className="text-rose-500 text-xs mt-1">{err}</p>}
    </div>
  );
}

/* ══════════════════ EDIT PROFILE MODAL ══════════════════ */
function EditProfileModal({ user, onClose, onSave }) {
  const [name, setName] = useState(user.name || "");
  const [bio, setBio] = useState(user.bio || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [avatarColor, setAvatarColor] = useState(user.avatarColor || "#059669");

  const initials = name.split(" ").map((n) => n[0] || "").join("").toUpperCase();

  return (
    <div className="absolute inset-0 bg-white z-50 overflow-y-auto" style={{ animation: "slideUp .3s ease-out" }}>
      <div className="sticky top-0 bg-white border-b border-stone-200 px-4 py-4 flex items-center gap-4 z-10">
        <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full"><ChevronLeft className="w-6 h-6 text-stone-600" /></button>
        <h1 className="text-xl font-bold text-stone-800">Edit Profile</h1>
      </div>

      <div className="p-5 space-y-6 pb-32">
        {/* Avatar preview */}
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg mb-3 transition-colors"
            style={{ background: avatarColor }}>
            {initials || "?"}
          </div>
          <p className="text-stone-500 text-sm">Choose your color</p>
          <div className="flex gap-2 mt-3 flex-wrap justify-center">
            {AVATAR_COLORS.map((c) => (
              <button key={c.hex} onClick={() => setAvatarColor(c.hex)}
                className={`w-9 h-9 rounded-full transition-all shadow-sm ${avatarColor === c.hex ? "ring-2 ring-offset-2 ring-emerald-500 scale-110" : "hover:scale-105"}`}
                style={{ background: c.hex }} />
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block font-medium text-stone-800 mb-1.5">Display Name</label>
          <div className="relative">
            <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
              className="w-full pl-10 pr-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block font-medium text-stone-800 mb-1.5">Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell buyers a little about yourself…" rows={3}
            className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm" />
          <p className="text-stone-400 text-xs mt-1">{bio.length}/150</p>
        </div>

        {/* Phone */}
        <div>
          <label className="block font-medium text-stone-800 mb-1.5">Phone (optional)</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567"
              className="w-full pl-10 pr-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
          </div>
        </div>

        {/* Email (read only) */}
        <div>
          <label className="block font-medium text-stone-800 mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input type="email" value={user.email} disabled
              className="w-full pl-10 pr-4 py-3 border border-stone-200 rounded-xl text-sm bg-stone-50 text-stone-500 cursor-not-allowed" />
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-white border-t border-stone-200">
        <button onClick={() => onSave({ name: name.trim() || user.name, bio: bio.slice(0, 150), phone, avatarColor })}
          className="w-full py-4 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition"
          style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>
          Save Changes
        </button>
      </div>
    </div>
  );
}

/* ══════════════════ CREATE SALE MODAL ══════════════════ */
function CreateSaleModal({ onClose, userLocation, onCreate }) {
  const [form, setForm] = useState({ title: "", description: "", address: "", date: "", startTime: "", endTime: "", categories: [], photos: [] });
  const [geoLoading, setGeoLoading] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const toggleCat = (c) => set("categories", form.categories.includes(c) ? form.categories.filter((x) => x !== c) : [...form.categories, c]);

  const useMyLocation = async () => {
    if (!userLocation) return;
    setGeoLoading(true);
    const geo = await reverseGeocode(userLocation.lat, userLocation.lng);
    set("address", geo.full || geo.short);
    setGeoLoading(false);
  };

  const handleSubmit = () => {
    if (!form.title || !form.description) return;
    onCreate({
      title: form.title,
      description: form.description,
      address: form.address,
      date: form.date ? new Date(form.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + (form.startTime ? `, ${form.startTime}` : "") + (form.endTime ? ` – ${form.endTime}` : "") : "TBD",
      photos: [SALE_PHOTOS[Math.floor(Math.random() * SALE_PHOTOS.length)]],
      tags: form.categories.length ? form.categories : ["General"],
      coords: userLocation || { lat: 49.2827, lng: -123.1207 },
    });
  };

  return (
    <div className="absolute inset-0 bg-white z-50 overflow-y-auto" style={{ animation: "slideUp .3s ease-out" }}>
      <div className="sticky top-0 bg-white border-b border-stone-200 px-4 py-4 flex items-center gap-4 z-10">
        <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full"><ChevronLeft className="w-6 h-6 text-stone-600" /></button>
        <h1 className="text-xl font-bold text-stone-800">Post a Yard Sale</h1>
      </div>

      <div className="p-5 space-y-5 pb-32">
        {/* Photos */}
        <div>
          <label className="block font-medium text-stone-800 mb-1.5">Photos</label>
          <p className="text-stone-500 text-xs mb-2">Add photos to attract more visitors</p>
          <button className="w-24 h-24 border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center text-stone-400 hover:border-emerald-500 hover:text-emerald-500 transition">
            <Camera className="w-6 h-6 mb-1" /><span className="text-[11px]">Add Photo</span>
          </button>
        </div>

        <Field label="Title *" placeholder="e.g., Moving Sale — Everything Must Go!" value={form.title} onChange={(v) => set("title", v)} />
        <div>
          <label className="block font-medium text-stone-800 mb-1.5">Description *</label>
          <textarea placeholder="Describe what you're selling…" rows={3} value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm" />
        </div>

        {/* Address with geolocation */}
        <div>
          <label className="block font-medium text-stone-800 mb-1.5">Address *</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input type="text" placeholder="Enter your address" value={form.address}
              onChange={(e) => set("address", e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
          </div>
          {userLocation && (
            <button onClick={useMyLocation} disabled={geoLoading}
              className="mt-2 text-emerald-600 text-sm font-medium flex items-center gap-1 hover:underline disabled:opacity-50">
              {geoLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
              {geoLoading ? "Getting address…" : "Use my current location"}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-medium text-stone-800 mb-1.5">Date *</label>
            <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)}
              className="w-full px-3 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
          </div>
          <div>
            <label className="block font-medium text-stone-800 mb-1.5">Start</label>
            <input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)}
              className="w-full px-3 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
          </div>
        </div>

        {/* Categories */}
        <div>
          <label className="block font-medium text-stone-800 mb-1.5">Categories</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button key={c} type="button" onClick={() => toggleCat(c)}
                className={`px-3 py-1.5 border rounded-full text-[13px] font-medium transition ${form.categories.includes(c) ? "bg-emerald-500 border-emerald-500 text-white" : "border-stone-200 text-stone-600 hover:border-emerald-500"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-white border-t border-stone-200">
        <button onClick={handleSubmit}
          className="w-full py-4 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition"
          style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>
          Post Your Sale
        </button>
      </div>
    </div>
  );
}

function Field({ label, placeholder, value, onChange }) {
  return (
    <div>
      <label className="block font-medium text-stone-800 mb-1.5">{label}</label>
      <input type="text" placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
    </div>
  );
}
