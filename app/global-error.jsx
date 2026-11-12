"use client";

// Last-resort screen if the whole app shell crashes. It replaces the root
// layout, so it must include its own <html> and <body> and can't rely on
// the app's stylesheet.
export default function GlobalError({ error, reset }) {
  if (typeof console !== "undefined") console.error("[global error]", error);
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", background: "#f5f5f4", color: "#1c1917" }}>
        <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#059669", marginBottom: 16 }}>Yard$</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "#78716c", margin: "0 0 24px", maxWidth: 280 }}>
            The app hit a snag. Your account and your sales are fine.
          </p>
          <button
            onClick={() => reset()}
            style={{ width: 240, padding: "14px 0", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 15, background: "linear-gradient(135deg, #059669, #84cc16)" }}
          >
            Try again
          </button>
          <a href="/" style={{ marginTop: 12, fontSize: 14, color: "#059669", fontWeight: 600 }}>Back to home</a>
        </div>
      </body>
    </html>
  );
}
