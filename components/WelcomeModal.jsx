"use client";
import { useEffect, useState } from "react";
import { X, Sparkles, Check } from "lucide-react";

// ─── ANNOUNCEMENT VERSION ───
// Bump this whenever you want everyone to see the welcome modal again
// (e.g., after shipping a notable feature). Users who previously checked
// "Don't show again" for an older version will still see this new one.
const ANNOUNCEMENT_VERSION = "2026-04-26";

// LocalStorage key — stores the last version the user dismissed
const STORAGE_KEY = "yards_welcome_dismissed_version";

// ─── ANNOUNCEMENT CONTENT ───
// Edit this object whenever you want to update what the welcome modal says.
// Bump ANNOUNCEMENT_VERSION above to push it to all users again.
const ANNOUNCEMENT = {
  title: "Welcome to Yard$",
  subtitle: "The live yard sale map for your city",
  description:
    "Find local yard sales happening near you, save your favorites, and post your own — all in one place.",
  whatsNew: [
    "Multi-day sales — list a sale across an entire weekend",
    "Red pins flag sales ending in under 2 hours",
    "Smarter address pinning for accurate directions",
    "Add Yard$ to your home screen for an app-like experience",
  ],
};

export default function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [dontShow, setDontShow] = useState(false);

  useEffect(() => {
    // Wait for splash to finish (~2.0s) plus a small delay before showing
    const showTimer = setTimeout(() => {
      try {
        const dismissedVersion = localStorage.getItem(STORAGE_KEY);
        // Show if user has never dismissed, OR they dismissed an older version
        if (dismissedVersion !== ANNOUNCEMENT_VERSION) {
          setOpen(true);
        }
      } catch {
        // localStorage might be disabled (private browsing) — show anyway
        setOpen(true);
      }
    }, 2600);
    return () => clearTimeout(showTimer);
  }, []);

  const close = () => {
    if (dontShow) {
      try {
        localStorage.setItem(STORAGE_KEY, ANNOUNCEMENT_VERSION);
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[800] flex items-end sm:items-center justify-center bg-black/50 animate-fade-in"
      onClick={close}
    >
      <div
        className="relative bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div
          className="relative px-6 pt-7 pb-6 text-white overflow-hidden"
          style={{ background: "linear-gradient(135deg, #065f46, #059669, #84cc16)" }}
        >
          {/* Decorative blobs */}
          <div className="absolute -top-12 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-16 -left-10 w-44 h-44 rounded-full bg-lime-300/20 blur-2xl" />

          <button
            onClick={close}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="relative flex flex-col items-center text-center">
            <img
              src="/logo-sign.png"
              alt="Yard$"
              className="w-20 h-20 object-contain mb-1 drop-shadow-md"
            />
            <h2 className="text-2xl font-bold font-display">{ANNOUNCEMENT.title}</h2>
            <p className="text-white/85 text-sm mt-1">{ANNOUNCEMENT.subtitle}</p>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          <p className="text-stone-700 text-sm leading-relaxed">{ANNOUNCEMENT.description}</p>

          {ANNOUNCEMENT.whatsNew?.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center gap-1.5 mb-3">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-stone-800 text-sm">What's new</h3>
              </div>
              <ul className="space-y-2">
                {ANNOUNCEMENT.whatsNew.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 border-t border-stone-100">
          <label className="flex items-center gap-2 cursor-pointer mb-3 select-none">
            <input
              type="checkbox"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
              className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-stone-500 text-xs">Don't show this again</span>
          </label>

          <button
            onClick={close}
            className="w-full py-3.5 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition text-sm"
            style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}
          >
            Got it — let's browse!
          </button>
        </div>
      </div>
    </div>
  );
}
