"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Camera, X, MapPin, RefreshCw, Crosshair, Star, ChevronDown, AlertCircle, Loader2, CalendarX2, Check } from "lucide-react";
import { useApp } from "@/lib/AppContext";
import { CATEGORIES } from "@/lib/constants";
import { reverseGeocode, geocodeAddress } from "@/lib/geocode";
import { compressImage } from "@/lib/imageUtils";
import { formatSaleDate } from "@/lib/timeFormat";

export default function CreatePage() {
  const router = useRouter();
  const { user, loc, handleCreateSale, setShowAuth, profile } = useApp();
  const [form, setForm] = useState({ title: "", description: "", address: "", date: "", endDate: "", startTime: "", endTime: "", categories: [], photos: [] });
  const [errors, setErrors] = useState({});
  const [geoLoading, setGeoLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [featuredItems, setFeaturedItems] = useState([]);
  const [showFeatured, setShowFeatured] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", price: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  // Tracks where the lat/lng for the sale came from:
  //   "current" → user clicked "Use my location" (use loc coords directly)
  //   "address" → user typed/edited the address (need to geocode it before submitting)
  const [coordsSource, setCoordsSource] = useState("address");
  const [storedCurrentCoords, setStoredCurrentCoords] = useState(null);
  const fileRef = useRef(null);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center" style={{ minHeight: "50vh" }}>
        <h3 className="text-lg font-bold text-stone-800 mb-2 font-display">Sign In Required</h3>
        <p className="text-stone-500 mb-6 text-sm">You need an account to post a sale.</p>
        <button onClick={() => setShowAuth(true)}
          className="px-8 py-3 text-white font-bold rounded-xl shadow-lg transition"
          style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>
          Sign In
        </button>
      </div>
    );
  }

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); if (errors[k]) setErrors(p => ({ ...p, [k]: null })); };
  const toggleCat = (c) => set("categories", form.categories.includes(c) ? form.categories.filter(x => x !== c) : [...form.categories, c]);

  const handlePhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - form.photos.length;
    if (remaining <= 0 || !files.length) return;
    setPhotoLoading(true);
    try {
      const toAdd = files.slice(0, remaining);
      const compressed = await Promise.all(toAdd.map(f => compressImage(f, 800, 0.7)));
      setForm(prev => ({ ...prev, photos: [...prev.photos, ...compressed].slice(0, 5) }));
    } catch (err) {
      console.error("Photo compression failed:", err);
    }
    setPhotoLoading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const useMyLocation = async () => {
    if (!loc) return;
    setGeoLoading(true);
    const geo = await reverseGeocode(loc.lat, loc.lng);
    // Set address WITHOUT marking coords as stale (use special bypass)
    setForm(prev => ({ ...prev, address: geo.full || geo.short }));
    setStoredCurrentCoords({ lat: loc.lat, lng: loc.lng });
    setCoordsSource("current");
    setGeoLoading(false);
  };

  // Custom address input handler that marks coords as needing geocoding
  const handleAddressChange = (e) => {
    set("address", e.target.value);
    // User is typing/editing — coords need to come from geocoding the address, not their device
    setCoordsSource("address");
  };

  const addItem = () => {
    if (!newItem.name.trim()) return;
    setFeaturedItems(p => [...p, { name: newItem.name.trim(), price: newItem.price.trim() }]);
    setNewItem({ name: "", price: "" });
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.description.trim()) e.description = "Description is required";
    if (!form.address.trim()) e.address = "Address is required";
    if (!form.date) e.date = "Start date is required";
    // Validate end date isn't before start date
    if (form.endDate && form.date && form.endDate < form.date) {
      e.endDate = "End date can't be before start date";
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  // Check if selected date is in the past — uses endDate if set (multi-day), otherwise start date
  const effectiveEndDate = form.endDate || form.date;
  const isPastDate = effectiveEndDate && new Date(effectiveEndDate + "T23:59:59") < new Date();
  const isMultiDay = form.endDate && form.date && form.endDate !== form.date;

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    setErrors({});

    // Resolve coordinates for the sale's pin location.
    // If user clicked "Use my location", we already have their device coords stored.
    // Otherwise, forward-geocode the typed address to get the actual sale location.
    let saleCoords;
    if (coordsSource === "current" && storedCurrentCoords) {
      saleCoords = storedCurrentCoords;
    } else {
      // Geocode the typed address
      const geo = await geocodeAddress(form.address.trim());
      if (geo.success) {
        saleCoords = { lat: geo.lat, lng: geo.lng };
      } else {
        // Address couldn't be geocoded — show error, don't fall back to device location
        setLoading(false);
        setErrors({ address: "We couldn't find this address. Please double-check it or use 'Use my current location'." });
        setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
        return;
      }
    }

    const userTimeFormat = profile?.time_format === "24h" ? "24h" : "12h";
    // For multi-day: the "end date" is when the sale's last day occurs
    // For single-day: end date == start date
    const finalEndDate = form.endDate && form.endDate !== form.date ? form.endDate : null;
    const result = await handleCreateSale({
      title: form.title.trim(),
      description: form.description.trim(),
      address: form.address.trim(),
      dateRaw: form.date,
      endDateRaw: finalEndDate,
      startTime: form.startTime || null,
      endTime: form.endTime || null,
      date: formatSaleDate(form.date, form.startTime, form.endTime, userTimeFormat, finalEndDate),
      photos: form.photos,
      tags: form.categories.length ? form.categories : ["General"],
      coords: saleCoords,
      featuredItems: featuredItems.length ? featuredItems : undefined,
    });
    setLoading(false);
    if (result?.error) {
      setErrors({ submit: result.error });
      // Scroll to the error at the bottom so user sees it
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 50);
      return;
    }
    setSubmitted(true);
    setTimeout(() => router.push("/"), 1500);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center" style={{ minHeight: "50vh" }}>
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-4xl">🎉</span>
        </div>
        <h3 className="text-xl font-bold text-stone-800 mb-2 font-display">Sale Posted!</h3>
        <p className="text-stone-500 text-sm">Your yard sale is now live. Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5 pb-8">
      <div className="flex items-center gap-3 -mx-1">
        <button onClick={() => router.back()} className="p-2 hover:bg-stone-100 rounded-full"><ChevronLeft className="w-6 h-6 text-stone-600" /></button>
        <h1 className="text-xl font-bold text-stone-800 font-display">Post a Yard Sale</h1>
      </div>

      {/* Photos */}
      <div>
        <label className="block font-medium text-stone-800 mb-1.5">Photos <span className="text-stone-400 font-normal text-xs">({form.photos.length}/5)</span></label>
        <p className="text-stone-500 text-xs mb-3">Add up to 5 photos — they'll be automatically compressed</p>
        <div className="flex gap-2.5 flex-wrap">
          {form.photos.map((src, i) => (
            <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-stone-200 shadow-sm">
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button onClick={() => set("photos", form.photos.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"><X className="w-3 h-3 text-white" /></button>
            </div>
          ))}
          {form.photos.length < 5 && (
            <button onClick={() => fileRef.current?.click()} disabled={photoLoading}
              className="w-20 h-20 border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center text-stone-400 hover:border-emerald-500 hover:text-emerald-500 transition disabled:opacity-50">
              {photoLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Camera className="w-5 h-5 mb-0.5" /><span className="text-[10px]">Add</span></>}
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} />
      </div>

      <FormField label="Title" required value={form.title} onChange={v => set("title", v)} error={errors.title} placeholder="e.g., Moving Sale — Everything Must Go!" />

      <div>
        <label className="block font-medium text-stone-800 mb-1.5">Description <span className="text-rose-500">*</span></label>
        <textarea placeholder="Describe what you're selling…" rows={3} value={form.description}
          onChange={e => set("description", e.target.value)}
          className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm ${errors.description ? "border-rose-300 bg-rose-50" : "border-stone-200"}`} />
        {errors.description && <p className="text-rose-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.description}</p>}
      </div>

      {/* Address */}
      <div>
        <label className="block font-medium text-stone-800 mb-1.5">Address <span className="text-rose-500">*</span></label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input type="text" placeholder="Enter your address" value={form.address}
            onChange={handleAddressChange}
            className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm ${errors.address ? "border-rose-300 bg-rose-50" : "border-stone-200"}`} />
        </div>
        {errors.address && <p className="text-rose-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.address}</p>}
        <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
          {loc && (
            <button type="button" onClick={useMyLocation} disabled={geoLoading}
              className="text-emerald-600 text-sm font-medium flex items-center gap-1 hover:underline disabled:opacity-50">
              {geoLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
              {geoLoading ? "Getting address…" : "Use my current location"}
            </button>
          )}
          {coordsSource === "current" && form.address && (
            <span className="text-emerald-600 text-xs font-medium flex items-center gap-1">
              <Check className="w-3 h-3" /> Pinned to your location
            </span>
          )}
        </div>
        <p className="text-stone-400 text-[11px] mt-1.5">
          The map pin and directions will use the address you enter here — make sure it's where the sale will actually take place.
        </p>
      </div>

      {/* Start Date + Start Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-medium text-stone-800 mb-1.5">Start Date <span className="text-rose-500">*</span></label>
          <input type="date" value={form.date} onChange={e => set("date", e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className={`w-full px-3 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm ${errors.date ? "border-rose-300 bg-rose-50" : "border-stone-200"}`} />
          {errors.date && <p className="text-rose-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.date}</p>}
        </div>
        <div>
          <label className="block font-medium text-stone-800 mb-1.5">Start Time</label>
          <input type="time" value={form.startTime} onChange={e => set("startTime", e.target.value)}
            className="w-full px-3 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
        </div>
      </div>

      {/* End Date + End Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-medium text-stone-800 mb-1.5">End Date <span className="text-stone-400 text-xs font-normal">(optional)</span></label>
          <input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)}
            min={form.date || new Date().toISOString().split("T")[0]}
            placeholder="Same day"
            className={`w-full px-3 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm ${errors.endDate ? "border-rose-300 bg-rose-50" : "border-stone-200"}`} />
          {errors.endDate && <p className="text-rose-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.endDate}</p>}
        </div>
        <div>
          <label className="block font-medium text-stone-800 mb-1.5">End Time</label>
          <input type="time" value={form.endTime} onChange={e => set("endTime", e.target.value)}
            className="w-full px-3 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
        </div>
      </div>

      {/* Multi-day badge */}
      {isMultiDay && (
        <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-blue-800 text-xs">
          <span className="font-bold">Multi-day sale</span>
          <span className="text-blue-600">— times apply daily</span>
        </div>
      )}

      {/* Past date warning */}
      {isPastDate && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
          <CalendarX2 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 text-sm font-semibold">This date has already passed</p>
            <p className="text-amber-600 text-xs mt-0.5">Did you mean to pick an upcoming date? You can still post, but the sale will show as ended right away.</p>
          </div>
        </div>
      )}

      {/* Categories */}
      <div>
        <label className="block font-medium text-stone-800 mb-1.5">Categories</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => toggleCat(c)}
              className={`px-3 py-1.5 border rounded-full text-[13px] font-medium transition ${form.categories.includes(c) ? "bg-emerald-600 border-emerald-600 text-white" : "border-stone-200 text-stone-600 hover:border-emerald-500"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Items */}
      <div>
        <button onClick={() => setShowFeatured(!showFeatured)} className="flex items-center gap-2 text-stone-800 font-medium">
          <Star className="w-4 h-4 text-amber-500" />
          Featured Items <span className="text-stone-400 text-xs font-normal">(optional — great for estate sales)</span>
          <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${showFeatured ? "rotate-180" : ""}`} />
        </button>
        {showFeatured && (
          <div className="mt-3 space-y-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-xs text-amber-700">List high-value items to attract more buyers</p>
            {featuredItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-amber-100">
                <Star className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="flex-1 text-sm font-medium text-stone-800 truncate">{item.name}</span>
                {item.price && <span className="text-amber-600 text-xs font-semibold">${item.price}</span>}
                <button onClick={() => setFeaturedItems(p => p.filter((_, j) => j !== i))} className="text-stone-400 hover:text-rose-500"><X className="w-4 h-4" /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <input type="text" placeholder="Item name" value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
                className="flex-1 px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              <input type="text" placeholder="Price" value={newItem.price} onChange={e => setNewItem(p => ({ ...p, price: e.target.value }))}
                className="w-20 px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              <button onClick={addItem} className="px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 transition">+</button>
            </div>
          </div>
        )}
      </div>

      {errors.submit && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />{errors.submit}
        </div>
      )}

      <button onClick={submit} disabled={loading}
        className="w-full py-4 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 disabled:opacity-70"
        style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>
        {loading && <Loader2 className="w-5 h-5 animate-spin" />}
        {loading ? "Posting…" : "Post Your Sale"}
      </button>
    </div>
  );
}

function FormField({ label, required, value, onChange, error, placeholder }) {
  return (
    <div>
      <label className="block font-medium text-stone-800 mb-1.5">{label} {required && <span className="text-rose-500">*</span>}</label>
      <input type="text" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm ${error ? "border-rose-300 bg-rose-50" : "border-stone-200"}`} />
      {error && <p className="text-rose-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
}
