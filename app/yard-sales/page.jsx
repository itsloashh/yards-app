import Link from "next/link";
import { getActiveCities, getActiveSales } from "@/lib/seoData";

export const revalidate = 1800;

export async function generateMetadata() {
  const sales = await getActiveSales();
  const title = "Yard Sales Near You — Live Map of Garage & Estate Sales | Yard$";
  const description = `Browse ${sales.length} live yard sales across Canada and beyond on Yard$. Find garage sales, estate sales, and rummage sales near you with addresses, photos, and directions.`;
  return {
    title, description,
    alternates: { canonical: "https://shopyards.ca/yard-sales" },
    openGraph: { title, description, url: "https://shopyards.ca/yard-sales", type: "website" },
  };
}

export default async function YardSalesIndex() {
  const cities = await getActiveCities();
  const sales = await getActiveSales();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px 64px", fontFamily: "system-ui, -apple-system, sans-serif", color: "#1c1917" }}>
      <nav style={{ marginBottom: 24 }}>
        <Link href="/" style={{ color: "#059669", fontWeight: 700, fontSize: 20, textDecoration: "none" }}>Yard$</Link>
      </nav>

      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 8px", lineHeight: 1.2 }}>Yard Sales Near You</h1>
        <p style={{ fontSize: 16, color: "#57534e", margin: 0 }}>
          {sales.length} live sale{sales.length !== 1 ? "s" : ""} across {cities.length} {cities.length === 1 ? "city" : "cities"} on the Yard$ live map.
        </p>
        <div style={{ marginTop: 16 }}>
          <Link href="/" style={{ display: "inline-block", background: "linear-gradient(135deg, #059669, #84cc16)", color: "white", fontWeight: 700, padding: "12px 22px", borderRadius: 12, textDecoration: "none", fontSize: 15 }}>
            Open the live map →
          </Link>
        </div>
      </header>

      {cities.length > 0 ? (
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px" }}>Browse by city</h2>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
            {cities.map((c) => (
              <Link key={c.slug} href={`/yard-sales/${c.slug}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, textDecoration: "none", color: "#1c1917" }}>
                <span style={{ fontWeight: 600 }}>{c.city}{c.region ? <span style={{ color: "#78716c", fontWeight: 400 }}>, {c.region}</span> : null}</span>
                <span style={{ color: "#059669", fontWeight: 700 }}>{c.count}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <p style={{ color: "#78716c" }}>No live sales right now. <Link href="/create" style={{ color: "#059669" }}>Post the first one →</Link></p>
      )}

      <footer style={{ marginTop: 48, paddingTop: 20, borderTop: "1px solid #e7e5e4", fontSize: 13, color: "#a8a29e" }}>
        <p>Yard$ — the original live yard sale marketplace. <Link href="/" style={{ color: "#059669" }}>shopyards.ca</Link></p>
      </footer>
    </div>
  );
}
