"use client";
import { useState } from "react";
import { BookOpen, Flag, X, Loader2, Users, Gauge, ChevronRight, Maximize2 } from "lucide-react";
import { useGolfGames, gameHeaderImage, gameRulesImages } from "@/lib/golf";
import ImageZoom from "@/components/ImageZoom";
import HowToPlay from "@/components/golf/HowToPlay";

export default function GolfGames() {
  const { games, loading } = useGolfGames();
  const [selected, setSelected] = useState(null);

  return (
    <div className="pb-8">
      <div className="px-5 pt-5 pb-3">
        <h1 className="text-white text-2xl font-bold font-display flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-lime-300" /> Games &amp; Rules
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
          {games.map((g) => {
            const header = gameHeaderImage(g);
            const sheets = gameRulesImages(g);
            return (
              <button
                key={g.id}
                onClick={() => setSelected(g)}
                className="w-full text-left rounded-2xl overflow-hidden golf-card active:scale-[0.99] transition"
              >
                {/* Only a real header photo shows here — rules sheets never become the cover */}
                {header ? (
                  <img src={header} alt={g.name} className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-20 golf-panel flex items-center justify-center border-b border-lime-200/10">
                    <Flag className="w-7 h-7 text-amber-50/40" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h2 className="text-white font-bold font-display text-lg">{g.name}</h2>
                      {g.tagline && <p className="text-amber-50/75 text-sm mt-0.5">{g.tagline}</p>}
                    </div>
                    <ChevronRight className="w-5 h-5 text-lime-200/60 shrink-0 mt-1" />
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    {g.players && <span className="text-amber-50/70 text-xs flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {g.players}</span>}
                    {g.difficulty && <span className="text-amber-50/70 text-xs flex items-center gap-1"><Gauge className="w-3.5 h-3.5" /> {g.difficulty}</span>}
                    {sheets.length > 0 && (
                      <span className="text-lime-300/80 text-xs flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" /> {sheets.length} rule sheet{sheets.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && <GameDetail game={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function GameDetail({ game, onClose }) {
  const [zoomAt, setZoomAt] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const isScramble = /scramble/i.test(game?.name || "");
  const header = gameHeaderImage(game);
  const sheets = gameRulesImages(game);

  return (
    <>
      <div className="fixed inset-0 z-[700] flex items-end sm:items-center justify-center bg-black/70 animate-fade-in" onClick={onClose}>
        <div className="w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up max-h-[92vh] flex flex-col golf-felt" onClick={(e) => e.stopPropagation()}>
          {/* Header — banner photo only */}
          <div className="relative shrink-0">
            {header ? (
              <img src={header} alt={game.name} className="w-full h-44 object-cover" />
            ) : (
              <div className="golf-panel w-full h-24 flex items-center justify-center"><Flag className="w-8 h-8 text-amber-50/50" /></div>
            )}
            <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 flex items-center justify-center">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto flex-1">
            <h2 className="text-white text-2xl font-bold font-display">{game.name}</h2>
            {game.tagline && <p className="text-amber-50/80 text-sm mt-1">{game.tagline}</p>}

            <div className="flex items-center gap-2 mt-3 mb-4 flex-wrap">
              {game.players && <span className="text-amber-50 text-xs flex items-center gap-1 bg-emerald-950/70 border border-lime-200/15 px-3 py-1 rounded-full"><Users className="w-3.5 h-3.5" /> {game.players}</span>}
              {game.difficulty && <span className="text-amber-50 text-xs flex items-center gap-1 bg-emerald-950/70 border border-lime-200/15 px-3 py-1 rounded-full"><Gauge className="w-3.5 h-3.5" /> {game.difficulty}</span>}
            </div>

            {/* Rules sheets — tap to open the zoom viewer */}
            {sheets.length > 0 && (
              <div className="mb-5">
                <h3 className="text-lime-300 font-bold text-sm uppercase tracking-wide mb-2">Rule Sheets</h3>
                <div className="space-y-3">
                  {sheets.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setZoomAt(i)}
                      className="relative w-full rounded-xl overflow-hidden golf-card active:scale-[0.99] transition group"
                    >
                      <img src={img} alt={`${game.name} rules ${i + 1}`} className="w-full max-h-72 object-contain bg-black/30" />
                      <span className="absolute bottom-2 right-2 flex items-center gap-1.5 text-[11px] font-medium text-white bg-black/70 px-2.5 py-1.5 rounded-full">
                        <Maximize2 className="w-3.5 h-3.5" /> Tap to zoom
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isScramble && (
              <button
                onClick={() => setShowRules(true)}
                className="w-full mb-5 py-3 rounded-xl bg-lime-300 text-emerald-950 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition"
              >
                <BookOpen className="w-4 h-4" /> Open the full rules
              </button>
            )}

            {/* Written rules */}
            <h3 className="text-lime-300 font-bold text-sm uppercase tracking-wide mb-2">How to Play</h3>
            {game.rules ? (
              <p className="text-amber-50/90 text-sm leading-relaxed whitespace-pre-wrap">{game.rules}</p>
            ) : (
              <p className="text-amber-50/50 text-sm italic">Rules coming soon.</p>
            )}
          </div>
        </div>
      </div>

      {zoomAt !== null && (
        <ImageZoom images={sheets} index={zoomAt} caption={game.name} onClose={() => setZoomAt(null)} />
      )}
      {showRules && <HowToPlay onClose={() => setShowRules(false)} />}
    </>
  );
}
