"use client";
import { useEffect } from "react";

// Shown when a screen crashes, instead of a blank white page.
// "Try again" re-renders the screen without losing the rest of the app.
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center p-10 text-center" style={{ minHeight: "60vh" }}>
      <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-5">
        <span className="text-4xl" aria-hidden="true">🛠️</span>
      </div>
      <h2 className="text-xl font-bold text-stone-800 mb-2 font-display">Something went wrong</h2>
      <p className="text-stone-500 text-sm mb-6 max-w-[280px]">
        That screen hit a snag. Your account and your sales are fine.
      </p>
      <div className="flex flex-col gap-2 w-full max-w-[240px]">
        <button
          onClick={() => reset()}
          className="w-full py-3 text-white font-bold rounded-xl shadow-lg"
          style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}
        >
          Try again
        </button>
        <a href="/" className="w-full py-3 bg-stone-100 text-stone-700 font-semibold rounded-xl text-sm">
          Back to home
        </a>
      </div>
    </div>
  );
}
