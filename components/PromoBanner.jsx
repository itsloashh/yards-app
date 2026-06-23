"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Rocket, Instagram, Facebook, Megaphone } from "lucide-react";
import { useApp } from "@/lib/AppContext";

// ─── PROMO BANNER SLIDES ───
// Edit these to change what rotates. Each slide has its own style + action.
// "type" controls the tap behavior: "boost" | "link" | "none"
const SLIDES = [
  {
    id: "boost",
    type: "boost",
    icon: Rocket,
    title: "Boost your ad",
    subtitle: "Get featured & seen by more shoppers",
    gradient: "linear-gradient(135deg, #b45309, #f59e0b, #fcd34d)",
  },
  {
    id: "instagram",
    type: "link",
    href: "https://instagram.com/officialyards",
    icon: Instagram,
    title: "Follow @officialyards",
    subtitle: "Catch the latest sales on Instagram",
    gradient: "linear-gradient(135deg, #7c3aed, #db2777, #f59e0b)",
  },
  {
    id: "facebook",
    type: "link",
    href: "https://facebook.com/officialyards",
    icon: Facebook,
    title: "Find us on Facebook",
    subtitle: "@officialyards — join the community",
    gradient: "linear-gradient(135deg, #1d4ed8, #2563eb, #38bdf8)",
  },
];

const ROTATE_MS = 5000;

export default function PromoBanner() {
  const router = useRouter();
  const { user, userSales, setShowAuth } = useApp();
  const [index, setIndex] = useState(0);
  const [prompt, setPrompt] = useState(""); // small inline message e.g. "post an ad first"

  useEffect(() => {
    const t = setInterval(() => setIndex(i => (i + 1) % SLIDES.length), ROTATE_MS);
    return () => clearInterval(t);
  }, []);

  const slide = SLIDES[index];
  const Icon = slide.icon;

  const handleTap = () => {
    if (slide.type === "link") {
      window.open(slide.href, "_blank", "noopener,noreferrer");
      return;
    }
    if (slide.type === "boost") {
      if (!user) {
        setShowAuth(true);
        return;
      }
      const mySales = userSales || [];
      if (mySales.length === 0) {
        setPrompt("Post an ad first to boost it!");
        setTimeout(() => setPrompt(""), 3200);
        return;
      }
      // Has sales → send them to their sales list to pick one to boost
      router.push("/profile?view=sales");
    }
  };

  return (
    <div className="px-4 pt-3">
      <button
        onClick={handleTap}
        className="relative w-full overflow-hidden rounded-2xl shadow-md active:scale-[0.99] transition text-left"
        style={{ background: slide.gradient }}
      >
        {/* decorative blobs */}
        <div className="absolute -top-8 -right-4 w-24 h-24 rounded-full bg-white/15 blur-xl" />
        <div className="absolute -bottom-10 -left-6 w-28 h-28 rounded-full bg-black/10 blur-xl" />

        <div className="relative flex items-center gap-3 px-4 py-3">
          <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-tight">{prompt || slide.title}</p>
            {!prompt && <p className="text-white/85 text-xs mt-0.5 truncate">{slide.subtitle}</p>}
          </div>
          {/* slide dots */}
          <div className="flex gap-1 shrink-0">
            {SLIDES.map((s, i) => (
              <span key={s.id} className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"}`} />
            ))}
          </div>
        </div>
      </button>
    </div>
  );
}
