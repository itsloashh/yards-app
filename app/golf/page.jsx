"use client";
import Link from "next/link";
import { ShoppingBag, BookOpen, Flag, ChevronRight } from "lucide-react";
import { useGolfProducts, useGolfGames, money } from "@/lib/golf";

export default function GolfHome() {
  const { products } = useGolfProducts();
  const { games } = useGolfGames();

  const featured = products.slice(0, 3);

  return (
    <div className="pb-8">
      {/* Hero — wood panel */}
      <section className="wood-panel relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/50 via-emerald-900/30 to-emerald-950/60" />
        <div className="relative px-6 py-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50/95 flex items-center justify-center shadow-xl mx-auto mb-4">
            <Flag className="w-8 h-8" style={{ color: "#065f46" }} />
          </div>
          <h1 className="text-white text-3xl font-bold font-display">Yard$ <span className="text-lime-300">Golf</span></h1>
          <p className="text-amber-50/85 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
            A home for players, shoppers, and genuine golf lovers. Gear up in the shop and play our signature games.
          </p>
        </div>
      </section>

      {/* Quick links */}
      <section className="px-4 -mt-5 relative z-10 space-y-3">
        <Link href="/golf/shop" className="block rounded-2xl overflow-hidden shadow-lg wood-panel active:scale-[0.99] transition">
          <div className="bg-gradient-to-r from-emerald-900/60 to-transparent px-5 py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50/95 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-6 h-6" style={{ color: "#065f46" }} />
            </div>
            <div className="flex-1">
              <h2 className="text-white font-bold text-lg">The Shop</h2>
              <p className="text-amber-50/80 text-xs">Apparel, gear & accessories</p>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-50/70" />
          </div>
        </Link>

        <Link href="/golf/games" className="block rounded-2xl overflow-hidden shadow-lg wood-panel active:scale-[0.99] transition">
          <div className="bg-gradient-to-r from-emerald-900/60 to-transparent px-5 py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50/95 flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6" style={{ color: "#065f46" }} />
            </div>
            <div className="flex-1">
              <h2 className="text-white font-bold text-lg">Games & Rules</h2>
              <p className="text-amber-50/80 text-xs">Yard$ signature golf games</p>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-50/70" />
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
              <Link key={p.id} href="/golf/shop" className="block rounded-2xl overflow-hidden bg-emerald-950/40 border border-amber-50/10 active:scale-[0.98] transition">
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
              <Link key={g.id} href="/golf/games" className="block rounded-xl bg-emerald-950/40 border border-amber-50/10 px-4 py-3 active:scale-[0.99] transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold text-sm">{g.name}</p>
                    {g.tagline && <p className="text-amber-50/70 text-xs mt-0.5">{g.tagline}</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-50/50" />
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
