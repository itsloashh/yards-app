"use client";
import { usePathname, useRouter } from "next/navigation";
import { Home, Map, Heart, User, Plus } from "lucide-react";
import { useApp } from "@/lib/AppContext";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setShowAuth } = useApp();

  const tabs = [
    { icon: Home, label: "Browse", path: "/" },
    { icon: Map, label: "Map", path: "/map" },
    { icon: null, label: "+", path: "/create" },
    { icon: Heart, label: "Saved", path: "/saved" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <nav className="shrink-0 bg-white border-t border-stone-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex justify-around items-center z-[200]">
      {tabs.map((tab) => {
        if (!tab.icon) {
          return (
            <button key="create" onClick={() => user ? router.push("/create") : setShowAuth(true)}
              className="w-14 h-14 -mt-7 rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>
              <Plus className="w-7 h-7 text-white" />
            </button>
          );
        }

        const active = pathname === tab.path;
        const Icon = tab.icon;

        return (
          <button key={tab.path}
            onClick={() => {
              if (tab.path === "/profile" && !user) { setShowAuth(true); return; }
              router.push(tab.path);
            }}
            className="flex flex-col items-center gap-0.5 min-w-[50px]">
            <Icon className={`w-6 h-6 transition ${active ? "text-yard-600" : "text-stone-400"}`}
              strokeWidth={active ? 2.5 : 1.5} />
            <span className={`text-[11px] font-medium transition ${active ? "text-yard-600" : "text-stone-400"}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
