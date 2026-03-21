"use client";

// Safe localStorage wrapper
function getLS(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function setLS(key, value) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function removeLS(key) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {}
}

export const store = {
  getUser: () => getLS("yards_user", null),
  setUser: (u) => u ? setLS("yards_user", u) : removeLS("yards_user"),
  getUsers: () => getLS("yards_users", []),
  setUsers: (u) => setLS("yards_users", u),
  getUserSales: () => getLS("yards_user_sales", []),
  setUserSales: (s) => setLS("yards_user_sales", s),
  getUnit: () => {
    if (typeof window === "undefined") return "km";
    try { return localStorage.getItem("yards_unit") || "km"; } catch { return "km"; }
  },
  setUnit: (u) => {
    if (typeof window === "undefined") return;
    try { localStorage.setItem("yards_unit", u); } catch {}
  },
  getSaved: () => getLS("yards_saved", []),
  setSaved: (s) => setLS("yards_saved", s),
};
