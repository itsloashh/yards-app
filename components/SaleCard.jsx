"use client";
import { Heart, Clock, MapPin, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/AppContext";

// Placeholder gradient when no photo exists
function PhotoPlaceholder({ title }) {
  const colors = [
    "from-emerald-400 to-teal-500",
    "from-blue-400 to-indigo-500",
    "from-purple-400 to-pink-500",
    "from-amber-400 to-orange-500",
    "from-rose-400 to-red-500",
    "from-lime-400 to-green-500",
  ];
  const color = colors[Math.abs(title?.charCodeAt(0) || 0) % colors.length];
  return (
    <div className={`w-full h-full bg-gradient-to-br ${color} flex items-center justify-center`}>
      <span className="text-white/80 text-4xl">🏷️</span>
    </div>
  );
}

export default function SaleCard({ sale, delay = 0 }) {
  const router = useRouter();
  const { toggleSaved, isSaved } = useApp();
  const saved = isSaved(sale.id);

  const hasPhoto = sale.photos?.length > 0 && sale.photos[0];
  const now = Date.now();
  const isUpcoming = sale.dateRaw && new Date(sale.dateRaw).getTime() > now + 86400000;
  const hoursLeft = sale.expiresAt ? Math.max(0, Math.floor((sale.expiresAt - now) / 3600000)) : null;
  const isEnding = hoursLeft !== null && hoursLeft < 24 && hoursLeft > 0 && !isUpcoming;

  return (
    <div onClick={() => router.push(`/sale/${sale.id}`)}
      className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-all cursor-pointer border border-stone-100"
      style={{ animation: `fadeUp 0.4s ease-out ${delay}s both` }}>
      <div className="relative h-44 bg-stone-200">
        {hasPhoto
          ? <img src={sale.photos[0]} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.target.style.display = "none"; }} />
          : <PhotoPlaceholder title={sale.title} />}
        <button onClick={(e) => { e.stopPropagation(); toggleSaved(sale.id); }}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition shadow-md ${saved ? "bg-rose-500 text-white" : "bg-white/90 text-stone-500 hover:bg-white"}`}>
          <Heart className={`w-[18px] h-[18px] ${saved ? "fill-current" : ""}`} />
        </button>
        {sale.distanceText && (
          <div className="absolute bottom-3 left-3 px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full shadow">
            {sale.distanceText}
          </div>
        )}
        {isUpcoming && (
          <div className="absolute top-3 left-3 px-2.5 py-1 bg-blue-500 text-white text-[10px] font-bold rounded-full shadow flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Upcoming
          </div>
        )}
        {isEnding && (
          <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-amber-500 text-white text-[10px] font-bold rounded-full shadow">
            {hoursLeft < 1 ? "Ending soon!" : `${hoursLeft}h left`}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-stone-800 mb-1 truncate">{sale.title}</h3>
        {sale.address && (
          <div className="flex items-center gap-1.5 text-emerald-600 text-[12px] mb-1 font-medium">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{sale.address}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-stone-500 text-[13px] mb-2">
          <Clock className="w-3.5 h-3.5" />
          <span>{sale.date}</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {sale.tags?.slice(0, 3).map(t => (
            <span key={t} className="px-2.5 py-0.5 bg-stone-100 text-stone-600 text-[11px] font-medium rounded-full">{t}</span>
          ))}
          {sale.featuredItems?.length > 0 && (
            <span className="px-2.5 py-0.5 bg-amber-50 text-amber-600 text-[11px] font-medium rounded-full border border-amber-200">
              ⭐ {sale.featuredItems.length} featured
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
