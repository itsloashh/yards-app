"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Plus, Eye, LogOut, UserCircle, ChevronLeft, Star, Tag, Trash2 } from "lucide-react";
import { useApp } from "@/lib/AppContext";
import { AVATAR_COLORS } from "@/lib/constants";

export default function ProfilePage() {
  const router = useRouter();
  const { user, handleLogout, handleUpdateProfile, handleDeleteSale, setShowAuth, unit, setUnit, userSales } = useApp();
  const [editing, setEditing] = useState(false);
  const [viewingSales, setViewingSales] = useState(false);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center" style={{ minHeight: "50vh" }}>
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4"><User className="w-10 h-10 text-emerald-500" /></div>
        <h3 className="text-lg font-bold text-stone-800 mb-2 font-display">Sign In to Continue</h3>
        <p className="text-stone-500 mb-6 text-sm">Create an account to post your own yard sales!</p>
        <button onClick={() => setShowAuth(true)} className="px-8 py-3 text-white font-bold rounded-xl shadow-lg transition" style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>Sign In or Create Account</button>
      </div>
    );
  }

  if (editing) return <EditProfile user={user} onSave={(u) => { handleUpdateProfile(u); setEditing(false); }} onClose={() => setEditing(false)} />;
  if (viewingSales) return <MySales sales={userSales} onClose={() => setViewingSales(false)} onDelete={handleDeleteSale} onView={(s) => { setViewingSales(false); router.push(`/sale/${s.id}`); }} />;

  const initials = user.name.split(" ").map(n => n[0]).join("").toUpperCase();

  return (
    <div className="p-4">
      <div className="rounded-2xl p-6 text-white mb-4 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #065f46, #059669, #84cc16)" }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg border-2 border-white/30" style={{ background: user.avatarColor || "#059669" }}>{initials}</div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold font-display">{user.name}</h2>
            <p className="text-white/70 text-sm">{user.email}</p>
            {user.bio && <p className="text-white/60 text-xs mt-1 truncate">{user.bio}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-stone-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-stone-800">{userSales.length}</p>
          <p className="text-stone-500 text-[11px]">Sales Posted</p>
        </div>
        <div className="bg-stone-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-stone-800">{user.rating || "—"}</p>
          <p className="text-stone-500 text-[11px]">Rating</p>
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
        <p className="text-stone-800 font-medium">{new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
      </div>

      <div className="space-y-3">
        <PBtn icon={UserCircle} color="emerald" label="Edit Profile" onClick={() => setEditing(true)} />
        <PBtn icon={Plus} color="emerald" label="Post a Yard Sale" onClick={() => router.push("/create")} />
        <PBtn icon={Eye} color="stone" label={`My Sales (${userSales.length})`} onClick={() => setViewingSales(true)} />
        <PBtn icon={LogOut} color="rose" label="Sign Out" onClick={() => { handleLogout(); router.push("/"); }} />
      </div>
    </div>
  );
}

function PBtn({ icon: Icon, color, label, onClick }) {
  const c = { emerald: ["bg-emerald-100", "text-emerald-600"], stone: ["bg-stone-100", "text-stone-600"], rose: ["bg-rose-100", "text-rose-600"] }[color] || ["bg-stone-100", "text-stone-600"];
  return (
    <button onClick={onClick} className="w-full flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-stone-100 hover:shadow-md transition">
      <div className={`w-10 h-10 ${c[0]} rounded-full flex items-center justify-center`}><Icon className={`w-5 h-5 ${c[1]}`} /></div>
      <span className="font-medium text-stone-800">{label}</span>
    </button>
  );
}

function EditProfile({ user, onSave, onClose }) {
  const [name, setName] = useState(user.name || "");
  const [bio, setBio] = useState(user.bio || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [avatarColor, setAvatarColor] = useState(user.avatarColor || "#059669");
  const initials = name.split(" ").map(n => n[0] || "").join("").toUpperCase();

  return (
    <div className="p-5 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full"><ChevronLeft className="w-6 h-6 text-stone-600" /></button>
        <h1 className="text-xl font-bold text-stone-800 font-display">Edit Profile</h1>
      </div>
      <div className="flex flex-col items-center">
        <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg mb-3 transition-colors" style={{ background: avatarColor }}>{initials || "?"}</div>
        <p className="text-stone-500 text-sm">Choose your color</p>
        <div className="flex gap-2 mt-3 flex-wrap justify-center">
          {AVATAR_COLORS.map(c => (
            <button key={c.hex} onClick={() => setAvatarColor(c.hex)} className={`w-9 h-9 rounded-full transition-all shadow-sm ${avatarColor === c.hex ? "ring-2 ring-offset-2 ring-emerald-500 scale-110" : "hover:scale-105"}`} style={{ background: c.hex }} />
          ))}
        </div>
      </div>
      <div>
        <label className="block font-medium text-stone-800 mb-1.5">Display Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
      </div>
      <div>
        <label className="block font-medium text-stone-800 mb-1.5">Bio</label>
        <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell buyers about yourself…" rows={3} className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm" />
        <p className="text-stone-400 text-xs mt-1">{bio.length}/150</p>
      </div>
      <div>
        <label className="block font-medium text-stone-800 mb-1.5">Phone <span className="text-stone-400 text-xs font-normal">(visible to buyers who click "Contact Seller")</span></label>
        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(519) 555-1234" className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
      </div>
      <div>
        <label className="block font-medium text-stone-800 mb-1.5">Email</label>
        <input type="email" value={user.email} disabled className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm bg-stone-50 text-stone-500 cursor-not-allowed" />
      </div>
      <button onClick={() => onSave({ name: name.trim() || user.name, bio: bio.slice(0, 150), phone, avatarColor })} className="w-full py-4 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition" style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>Save Changes</button>
    </div>
  );
}

function MySales({ sales, onClose, onDelete, onView }) {
  const [deleting, setDeleting] = useState(null);
  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full"><ChevronLeft className="w-6 h-6 text-stone-600" /></button>
        <h1 className="text-xl font-bold text-stone-800 font-display">My Sales</h1>
      </div>
      {!sales.length ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4"><Tag className="w-10 h-10 text-emerald-400" /></div>
          <h3 className="text-lg font-bold text-stone-800 mb-2 font-display">No Sales Yet</h3>
          <p className="text-stone-500 text-sm">You haven't posted any yard sales yet.</p>
          <p className="text-stone-400 text-xs mt-1">Tap the <span className="text-emerald-600 font-semibold">+</span> button to create your first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sales.map((s, i) => (
            <div key={s.id} className="bg-white rounded-2xl shadow-md border border-stone-100 overflow-hidden" style={{ animation: `fadeUp 0.4s ease-out ${i * 0.05}s both` }}>
              <div className="flex gap-3 p-3 cursor-pointer" onClick={() => onView(s)}>
                <img src={s.photos?.[0] || ""} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-stone-800 text-sm truncate">{s.title}</h3>
                  {s.address && <p className="text-emerald-600 text-xs mt-0.5">📍 {s.address}</p>}
                  <p className="text-stone-500 text-xs mt-0.5">{s.date}</p>
                  {s.expiresAt && Date.now() > s.expiresAt && <span className="text-amber-600 text-[10px] font-semibold">Ended</span>}
                </div>
              </div>
              <div className="px-3 pb-3 flex gap-2">
                <button onClick={() => setDeleting(deleting === s.id ? null : s.id)}
                  className="flex-1 py-2 bg-rose-50 border border-rose-200 text-rose-600 font-medium rounded-lg text-xs flex items-center justify-center gap-1 hover:bg-rose-100 transition">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
              {deleting === s.id && (
                <div className="px-3 pb-3">
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                    <p className="text-rose-700 text-xs mb-2">Delete this sale permanently?</p>
                    <div className="flex gap-2">
                      <button onClick={() => setDeleting(null)} className="flex-1 py-1.5 bg-white border border-stone-200 text-stone-600 rounded text-xs">Cancel</button>
                      <button onClick={() => { onDelete(s.id); setDeleting(null); }} className="flex-1 py-1.5 bg-rose-600 text-white rounded text-xs">Delete</button>
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
