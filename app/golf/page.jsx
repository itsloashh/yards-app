"use client";
import Link from "next/link";
import { ShoppingBag, BookOpen, Flag, ChevronRight, Trophy, Play } from "lucide-react";
import { useGolfProducts, useGolfGames, money } from "@/lib/golf";

export default function GolfHome() {
  const { products } = useGolfProducts();
  const { games } = useGolfGames();

  const featured = products.slice(0, 3);

  return (
    <div className="pb-8">
      {/* Hero — striped fairway panel with the Yard$ Golf lockup */}
      <section className="golf-panel relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-transparent to-emerald-950/50" />
        <div className="relative px-6 pt-7 pb-9 text-center">
          <img
            src="/golf-logo.png"
            alt="Yard$ Golf"
            className="w-56 max-w-[72%] h-auto mx-auto drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]"
          />
          <p className="text-amber-50/90 text-sm mt-4 max-w-xs mx-auto leading-relaxed">
            A home for players, shoppers, and genuine golf lovers. Gear up in the shop and play our signature games.
          </p>
        </div>
      </section>

      {/* Quick links — raised, flat surfaces so they read as buttons */}
      <section className="px-4 -mt-5 relative z-10 space-y-3">
        <Link href="/golf/shop" className="block rounded-2xl overflow-hidden golf-card-raised active:scale-[0.99] transition">
          <div className="px-5 py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50/95 flex items-center justify-center shrink-0 shadow">
              <ShoppingBag className="w-6 h-6" style={{ color: "#065f46" }} />
            </div>
            <div className="flex-1">
              <h2 className="text-white font-bold text-lg">The Shop</h2>
              <p className="text-amber-50/80 text-xs">Apparel, gear &amp; accessories</p>
            </div>
            <ChevronRight className="w-5 h-5 text-lime-200/80" />
          </div>
        </Link>

        <Link href="/golf/rounds" className="block rounded-2xl overflow-hidden golf-card-raised active:scale-[0.99] transition">
          <div className="px-5 py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-lime-300 flex items-center justify-center shrink-0 shadow">
              <Play className="w-6 h-6" style={{ color: "#065f46" }} />
            </div>
            <div className="flex-1">
              <h2 className="text-white font-bold text-lg">Play a Round</h2>
              <p className="text-amber-50/80 text-xs">Our games with your group &mdash; scores, rules &amp; power-ups</p>
            </div>
            <ChevronRight className="w-5 h-5 text-lime-200/80" />
          </div>
        </Link>

        <Link href="/golf/tournament" className="block rounded-2xl overflow-hidden golf-card-raised active:scale-[0.99] transition">
          <div className="px-5 py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-lime-300 flex items-center justify-center shrink-0 shadow">
              <Trophy className="w-6 h-6" style={{ color: "#065f46" }} />
            </div>
            <div className="flex-1">
              <h2 className="text-white font-bold text-lg">Tournament</h2>
              <p className="text-amber-50/80 text-xs">Check in with your bag tag &amp; keep score live</p>
            </div>
            <ChevronRight className="w-5 h-5 text-lime-200/80" />
          </div>
        </Link>

        <Link href="/golf/games" className="block rounded-2xl overflow-hidden golf-card-raised active:scale-[0.99] transition">
          <div className="px-5 py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50/95 flex items-center justify-center shrink-0 shadow">
              <BookOpen className="w-6 h-6" style={{ color: "#065f46" }} />
            </div>
            <div className="flex-1">
              <h2 className="text-white font-bold text-lg">Games &amp; Rules</h2>
              <p className="text-amber-50/80 text-xs">Yard$ signature golf games</p>
            </div>
            <ChevronRight className="w-5 h-5 text-lime-200/80" />
          </div>
        </Link>
      </section>

      {/* Featured products */}
      {featured.length > 0 && (
        <section className="px-4 mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold font-display">Featured Gear</h3>
            <Link href="/golf/shop" className="text-lime-300 text-sm font-medium flex items-center gap-0.5">
              Shop all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {featured.map((p) => (
              <Link key={p.id} href="/golf/shop" className="block rounded-2xl overflow-hidden golf-card active:scale-[0.98] transition">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.name} className="w-full h-32 object-cover" />
                ) : (
                  <div className="w-full h-32 bg-emerald-900/60 flex items-center justify-center"><Flag className="w-8 h-8 text-amber-50/30" /></div>
                )}
                <div className="p-3">
                  <p className="text-white text-sm font-semibold truncate">{p.name}</p>
                  <p className="text-lime-300 text-sm font-bold mt-0.5">{money(p.price_cents)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Games teaser */}
      {games.length > 0 && (
        <section className="px-4 mt-8">
          <h3 className="text-white font-bold font-display mb-3">Popular Games</h3>
          <div className="space-y-2">
            {games.slice(0, 3).map((g) => (
              <Link key={g.id} href="/golf/games" className="block rounded-xl golf-card px-4 py-3 active:scale-[0.99] transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold text-sm">{g.name}</p>
                    {g.tagline && <p className="text-amber-50/70 text-xs mt-0.5">{g.tagline}</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-lime-200/60" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty state hint (before admin adds content) */}
      {featured.length === 0 && games.length === 0 && (
        <section className="px-6 mt-10 text-center">
          <p className="text-amber-50/60 text-sm">The shop and games are being set up. Check back soon!</p>
        </section>
      )}
    </div>
  );
}
