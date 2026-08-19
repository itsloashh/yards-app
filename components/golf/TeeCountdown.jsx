"use client";
import { useState, useEffect } from "react";
import { Clock, Flag, AlertCircle } from "lucide-react";

/**
 * Live countdown to a team's tee time.
 * Falls back to plain text when no real timestamp is set, since tee_time is a
 * free-text field and older tournaments won't have tee_time_at populated.
 */
export default function TeeCountdown({ team }) {
  const target = team?.tee_time_at ? new Date(team.tee_time_at) : null;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [target]);

  const displayTime =
    target
      ? target.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : team?.tee_time || "TBD";

  let state = "none";
  let label = "";
  if (target) {
    const diff = target.getTime() - now.getTime();
    const mins = Math.floor(Math.abs(diff) / 60000);
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    const parts = hrs > 0 ? `${hrs}h ${rem}m` : `${mins}m`;

    if (diff > 0) {
      state = mins <= 15 ? "soon" : "waiting";
      label = mins <= 1 ? "Tee off now" : `Tees off in ${parts}`;
    } else {
      state = "started";
      label = mins < 1 ? "Teeing off now" : `Started ${parts} ago`;
    }
  }

  const tone =
    state === "soon" ? "border-amber-300/50 bg-amber-300/12"
    : state === "started" ? "border-lime-200/15 bg-emerald-950/55"
    : "border-lime-200/15 bg-emerald-950/55";

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className={`rounded-xl px-3 py-2.5 border transition ${tone} ${state === "soon" ? "animate-pulse" : ""}`}>
        <p className="text-amber-50/55 text-[11px] flex items-center gap-1">
          <Clock className="w-3 h-3" /> Tee time
        </p>
        <p className="text-white font-bold mt-0.5">{displayTime}</p>
        {label && (
          <p className={`text-[11px] mt-0.5 font-medium flex items-center gap-1 ${
            state === "soon" ? "text-amber-200" : "text-lime-300/80"
          }`}>
            {state === "soon" && <AlertCircle className="w-3 h-3" />}
            {label}
          </p>
        )}
      </div>

      <div className="rounded-xl px-3 py-2.5 border border-lime-200/15 bg-emerald-950/55">
        <p className="text-amber-50/55 text-[11px] flex items-center gap-1">
          <Flag className="w-3 h-3" /> Start hole
        </p>
        <p className="text-white font-bold mt-0.5">#{team?.starting_hole ?? 1}</p>
      </div>
    </div>
  );
}
