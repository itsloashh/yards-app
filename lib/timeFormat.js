// Format a sale's date + time range for display, respecting user's time format preference
// dateRaw: "YYYY-MM-DD" string
// startTime / endTime: "HH:MM" strings (24h from <input type="time">) or ""
// timeFormat: "12h" or "24h"

export function formatTime(timeStr, timeFormat = "12h") {
  if (!timeStr || !/^\d{2}:\d{2}/.test(timeStr)) return "";
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr.padStart(2, "0");
  if (timeFormat === "24h") {
    return `${h.toString().padStart(2, "0")}:${m}`;
  }
  // 12h
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${suffix}`;
}

// Parses "YYYY-MM-DD" as LOCAL date, not UTC. Fixes the "posts on April 20 shows April 19" bug.
export function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function formatSaleDate(dateRaw, startTime, endTime, timeFormat = "12h") {
  const d = parseLocalDate(dateRaw);
  if (!d) return "TBD";
  const datePart = d.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
  const startStr = formatTime(startTime, timeFormat);
  const endStr = formatTime(endTime, timeFormat);
  if (startStr && endStr) return `${datePart}, ${startStr} – ${endStr}`;
  if (startStr) return `${datePart}, ${startStr}`;
  return datePart;
}
