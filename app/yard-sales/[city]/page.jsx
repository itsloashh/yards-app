import Link from "next/link";
import { notFound } from "next/navigation";
import { getSalesByCitySlug, getActiveCities, citySlug, titleCaseCity } from "@/lib/seoData";

// Revalidate the page every 30 min so new sales appear without a full rebuild.
export const revalidate = 1800;

// Pre-generate pages for cities that currently have sales (faster + indexable).
export async function generateStaticParams() {
  const cities = await getActiveCities();
  return cities.map((c) => ({ city: c.slug }));
}

// Per-page SEO metadata
export async function generateMetadata({ params }) {
  const cityName = titleCaseCity(params.city);
  const sales = await getSalesByCitySlug(params.city);
  const count = sales.length;
  const title = `Yard Sales in ${cityName} This Weekend (${count} live) | Yard$`;
  const description = count > 0
    ? `Find ${count} live yard sale${count !== 1 ? "s" : ""} in ${cityName} right now on Yard$. See addresses, dates, photos, and directions for garage sales, estate sales, and rummage sales near you.`
    : `Looking for yard sales in ${cityName}? Yard$ is the live yard sale map. Be the first to post a garage or yard sale in ${cityName} and reach local shoppers.`;
  return {
    title,
    description,
    alternates: { canonical: `https://shopyards.ca/yard-sales/${params.city}` },
    openGraph: {
      title, description,
      url: `https://shopyards.ca/yard-sales/${params.city}`,
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

function fmtDate(s) {
  return s.date_display || "Date TBD";
}

export default async function CityPage({ params }) {
  const slug = params.city;
  const cityName = titleCaseCity(slug);
  const sales = await getSalesByCitySlug(slug);

  // Other cities to cross-link (helps crawl + internal linking)
  const allCities = await getActiveCities();
  const otherCities = allCities.filter((c) => c.slug !== slug).slice(0, 12);

  // If this city was never a real city slug and has nothing, still render a
  // useful "post the first sale" page rather than 404 — good for long-tail SEO.
  const region = sales[0]?.region || "";

  // JSON-LD structured data for the list of events
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Yard Sales in ${cityName}`,
    itemListElement: sales.slice(0, 50).map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Event",
        name: s.title,
        description: (s.description || "").slice(0, 200),
        startDate: s.date_raw || undefined,
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: {
          "@type": "Place",
          name: s.address || cityName,
          address: s.address || cityName,
          geo: s.lat && s.lng ? { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lng } : undefined,
        },
        url: `https://shopyards.ca/sale/${s.id}`,
        image: s.photos?.[0] || undefined,
      },
    })),
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px 64px", fontFamily: "system-ui, -apple-system, sans-serif", color: "#1c1917" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <nav style={{ marginBottom: 24 }}>
        <Link href="/" style={{ color: "#059669", fontWeight: 700, fontSize: 20, textDecoration: "none" }}>Yard$</Link>
      </nav>

      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 8px", lineHeight: 1.2 }}>
          Yard Sales in {cityName}{region ? `, ${region}` : ""}
        </h1>
        <p style={{ fontSize: 16, color: "#57534e", margin: 0 }}>
          {sales.length > 0
            ? `${sales.length} live yard sale${sales.length !== 1 ? "s" : ""} happening in ${cityName} right now. Tap any sale for the address, photos, and directions.`
            : `No live yard sales in ${cityName} at the moment. Check back soon, or post your own to reach local shoppers.`}
        </p>
        <div style={{ marginTop: 16 }}>
          <Link href="/" style={{ display: "inline-block", background: "linear-gradient(135deg, #059669, #84cc16)", color: "white", fontWeight: 700, padding: "12px 22px", borderRadius: 12, textDecoration: "none", fontSize: 15 }}>
            Open the live map →
          </Link>
        </div>
      </header>

      {/* Sales list */}
      {sales.length > 0 && (
        <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {sales.map((s) => {
            const boosted = s.boosted_until && new Date(s.boosted_until).getTime() > Date.now();
            return (
              <article key={s.id} style={{ border: boosted ? "2px solid #f59e0b" : "1px solid #e7e5e4", borderRadius: 16, overflow: "hidden", background: "white" }}>
                <Link href={`/sale/${s.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  {s.photos?.[0] ? (
                    <img src={s.photos[0]} alt={s.title} style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
                  ) : (
                    <div style={{ width: "100%", height: 160, background: "linear-gradient(135deg, #10b981, #84cc16)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>🏷️</div>
                  )}
                  <div style={{ padding: 14 }}>
                    {boosted && <span style={{ display: "inline-block", background: "linear-gradient(135deg, #d97706, #f59e0b)", color: "white", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, marginBottom: 6 }}>★ Featured</span>}
                    <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>{s.title}</h2>
                    {s.address && <p style={{ fontSize: 13, color: "#059669", margin: "0 0 4px" }}>📍 {s.address}</p>}
                    <p style={{ fontSize: 13, color: "#78716c", margin: 0 }}>{fmtDate(s)}</p>
                    {s.tags?.length > 0 && (
                      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {s.tags.slice(0, 3).map((t) => (
                          <span key={t} style={{ fontSize: 11, background: "#f5f5f4", color: "#57534e", padding: "2px 8px", borderRadius: 99 }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              </article>
            );
          })}
        </section>
      )}

      {/* SEO body copy */}
      <section style={{ marginTop: 40, fontSize: 15, color: "#44403c", lineHeight: 1.7 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 10px" }}>Finding yard sales in {cityName}</h2>
        <p style={{ margin: "0 0 12px" }}>
          Yard$ is the live yard sale marketplace for {cityName}{region ? ` and the surrounding ${region} area` : ""}. Unlike static directory listings, Yard$ shows sales happening right now on a live map — garage sales, estate sales, moving sales, and rummage sales — with real addresses, photos, and one-tap directions. Sellers post in minutes and shoppers find what's nearby today.
        </p>
        <p style={{ margin: 0 }}>
          Having a sale in {cityName}? <Link href="/create" style={{ color: "#059669", fontWeight: 600 }}>Post your yard sale</Link> and reach local buyers instantly. Boost it to appear at the top of the map and get seen by more shoppers.
        </p>
      </section>

      {/* Cross-links to other cities */}
      {otherCities.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px" }}>Yard sales in other cities</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {otherCities.map((c) => (
              <Link key={c.slug} href={`/yard-sales/${c.slug}`} style={{ fontSize: 14, color: "#059669", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "6px 12px", borderRadius: 99, textDecoration: "none" }}>
                {c.city} ({c.count})
              </Link>
            ))}
          </div>
        </section>
      )}

      <footer style={{ marginTop: 48, paddingTop: 20, borderTop: "1px solid #e7e5e4", fontSize: 13, color: "#a8a29e" }}>
        <p>Yard$ — the original live yard sale marketplace. <Link href="/" style={{ color: "#059669" }}>shopyards.ca</Link></p>
      </footer>
    </div>
  );
}
