"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, Heart, Clock, MapPin, Navigation, Star, Phone, Mail, MessageCircle, Trash2, Edit, Share2, AlertCircle } from "lucide-react";
import { useApp } from "@/lib/AppContext";
import { haversine, fmtDist } from "@/lib/distance";
import { formatSaleDate } from "@/lib/timeFormat";

export default function SaleDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const { sales, loc, unit, toggleSaved, isSaved, user, handleDeleteSale, profile } = useApp();
  const [photo, setPhoto] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const sale = sales.find(s => s.id === id || s.id === parseInt(id));

  if (!sale) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center" style={{ minHeight: "50vh" }}>
        <h3 className="text-lg font-bold text-stone-800 mb-2 font-display">Sale Not Found</h3>
        <p className="text-stone-500 text-sm mb-4">This sale may have ended or been removed.</p>
        <button onClick={() => router.push("/")} className="text-emerald-600 font-semibold hover:underline">Browse Sales</button>
      </div>
    );
  }

  const useKm = unit === "km";
  const distance = loc ? haversine(loc.lat, loc.lng, sale.coords.lat, sale.coords.lng, useKm) : 0;
  const distText = loc ? fmtDist(distance, unit) : "";
  const saved = isSaved(sale.id);
  const isOwner = user && sale.userId === user.id;
  const tf = profile?.time_format === "24h" ? "24h" : "12h";
  const displayDate = sale.dateRaw
    ? formatSaleDate(sale.dateRaw, sale.startTime, sale.endTime, tf)
    : (sale.date || "TBD");

  // Expiration info
  const isExpired = sale.expiresAt && Date.now() > sale.expiresAt;
  const timeLeft = sale.expiresAt ? sale.expiresAt - Date.now() : null;
  const hoursLeft = timeLeft ? Math.max(0, Math.floor(timeLeft / 3600000)) : null;

  const openDirections = () => {
    const dest = `${sale.coords.lat},${sale.coords.lng}`;
    const orig = loc ? `${loc.lat},${loc.lng}` : "";
    window.open(`https://www.google.com/maps/dir/${orig}/${dest}`, "_blank");
  };

  const shareSale = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: sale.title, text: `Check out this yard sale: ${sale.title}`, url }); } catch {}
    } else {
      navigator.clipboard?.writeText(url);
    }
  };

  const doDelete = () => {
    handleDeleteSale(sale.id);
    router.push("/");
  };

  return (
    <div>
      {/* Expired banner */}
      {isExpired && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2 text-amber-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>This sale has ended</span>
        </div>
      )}

      {/* Photo gallery */}
      <div className="relative h-72 bg-stone-200">
        <img src={sale.photos?.[photo]} alt="" className="w-full h-full object-cover" />
        <button onClick={() => router.back()}
          className="absolute top-4 left-4 w-10 h-10 bg-black/40 backdrop-blur rounded-full flex items-center justify-center">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={shareSale}
            className="w-10 h-10 bg-black/40 backdrop-blur rounded-full flex items-center justify-center">
            <Share2 className="w-5 h-5 text-white" />
          </button>
          <button onClick={() => toggleSaved(sale.id)}
            className={`w-10 h-10 rounded-full flex items-center justify-center ${saved ? "bg-rose-500 text-white" : "bg-black/40 backdrop-blur text-white"}`}>
            <Heart className={`w-5 h-5 ${saved ? "fill-current" : ""}`} />
          </button>
        </div>
        {(sale.photos?.length || 0) > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {sale.photos.map((_, i) => (
              <button key={i} onClick={() => setPhoto(i)}
                className={`h-2 rounded-full transition-all ${photo === i ? "bg-white w-6" : "bg-white/50 w-2"}`} />
            ))}
          </div>
        )}
        {/* Time remaining badge */}
        {hoursLeft !== null && !isExpired && hoursLeft < 48 && (
          <div className="absolute bottom-4 left-4 px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full shadow">
            {hoursLeft < 1 ? "Ending soon!" : `${hoursLeft}h left`}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-5 pb-8">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold text-stone-800 font-display">{sale.title}</h1>
            {distText && <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-bold rounded-full whitespace-nowrap">{distText}</span>}
          </div>
          {sale.address && (
            <div className="flex items-center gap-1.5 text-stone-600 mt-2 text-sm">
              <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{sale.address}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-emerald-600 font-medium mt-1.5 text-sm">
            <Clock className="w-4 h-4" />{displayDate}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {sale.tags?.map(t => <span key={t} className="px-3 py-1 bg-stone-100 text-stone-600 text-sm font-medium rounded-full">{t}</span>)}
        </div>

        <div>
          <h2 className="font-bold text-stone-800 mb-1.5 font-display">About This Sale</h2>
          <p className="text-stone-600 text-sm leading-relaxed">{sale.description}</p>
        </div>

        {/* Seller Card with Contact */}
        <div className="p-4 bg-stone-50 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow"
              style={{ background: sale.seller?.avatarColor || "#059669" }}>
              {sale.seller?.name?.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="font-bold text-stone-800">{sale.seller?.name}</p>
              <div className="flex items-center gap-2 text-sm text-stone-500">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> {sale.seller?.rating} · {sale.seller?.sales} sales
              </div>
            </div>
          </div>
          {sale.seller?.bio && (
            <p className="text-stone-500 text-xs mt-3 leading-relaxed border-t border-stone-200 pt-3">"{sale.seller.bio}"</p>
          )}

          {/* Contact Seller */}
          {!isOwner && (
            <div className="mt-3 pt-3 border-t border-stone-200">
              {!showContact ? (
                <button onClick={() => setShowContact(true)}
                  className="w-full py-2.5 bg-white border border-emerald-200 text-emerald-700 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-emerald-50 transition">
                  <MessageCircle className="w-4 h-4" /> Contact Seller
                </button>
              ) : (
                <div className="space-y-2">
                  {sale.seller?.phone && (
                    <a href={`tel:${sale.seller.phone}`}
                      className="w-full py-2.5 bg-emerald-600 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 transition">
                      <Phone className="w-4 h-4" /> Call {sale.seller.phone}
                    </a>
                  )}
                  <a href={`sms:${sale.seller?.phone || ""}?body=Hi! I'm interested in your yard sale "${sale.title}" on Yard$.`}
                    className="w-full py-2.5 bg-white border border-emerald-200 text-emerald-700 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-emerald-50 transition">
                    <MessageCircle className="w-4 h-4" /> Text Message
                  </a>
                  {!sale.seller?.phone && (
                    <p className="text-xs text-stone-400 text-center">This seller hasn't added a phone number yet.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Owner actions */}
        {isOwner && (
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(true)}
              className="flex-1 py-3 bg-rose-50 border border-rose-200 text-rose-600 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-rose-100 transition">
              <Trash2 className="w-4 h-4" /> Delete Sale
            </button>
          </div>
        )}

        {/* Delete confirmation */}
        {confirmDelete && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
            <p className="text-rose-700 font-medium text-sm mb-3">Are you sure you want to delete this sale? This can't be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 bg-white border border-stone-200 text-stone-600 font-medium rounded-lg text-sm">Cancel</button>
              <button onClick={doDelete} className="flex-1 py-2.5 bg-rose-600 text-white font-medium rounded-lg text-sm">Delete</button>
            </div>
          </div>
        )}

        {/* Featured Items */}
        {sale.featuredItems?.length > 0 && (
          <div>
            <h2 className="font-bold text-stone-800 mb-2 font-display">Featured Items</h2>
            <div className="space-y-2">
              {sale.featuredItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                    <Star className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-800 text-sm">{item.name}</p>
                    {item.price && <p className="text-amber-600 text-xs font-medium">${item.price}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mini map */}
        <div>
          <h2 className="font-bold text-stone-800 mb-2 font-display">Location</h2>
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

function MiniMap({ lat, lng, address }) {
  const ref = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    let map;
    try {
      const L = require("leaflet");
      map = L.map(ref.current, {
        center: [lat, lng], zoom: 16, zoomControl: false,
        dragging: false, scrollWheelZoom: false, doubleClickZoom: false, attributionControl: false,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
      const icon = L.divIcon({
        className: "sale-marker",
        html: `<div class="sale-marker-inner"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div><div class="sale-marker-arrow"></div>`,
        iconSize: [40, 52], iconAnchor: [20, 52],
      });
      L.marker([lat, lng], { icon }).addTo(map);
      setLoaded(true);
    } catch {}
    return () => { if (map) map.remove(); };
  }, [lat, lng]);

  return (
    <div className="relative h-44 rounded-xl overflow-hidden shadow-inner border border-stone-200">
      <div ref={ref} className="absolute inset-0" />
      {address && loaded && (
        <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur rounded-lg px-2.5 py-1.5 text-[11px] text-stone-700 font-medium shadow z-[500]">
          📍 {address}
        </div>
      )}
    </div>
  );
}
