"use client";
import { useRouter } from "next/navigation";
import { Store, Flag } from "lucide-react";

// Shown after the splash: lets the visitor choose which side of the brand to enter.
// Yard$ (yard sales / markets / estates) or Yard$ Golf (shop + games).
export default function BrandChooser({ onChoose }) {
  const router = useRouter();

  const choose = (dest) => {
    try { localStorage.setItem("yards_section", dest); } catch {}
    if (onChoose) onChoose(dest);
    if (dest === "golf") router.push("/golf");
    // "yards" just dismisses the chooser and stays on the main app
  };

  return (
    <div className="fixed inset-0 z-[600] flex flex-col bg-white animate-fade-in overflow-y-auto">
      {/* m-auto centers the whole block as one unit so the logo sits directly above the cards */}
      <div className="m-auto w-full max-w-md px-5 py-12">
        {/* Brand mark */}
        <div className="text-center mb-9">
          <img
            src="/logo-sign.png"
            alt="Yard$"
            className="w-52 h-36 object-contain mx-auto"
          />
          <p className="text-stone-500 text-sm mt-3 tracking-wide">
            Choose where you're headed
          </p>
        </div>

        <div className="space-y-4">
          {/* Yard$ card */}
          <button
            onClick={() => choose("yards")}
            className="w-full group relative overflow-hidden rounded-3xl p-6 text-left transition-transform active:scale-[0.98] shadow-lg hover:shadow-xl"
            style={{ background: "linear-gradient(135deg, #065f46, #059669, #84cc16)" }}
          >
            <div className="absolute -top-10 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                <Store className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-white text-2xl font-bold font-display">Yard$</h2>
                <p className="text-white/85 text-sm mt-0.5">Yard sales, markets &amp; estate sales near you</p>
              </div>
            </div>
          </button>

          {/* Yard$ Golf card — fairway green */}
          <button
            onClick={() => choose("golf")}
            className="w-full group relative overflow-hidden rounded-3xl p-6 text-left transition-transform active:scale-[0.98] shadow-lg hover:shadow-xl golf-panel"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/35 via-transparent to-emerald-950/20" />
            <div className="absolute -bottom-10 -left-8 w-40 h-40 rounded-full bg-lime-300/10 blur-2xl" />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50/95 flex items-center justify-center shrink-0 shadow-lg">
                <Flag className="w-7 h-7" style={{ color: "#065f46" }} />
              </div>
              <div className="flex-1">
                <h2 className="text-white text-2xl font-bold font-display flex items-center gap-2">
                  Yard$ <span className="text-lime-300">Golf</span>
                </h2>
                <p className="text-amber-50/90 text-sm mt-0.5">The shop &amp; games for golf lovers</p>
              </div>
            </div>
            {/* sand-bunker accent along the bottom edge */}
            <div className="sand-strip absolute bottom-0 left-0 right-0 h-1 opacity-70" />
          </button>
        </div>

        <p className="text-center text-stone-400 text-xs mt-6">
          You can switch anytime from the menu.
        </p>
      </div>
    </div>
  );
}
