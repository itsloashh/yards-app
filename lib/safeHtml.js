// Helpers for putting user-written text (sale titles, addresses, tags) into
// places that are treated as HTML. Anything a user typed MUST go through these.

// For raw HTML strings (e.g. Leaflet map popups).
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// For <script type="application/ld+json"> blocks. Plain JSON.stringify leaves
// "<" alone, so a title containing "</script>" could break out of the block.
export function safeJsonLd(data) {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
