"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingBag, BookOpen, Home, ArrowLeftRight } from "lucide-react";

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
      {/* Top bar — flat chrome + sand edge so it lifts off the striped fairway */}
      <header className="golf-chrome relative shrink-0 z-20">
        <div className="px-4 py-2.5 flex items-center justify-between">
          <Link href="/golf" className="flex items-center">
            <img src="/golf-logo-sm.png" alt="Yard$ Golf" className="h-8 w-auto object-contain" />
          </Link>
          <button
            onClick={switchToYards}
            className="flex items-center gap-1.5 text-amber-50/85 hover:text-white text-xs font-medium px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-lime-200/15 transition"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" /> Yard$
          </button>
        </div>
        <div className="sand-strip h-[3px] w-full opacity-80" />
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar">{children}</main>

      {/* Bottom nav — flat chrome, mirrors the header */}
      <nav className="golf-chrome shrink-0 relative z-20">
        <div className="sand-strip h-[3px] w-full opacity-80" />
        <div className="flex items-center justify-around px-2 py-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-xl transition ${
                  active
                    ? "text-lime-300 bg-lime-300/10 ring-1 ring-lime-300/25"
                    : "text-amber-50/60 hover:text-amber-50"
                }`}
              >
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
