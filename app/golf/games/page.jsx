"use client";
import { useState } from "react";
import { BookOpen, Flag, X, Loader2, Users, Gauge, ChevronRight } from "lucide-react";
import { useGolfGames } from "@/lib/golf";

export default function GolfGames() {
  const { games, loading } = useGolfGames();
  const [selected, setSelected] = useState(null);

  return (
    <div className="pb-8">
      <div className="px-5 pt-5 pb-3">
        <h1 className="text-white text-2xl font-bold font-display flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-lime-300" /> Games & Rules
        </h1>
        <p className="text-amber-50/70 text-sm mt-1">Yard$ signature golf games — pick one and play</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 text-lime-300 animate-spin" /></div>
      ) : games.length === 0 ? (
        <div className="text-center py-20 px-6">
          <BookOpen className="w-12 h-12 text-amber-50/20 mx-auto mb-3" />
          <p className="text-amber-50/70 text-sm">Games are being written up. Check back soon!</p>
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {games.map((g) => (
            <button key={g.id} onClick={() => setSelected(g)} className="w-full text-left rounded-2xl overflow-hidden bg-emerald-950/40 border border-amber-50/10 active:scale-[0.99] transition">
              {g.images?.[0] && <img src={g.images[0]} alt={g.name} className="w-full h-36 object-cover" />}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h2 className="text-white font-bold font-display text-lg">{g.name}</h2>
                    {g.tagline && <p className="text-amber-50/75 text-sm mt-0.5">{g.tagline}</p>}
                  </div>
                  <ChevronRight className="w-5 h-5 text-amber-50/50 shrink-0 mt-1" />
                </div>
                <div className="flex items-center gap-4 mt-3">
                  {g.players && <span className="text-amber-50/70 text-xs flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {g.players}</span>}
                  {g.difficulty && <span className="text-amber-50/70 text-xs flex items-center gap-1"><Gauge className="w-3.5 h-3.5" /> {g.difficulty}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && <GameDetail game={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function GameDetail({ game, onClose }) {
  return (
    <div className="fixed inset-0 z-[700] flex items-end sm:items-center justify-center bg-black/70 animate-fade-in" onClick={onClose}>
      <div className="w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up max-h-[92vh] flex flex-col golf-felt" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="relative shrink-0">
          {game.images?.[0] ? (
            <img src={game.images[0]} alt={game.name} className="w-full h-44 object-cover" />
          ) : (
            <div className="golf-panel w-full h-24 flex items-center justify-center"><Flag className="w-8 h-8 text-amber-50/50" /></div>
          )}
          <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <h2 className="text-white text-2xl font-bold font-display">{game.name}</h2>
          {game.tagline && <p className="text-amber-50/80 text-sm mt-1">{game.tagline}</p>}

          <div className="flex items-center gap-4 mt-3 mb-4">
            {game.players && <span className="text-amber-50 text-xs flex items-center gap-1 bg-emerald-900/50 px-3 py-1 rounded-full"><Users className="w-3.5 h-3.5" /> {game.players}</span>}
            {game.difficulty && <span className="text-amber-50 text-xs flex items-center gap-1 bg-emerald-900/50 px-3 py-1 rounded-full"><Gauge className="w-3.5 h-3.5" /> {game.difficulty}</span>}
          </div>

          {/* Rules */}
          <h3 className="text-lime-300 font-bold text-sm uppercase tracking-wide mb-2">How to Play</h3>
          {game.rules ? (
            <p className="text-amber-50/90 text-sm leading-relaxed whitespace-pre-wrap">{game.rules}</p>
          ) : (
            <p className="text-amber-50/50 text-sm italic">Rules coming soon.</p>
          )}

          {/* Additional reference images */}
          {game.images?.length > 1 && (
            <div className="mt-5 space-y-3">
              <h3 className="text-lime-300 font-bold text-sm uppercase tracking-wide">Reference</h3>
              {game.images.slice(1).map((img, i) => (
                <img key={i} src={img} alt={`${game.name} reference ${i + 1}`} className="w-full rounded-xl border border-amber-50/10" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
