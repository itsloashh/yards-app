"use client";
import { useState } from "react";
import { Loader2, Plus, Trash2, Edit, X, BookOpen, Upload, Check } from "lucide-react";
import { useGolfAdmin, saveGolfGame, deleteGolfGame, uploadGolfImage } from "@/lib/golf";

export default function AdminGolfGames() {
  const { items, loading, reload } = useGolfAdmin("games");
  const [editing, setEditing] = useState(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><BookOpen className="w-6 h-6 text-emerald-400" /> Golf Games</h1>
          <p className="text-stone-400 text-sm mt-1">Manage the Yard$ Golf games & rules. Add reference images here too.</p>
        </div>
        <button onClick={() => setEditing({})} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Game
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 text-emerald-500 animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl py-16 text-center">
          <BookOpen className="w-10 h-10 text-stone-600 mx-auto mb-2" />
          <p className="text-stone-300 font-semibold">No games yet</p>
          <p className="text-stone-500 text-sm mt-1">Add your first Yard$ Golf game.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((g) => (
            <div key={g.id} className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex items-center gap-4">
              {g.images?.[0] ? <img src={g.images[0]} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" /> : <div className="w-14 h-14 rounded-xl bg-stone-800 flex items-center justify-center shrink-0 text-xl">⛳</div>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-stone-100 font-semibold truncate">{g.name}</p>
                  {!g.active && <span className="text-[10px] bg-stone-700 text-stone-400 px-2 py-0.5 rounded-full">Hidden</span>}
                </div>
                {g.tagline && <p className="text-stone-400 text-xs truncate">{g.tagline}</p>}
                <p className="text-stone-500 text-xs">{[g.players, g.difficulty].filter(Boolean).join(" · ")}</p>
              </div>
              <button onClick={() => setEditing(g)} className="p-2 text-stone-400 hover:text-white"><Edit className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}

      {editing !== null && (
        <GameEditor game={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />
      )}
    </div>
  );
}

function GameEditor({ game, onClose, onSaved }) {
  const [form, setForm] = useState({
    id: game.id,
    name: game.name || "",
    tagline: game.tagline || "",
    players: game.players || "",
    difficulty: game.difficulty || "",
    rules: game.rules || "",
    images: game.images || [],
    sort_order: game.sort_order || 0,
    active: game.active !== false,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const base64 = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
      const url = await uploadGolfImage(base64, "games");
      if (url) set("images", [...form.images, url]);
    }
    setUploading(false);
  };
  const removeImage = (i) => set("images", form.images.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!form.name.trim()) { alert("Game needs a name."); return; }
    setSaving(true);
    const { error } = await saveGolfGame(form);
    setSaving(false);
    if (error) { alert("Couldn't save: " + error.message); return; }
    onSaved();
  };
  const remove = async () => {
    if (!confirm("Delete this game permanently?")) return;
    setSaving(true);
    await deleteGolfGame(form.id);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-stone-800 sticky top-0 bg-stone-900">
          <h2 className="text-white font-bold">{form.id ? "Edit Game" : "New Game"}</h2>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <Field label="Game name"><input value={form.name} onChange={(e) => set("name", e.target.value)} className="admin-input" placeholder="Yard$ Scramble" /></Field>
          <Field label="Tagline"><input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} className="admin-input" placeholder="A fast, fun team format" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Players"><input value={form.players} onChange={(e) => set("players", e.target.value)} className="admin-input" placeholder="2-4 players" /></Field>
            <Field label="Difficulty"><input value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)} className="admin-input" placeholder="Easy" /></Field>
          </div>
          <Field label="Rules"><textarea value={form.rules} onChange={(e) => set("rules", e.target.value)} rows={8} className="admin-input resize-none" placeholder="Write the full rules here. Line breaks are preserved." /></Field>

          <div>
            <label className="block text-stone-400 text-sm mb-1.5">Reference images <span className="text-stone-600">(first image is the cover)</span></label>
            <div className="flex flex-wrap gap-2">
              {form.images.map((img, i) => (
                <div key={i} className="relative w-20 h-20">
                  <img src={img} alt="" className="w-full h-full object-cover rounded-lg" />
                  {i === 0 && <span className="absolute bottom-0.5 left-0.5 text-[9px] bg-emerald-500 text-white px-1 rounded">cover</span>}
                  <button onClick={() => removeImage(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center"><X className="w-3 h-3 text-white" /></button>
                </div>
              ))}
              <label className="w-20 h-20 border-2 border-dashed border-stone-700 rounded-lg flex items-center justify-center cursor-pointer hover:border-emerald-500 transition">
                {uploading ? <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" /> : <Upload className="w-5 h-5 text-stone-500" />}
                <input type="file" accept="image/*" multiple onChange={addImages} className="hidden" disabled={uploading} />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <Field label="Sort order"><input value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} className="admin-input" placeholder="0" inputMode="numeric" /></Field>
            <label className="flex items-center gap-2 text-stone-300 text-sm cursor-pointer pb-2">
              <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="accent-emerald-500" /> Show in app
            </label>
          </div>
        </div>

        <div className="p-4 border-t border-stone-800 flex gap-2 sticky bottom-0 bg-stone-900">
          {form.id && <button onClick={remove} disabled={saving} className="px-4 py-2.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-xl text-sm font-medium flex items-center gap-1.5"><Trash2 className="w-4 h-4" /></button>}
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2.5 text-stone-400 hover:text-white text-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="block text-stone-400 text-sm mb-1.5">{label}</label>{children}</div>;
}
