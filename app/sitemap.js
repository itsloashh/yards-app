import { getActiveCities, getActiveSales } from "@/lib/seoData";

const BASE = "https://shopyards.ca";

export const revalidate = 1800;

export default async function sitemap() {
  const [cities, sales] = await Promise.all([getActiveCities(), getActiveSales()]);

  const staticPages = [
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/yard-sales`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/create`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/contact`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const cityPages = cities.map((c) => ({
    url: `${BASE}/yard-sales/${c.slug}`,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const salePages = sales.map((s) => ({
    url: `${BASE}/sale/${s.id}`,
    lastModified: s.created_at ? new Date(s.created_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticPages, ...cityPages, ...salePages];
}
