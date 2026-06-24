// ─── REPORT REASONS ───
// Categories users can pick when reporting a sale or a user.

export const SALE_REPORT_REASONS = [
  { key: "spam", label: "Spam or duplicate listing" },
  { key: "scam", label: "Scam or fraud" },
  { key: "inappropriate", label: "Inappropriate content" },
  { key: "ended", label: "Sale already ended" },
  { key: "wrong_location", label: "Wrong or fake location" },
  { key: "other", label: "Something else" },
];

export const USER_REPORT_REASONS = [
  { key: "harassment", label: "Harassment or abuse" },
  { key: "scam", label: "Scam or fraud" },
  { key: "fake", label: "Fake account" },
  { key: "other", label: "Something else" },
];

export function reasonLabel(key) {
  const all = [...SALE_REPORT_REASONS, ...USER_REPORT_REASONS];
  return all.find((r) => r.key === key)?.label || key;
}
