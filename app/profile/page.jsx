"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Plus, Eye, LogOut, UserCircle, ChevronLeft, Tag, Trash2, Clock, Calendar, CheckCircle, MessageCircle, Edit, ShieldCheck, Loader2, Rocket } from "lucide-react";
import { useApp } from "@/lib/AppContext";
import { AVATAR_COLORS } from "@/lib/constants";
import { formatSaleDate } from "@/lib/timeFormat";
import LocationAutocomplete from "@/components/LocationAutocomplete";

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center" style={{ minHeight: "50vh" }}><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>}>
      <ProfileInner />
    </Suspense>
  );
}

function ProfileInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user, profile, handleLogout, handleUpdateProfile, handleDeleteSale, setShowAuth,
    unit, setUnit, userSales, userActiveSales, userUpcomingSales, userPastSales,
  } = useApp();
  const [editing, setEditing] = useState(false);
  const [viewingSales, setViewingSales] = useState(false);

  // Open My Sales directly when arriving from the "Boost your ad" banner
  useEffect(() => {
    if (searchParams.get("view") === "sales" && user) {
      setViewingSales(true);
    }
  }, [searchParams, user]);

  if (!user || !profile) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center" style={{ minHeight: "50vh" }}>
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4"><User className="w-10 h-10 text-emerald-500" /></div>
        <h3 className="text-lg font-bold text-stone-800 mb-2 font-display">Sign In to Continue</h3>
        <p className="text-stone-500 mb-6 text-sm">Create an account to post your own yard sales!</p>
        <button onClick={() => setShowAuth(true)} className="px-8 py-3 text-white font-bold rounded-xl shadow-lg transition" style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>Sign In or Create Account</button>
        <button onClick={() => router.push("/contact")} className="mt-5 text-stone-500 text-sm font-medium hover:text-emerald-600 transition flex items-center gap-1.5">
          <MessageCircle className="w-4 h-4" /> Contact Us
        </button>
      </div>
    );
  }

  if (editing) return <EditProfile profile={profile} onSave={async (u) => { await handleUpdateProfile(u); setEditing(false); }} onClose={() => setEditing(false)} />;
  if (viewingSales) return <MySales
    activeSales={userActiveSales}
    upcomingSales={userUpcomingSales}
    pastSales={userPastSales}
    onClose={() => setViewingSales(false)}
    onDelete={handleDeleteSale}
    onView={(s) => { setViewingSales(false); router.push(`/sale/${s.id}`); }}
  />;

  const initials = profile.name.split(" ").map(n => n[0]).join("").toUpperCase();

  return (
    <div className="p-4">
      <div className="rounded-2xl p-6 text-white mb-4 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #065f46, #059669, #84cc16)" }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg border-2 border-white/30" style={{ background: profile.avatar_color || "#059669" }}>{initials}</div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold font-display">{profile.name}</h2>
            <p className="text-white/70 text-sm">{profile.email}</p>
            {profile.bio && <p className="text-white/60 text-xs mt-1 truncate">{profile.bio}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-stone-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-stone-800">{userSales.length}</p>
          <p className="text-stone-500 text-[11px]">Total Sales</p>
        </div>
        <div className="bg-stone-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-emerald-600">{userActiveSales.length + userUpcomingSales.length}</p>
          <p className="text-stone-500 text-[11px]">Active / Upcoming</p>
        </div>
        <div className="bg-stone-50 rounded-xl p-3 text-center">
          <p className="text-[11px] text-stone-500 mb-1">Distance</p>
          <button onClick={() => setUnit(unit === "mi" ? "km" : "mi")}
            className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full hover:bg-emerald-200 transition">
            {unit === "mi" ? "Miles" : "km"} ↔
          </button>
        </div>
      </div>

      <div className="bg-stone-50 rounded-xl p-4 mb-4">
        <p className="text-stone-500 text-sm">Member since</p>
        <p className="text-stone-800 font-medium">{new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
      </div>

      <div className="space-y-3">
        <PBtn icon={UserCircle} color="emerald" label="Edit Profile" onClick={() => setEditing(true)} />
        <PBtn icon={Plus} color="emerald" label="Post a Yard Sale" onClick={() => router.push("/create")} />
        <PBtn icon={Eye} color="stone" label={`My Sales (${userSales.length})`} onClick={() => setViewingSales(true)} />
        <PBtn icon={MessageCircle} color="stone" label="Contact Us" onClick={() => router.push("/contact")} />
        {profile?.role === "admin" && (
          <PBtn icon={ShieldCheck} color="emerald" label="Admin Dashboard" onClick={() => router.push("/admin")} />
        )}
        <PBtn icon={LogOut} color="rose" label="Sign Out" onClick={async () => { await handleLogout(); router.push("/"); }} />
      </div>
    </div>
  );
}

function PBtn({ icon: Icon, color, label, onClick }) {
  const c = { emerald: ["bg-emerald-100", "text-emerald-600"], stone: ["bg-stone-100", "text-stone-600"], rose: ["bg-rose-100", "text-rose-600"] }[color];
  return (
    <button onClick={onClick} className="w-full flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-stone-100 hover:shadow-md transition">
      <div className={`w-10 h-10 ${c[0]} rounded-full flex items-center justify-center`}><Icon className={`w-5 h-5 ${c[1]}`} /></div>
      <span className="font-medium text-stone-800">{label}</span>
    </button>
  );
}

function EditProfile({ profile, onSave, onClose }) {
  const [name, setName] = useState(profile.name || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [avatarColor, setAvatarColor] = useState(profile.avatar_color || "#059669");
  const [timeFormat, setTimeFormat] = useState(profile.time_format === "24h" ? "24h" : "12h");
  // Location pre-fill from existing profile if set
  const [location, setLocation] = useState(
    profile.location ? {
      label: profile.location,
      city: profile.location_city || "",
      region: profile.location_region || "",
      country: profile.location_country || "",
      lat: profile.location_lat,
      lng: profile.location_lng,
    } : null
  );
  const [saving, setSaving] = useState(false);
  const initials = name.split(" ").map(n => n[0] || "").join("").toUpperCase();

  const save = async () => {
    setSaving(true);
    const updates = {
      name: name.trim() || profile.name,
      bio: bio.slice(0, 150),
      phone,
      avatar_color: avatarColor,
      time_format: timeFormat,
    };
    // Only write location fields if user selected a new one
    if (location?.label) {
      updates.location = location.label;
      updates.location_city = location.city || "";
      updates.location_region = location.region || "";
      updates.location_country = location.country || "";
      updates.location_lat = location.lat || null;
      updates.location_lng = location.lng || null;
    }
    await onSave(updates);
    setSaving(false);
  };

  return (
    <div className="p-5 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full"><ChevronLeft className="w-6 h-6 text-stone-600" /></button>
        <h1 className="text-xl font-bold text-stone-800 font-display">Edit Profile</h1>
      </div>
      <div className="flex flex-col items-center">
        <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg mb-3" style={{ background: avatarColor }}>{initials || "?"}</div>
        <p className="text-stone-500 text-sm">Choose your color</p>
        <div className="flex gap-2 mt-3 flex-wrap justify-center">
          {AVATAR_COLORS.map(c => (
            <button key={c.hex} onClick={() => setAvatarColor(c.hex)} className={`w-9 h-9 rounded-full transition-all shadow-sm ${avatarColor === c.hex ? "ring-2 ring-offset-2 ring-emerald-500 scale-110" : "hover:scale-105"}`} style={{ background: c.hex }} />
          ))}
        </div>
      </div>
      <div>
        <label className="block font-medium text-stone-800 mb-1.5">Display Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
      </div>
      <div>
        <label className="block font-medium text-stone-800 mb-1.5">Bio</label>
        <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell buyers about yourself…" rows={3} className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm" />
        <p className="text-stone-400 text-xs mt-1">{bio.length}/150</p>
      </div>
      <div>
        <label className="block font-medium text-stone-800 mb-1.5">Phone <span className="text-stone-400 text-xs font-normal">(visible to buyers)</span></label>
        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(519) 555-1234" className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
      </div>

      <div>
        <label className="block font-medium text-stone-800 mb-1.5">Primary Yard Sale Area</label>
        <LocationAutocomplete
          value={location}
          onChange={setLocation}
          placeholder="e.g., Windsor, Ontario"
        />
        <p className="text-stone-400 text-xs mt-1.5">Where you yard sale most.</p>
      </div>

      {/* Preferences */}
      <div className="pt-2">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Preferences</p>
        <div className="bg-stone-50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-stone-800 text-sm">Time format</p>
              <p className="text-stone-500 text-xs mt-0.5">How sale times appear across the app</p>
            </div>
            <div className="flex items-center bg-white rounded-lg p-1 border border-stone-200">
              <button type="button" onClick={() => setTimeFormat("12h")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${timeFormat === "12h" ? "bg-emerald-600 text-white shadow-sm" : "text-stone-500 hover:text-stone-700"}`}>
                12h
              </button>
              <button type="button" onClick={() => setTimeFormat("24h")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${timeFormat === "24h" ? "bg-emerald-600 text-white shadow-sm" : "text-stone-500 hover:text-stone-700"}`}>
                24h
              </button>
            </div>
          </div>
          <p className="text-stone-400 text-[11px] mt-2">
            Preview: {timeFormat === "12h" ? "6:18 PM" : "18:18"}
          </p>
        </div>
      </div>

      <button onClick={save} disabled={saving} className="w-full py-4 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition disabled:opacity-70" style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

function MySales({ activeSales, upcomingSales, pastSales, onClose, onDelete, onView }) {
  const { profile } = useApp();
  const router = useRouter();
  const tf = profile?.time_format === "24h" ? "24h" : "12h";
  const [tab, setTab] = useState("active");
  const [deleting, setDeleting] = useState(null);

  const tabs = [
    { key: "active", label: "Active", count: activeSales.length, icon: Clock, color: "emerald" },
    { key: "upcoming", label: "Upcoming", count: upcomingSales.length, icon: Calendar, color: "blue" },
    { key: "past", label: "Past", count: pastSales.length, icon: CheckCircle, color: "stone" },
  ];

  const currentSales = tab === "active" ? activeSales : tab === "upcoming" ? upcomingSales : pastSales;
  const isPast = tab === "past";

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full"><ChevronLeft className="w-6 h-6 text-stone-600" /></button>
        <h1 className="text-xl font-bold text-stone-800 font-display">My Sales</h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1.5 mb-5 bg-stone-100 rounded-xl p-1">
        {tabs.map(t => {
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5
                ${active ? "bg-white shadow-sm text-stone-800" : "text-stone-500 hover:text-stone-700"}`}>
              <t.icon className={`w-3.5 h-3.5 ${active ? (t.color === "emerald" ? "text-emerald-500" : t.color === "blue" ? "text-blue-500" : "text-stone-400") : ""}`} />
              {t.label}
              {t.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold
                  ${active ? (t.color === "emerald" ? "bg-emerald-100 text-emerald-700" : t.color === "blue" ? "bg-blue-100 text-blue-700" : "bg-stone-200 text-stone-600") : "bg-stone-200 text-stone-500"}`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {!currentSales.length ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${isPast ? "bg-stone-100" : "bg-emerald-100"}`}>
            <Tag className={`w-10 h-10 ${isPast ? "text-stone-300" : "text-emerald-400"}`} />
          </div>
          <h3 className="text-lg font-bold text-stone-800 mb-2 font-display">
            {tab === "active" ? "No Active Sales" : tab === "upcoming" ? "No Upcoming Sales" : "No Past Sales"}
          </h3>
          <p className="text-stone-500 text-sm">
            {tab === "active" ? "Post a sale to see it here!" : tab === "upcoming" ? "Schedule a future sale to see it here." : "Your ended sales will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentSales.map((s, i) => (
            <div key={s.id}
              className={`rounded-2xl shadow-md border overflow-hidden ${isPast ? "bg-stone-50 border-stone-200 opacity-75" : "bg-white border-stone-100"}`}
              style={{ animation: `fadeUp 0.4s ease-out ${i * 0.05}s both` }}>
              <div className="flex gap-3 p-3 cursor-pointer" onClick={() => onView(s)}>
                {s.photos?.[0] ? (
                  <img src={s.photos[0]} alt="" className={`w-20 h-20 rounded-xl object-cover shrink-0 ${isPast ? "grayscale" : ""}`} />
                ) : (
                  <div className={`w-20 h-20 rounded-xl flex items-center justify-center shrink-0 ${isPast ? "bg-stone-200" : "bg-emerald-100"}`}>
                    <span className="text-2xl">🏷️</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold text-sm truncate ${isPast ? "text-stone-500" : "text-stone-800"}`}>{s.title}</h3>
                    {isPast && (
                      <span className="px-2 py-0.5 bg-stone-200 text-stone-500 text-[10px] font-semibold rounded-full shrink-0">Ended</span>
                    )}
                    {tab === "upcoming" && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-semibold rounded-full shrink-0">Upcoming</span>
                    )}
                    {!isPast && s.boostedUntil && new Date(s.boostedUntil).getTime() > Date.now() && (
                      <span className="px-2 py-0.5 text-white text-[10px] font-semibold rounded-full shrink-0 flex items-center gap-0.5" style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}>✦ Featured</span>
                    )}
                  </div>
                  {s.address && <p className={`text-xs mt-0.5 ${isPast ? "text-stone-400" : "text-emerald-600"}`}>📍 {s.address}</p>}
                  <p className={`text-xs mt-0.5 ${isPast ? "text-stone-400" : "text-stone-500"}`}>{s.dateRaw ? formatSaleDate(s.dateRaw, s.startTime, s.endTime, tf, s.endDateRaw) : (s.date || "TBD")}</p>
                  <p className="text-xs mt-0.5 text-stone-400 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> {(s.viewCount || 0).toLocaleString()} {s.viewCount === 1 ? "view" : "views"}
                  </p>
                </div>
              </div>

              <div className="px-3 pb-3 flex gap-2">
                {!isPast && !(s.boostedUntil && new Date(s.boostedUntil).getTime() > Date.now()) && (
                  <button onClick={() => router.push(`/sale/${s.id}`)}
                    className="flex-1 py-2 text-white font-medium rounded-lg text-xs flex items-center justify-center gap-1 transition" style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}>
                    <Rocket className="w-3.5 h-3.5" /> Boost
                  </button>
                )}
                {!isPast && (
                  <button onClick={() => router.push(`/create?edit=${s.id}`)}
                    className="flex-1 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium rounded-lg text-xs flex items-center justify-center gap-1 hover:bg-emerald-100 transition">
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
                <button onClick={() => setDeleting(deleting === s.id ? null : s.id)}
                  className="flex-1 py-2 bg-rose-50 border border-rose-200 text-rose-600 font-medium rounded-lg text-xs flex items-center justify-center gap-1 hover:bg-rose-100 transition">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
              {deleting === s.id && (
                <div className="px-3 pb-3">
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                    <p className="text-rose-700 text-xs mb-2">Delete permanently?</p>
                    <div className="flex gap-2">
                      <button onClick={() => setDeleting(null)} className="flex-1 py-1.5 bg-white border border-stone-200 text-stone-600 rounded text-xs">Cancel</button>
                      <button onClick={async () => { await onDelete(s.id); setDeleting(null); }} className="flex-1 py-1.5 bg-rose-600 text-white rounded text-xs">Delete</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
