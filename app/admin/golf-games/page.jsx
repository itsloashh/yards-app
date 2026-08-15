"use client";
import { useState } from "react";
import { Loader2, Plus, Trash2, Edit, X, BookOpen, Upload, Check, Image as ImageIcon } from "lucide-react";
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
              {(g.header_image || g.rules_images?.[0] || g.images?.[0]) ? <img src={g.header_image || g.rules_images?.[0] || g.images?.[0]} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" /> : <div className="w-14 h-14 rounded-xl bg-stone-800 flex items-center justify-center shrink-0 text-xl">⛳</div>}
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
    header_image: game.header_image || "",
    rules_images: game.rules_images?.length ? game.rules_images : (game.images || []),
    sort_order: game.sort_order || 0,
    active: game.active !== false,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toBase64 = (file) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });

  // Header banner — a single photo, used on the card + detail header
  const uploadHeader = async (e) => {
    const file = (e.target.files || [])[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploadingHeader(true);
    const url = await uploadGolfImage(await toBase64(file), "games/headers");
    if (url) set("header_image", url);
    setUploadingHeader(false);
    e.target.value = "";
  };

  // Rule sheets — many, shown as zoomable references (never used as the header)
  const addRuleSheets = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const added = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const url = await uploadGolfImage(await toBase64(file), "games/rules");
      if (url) added.push(url);
    }
    if (added.length) setForm((f) => ({ ...f, rules_images: [...f.rules_images, ...added] }));
    setUploading(false);
    e.target.value = "";
  };
  const removeRuleSheet = (i) => set("rules_images", form.rules_images.filter((_, idx) => idx !== i));
  const moveRuleSheet = (i, dir) => {
    const next = [...form.rules_images];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set("rules_images", next);
  };

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

          {/* ── Header banner (single) ── */}
          <div className="border border-stone-800 rounded-xl p-3 bg-stone-950/40">
            <label className="block text-stone-300 text-sm font-medium mb-0.5">Header image</label>
            <p className="text-stone-500 text-xs mb-2">One banner photo shown on the game card and detail header. Rule sheets are never used here.</p>
            {form.header_image ? (
              <div className="relative w-full h-32">
                <img src={form.header_image} alt="" className="w-full h-full object-cover rounded-lg" />
                <button onClick={() => set("header_image", "")} className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center shadow"><X className="w-3.5 h-3.5 text-white" /></button>
                <label className="absolute bottom-2 right-2 text-[11px] bg-black/70 text-white px-2.5 py-1.5 rounded-full cursor-pointer hover:bg-black/85 transition">
                  {uploadingHeader ? "Uploading…" : "Replace"}
                  <input type="file" accept="image/*" onChange={uploadHeader} className="hidden" disabled={uploadingHeader} />
                </label>
              </div>
            ) : (
              <label className="w-full h-24 border-2 border-dashed border-stone-700 rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-emerald-500 transition">
                {uploadingHeader ? <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" /> : <ImageIcon className="w-5 h-5 text-stone-500" />}
                <span className="text-stone-500 text-xs">Upload header photo</span>
                <input type="file" accept="image/*" onChange={uploadHeader} className="hidden" disabled={uploadingHeader} />
              </label>
            )}
          </div>

          {/* ── Rule sheets (many, zoomable) ── */}
          <div className="border border-stone-800 rounded-xl p-3 bg-stone-950/40">
            <label className="block text-stone-300 text-sm font-medium mb-0.5">Rule sheet images</label>
            <p className="text-stone-500 text-xs mb-2">Reference sheets players tap to open and zoom into. Order below is the order shown.</p>
            <div className="flex flex-wrap gap-2">
              {form.rules_images.map((img, i) => (
                <div key={i} className="relative w-20 h-20">
                  <img src={img} alt="" className="w-full h-full object-cover rounded-lg border border-stone-700" />
                  <button onClick={() => removeRuleSheet(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center"><X className="w-3 h-3 text-white" /></button>
                  <div className="absolute bottom-0.5 left-0.5 flex gap-0.5">
                    <button onClick={() => moveRuleSheet(i, -1)} disabled={i === 0} className="w-5 h-5 bg-black/75 rounded text-white text-[11px] leading-none disabled:opacity-30">‹</button>
                    <button onClick={() => moveRuleSheet(i, 1)} disabled={i === form.rules_images.length - 1} className="w-5 h-5 bg-black/75 rounded text-white text-[11px] leading-none disabled:opacity-30">›</button>
                  </div>
                </div>
              ))}
              <label className="w-20 h-20 border-2 border-dashed border-stone-700 rounded-lg flex items-center justify-center cursor-pointer hover:border-emerald-500 transition">
                {uploading ? <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" /> : <Upload className="w-5 h-5 text-stone-500" />}
                <input type="file" accept="image/*" multiple onChange={addRuleSheets} className="hidden" disabled={uploading} />
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
