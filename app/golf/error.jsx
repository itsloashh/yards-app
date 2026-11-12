"use client";
import { useEffect } from "react";

// Golf-styled crash screen (shown inside the golf layout).
export default function GolfError({ error, reset }) {
  useEffect(() => {
    console.error("[golf error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center p-10 text-center" style={{ minHeight: "60vh" }}>
      <h2 className="text-xl font-bold text-amber-50 mb-2 font-display">Something went wrong</h2>
      <p className="text-amber-50/70 text-sm mb-6 max-w-[280px]">
        That screen hit a snag. Scores you already saved are safe.
      </p>
      <div className="flex flex-col gap-2 w-full max-w-[240px]">
        <button
          onClick={() => reset()}
          className="w-full py-3 rounded-xl font-bold text-emerald-950 shadow-lg"
          style={{ background: "linear-gradient(135deg, #a3e635, #84cc16)" }}
        >
          Try again
        </button>
        <a href="/golf" className="w-full py-3 rounded-xl text-sm font-semibold text-amber-50/90 bg-white/10 border border-lime-200/15">
          Back to Yard$ Golf
        </a>
      </div>
    </div>
  );
}
