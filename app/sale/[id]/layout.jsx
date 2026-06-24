import { getSaleById } from "@/lib/seoData";

// Server component layout — injects real per-sale metadata + JSON-LD into the
// HTML head so crawlers and social shares see proper titles/descriptions, even
// though the page body itself is an interactive client component.
export async function generateMetadata({ params }) {
  const sale = await getSaleById(params.id);
  if (!sale) {
    return { title: "Sale Not Found | Yard$" };
  }
  const loc = [sale.city, sale.region].filter(Boolean).join(", ");
  const title = `${sale.title}${loc ? ` — ${loc}` : ""} | Yard$`;
  const description = (sale.description || `A yard sale on Yard$${loc ? ` in ${loc}` : ""}.`).slice(0, 160);
  const image = sale.photos?.[0];
  return {
    title,
    description,
    alternates: { canonical: `https://shopyards.ca/sale/${sale.id}` },
    openGraph: {
      title, description,
      url: `https://shopyards.ca/sale/${sale.id}`,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title, description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function SaleLayout({ children, params }) {
  const sale = await getSaleById(params.id);

  // JSON-LD Event structured data for rich results
  let jsonLd = null;
  if (sale) {
    jsonLd = {
      "@context": "https://schema.org",
      "@type": "Event",
      name: sale.title,
      description: (sale.description || "").slice(0, 300),
      startDate: sale.date_raw || undefined,
      endDate: sale.end_date_raw || sale.date_raw || undefined,
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      location: {
        "@type": "Place",
        name: sale.address || sale.city || "Yard Sale",
        address: sale.address || sale.city || "",
        geo: sale.lat && sale.lng ? { "@type": "GeoCoordinates", latitude: sale.lat, longitude: sale.lng } : undefined,
      },
      image: sale.photos?.length ? sale.photos : undefined,
      url: `https://shopyards.ca/sale/${sale.id}`,
    };
  }

  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      {children}
    </>
  );
}
