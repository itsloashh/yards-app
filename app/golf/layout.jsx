"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Flag, ShoppingBag, BookOpen, Home, ArrowLeftRight } from "lucide-react";

const NAV = [
  { href: "/golf", label: "Home", icon: Home, exact: true },
  { href: "/golf/shop", label: "Shop", icon: ShoppingBag },
  { href: "/golf/games", label: "Games", icon: BookOpen },
];

export default function GolfLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const switchToYards = () => {
    try { localStorage.setItem("yards_section", "yards"); } catch {}
    router.push("/");
  };

  return (
    <div className="md:max-w-md mx-auto min-h-[100dvh] h-[100dvh] relative shadow-2xl flex flex-col overflow-hidden golf-felt">
      {/* Top bar — wood textured */}
      <header className="wood-panel-dark relative shrink-0 shadow-lg">
        <div className="wood-strip h-1 w-full opacity-60" />
        <div className="px-4 py-3 flex items-center justify-between">
          <Link href="/golf" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-amber-50/95 flex items-center justify-center shadow">
              <Flag className="w-5 h-5" style={{ color: "#065f46" }} />
            </div>
            <div className="leading-tight">
              <p className="text-white font-bold font-display text-lg">Yard$ <span className="text-lime-300">Golf</span></p>
            </div>
          </Link>
          <button onClick={switchToYards} className="flex items-center gap-1.5 text-amber-50/80 hover:text-white text-xs font-medium px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition">
            <ArrowLeftRight className="w-3.5 h-3.5" /> Yard$
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar">{children}</main>

      {/* Bottom nav — wood textured */}
      <nav className="wood-panel-dark shrink-0 border-t border-black/30">
        <div className="wood-strip h-0.5 w-full opacity-40" />
        <div className="flex items-center justify-around px-2 py-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition ${active ? "text-lime-300" : "text-amber-50/60 hover:text-amber-50"}`}>
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
