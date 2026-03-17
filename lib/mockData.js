import { SALE_PHOTOS, STREET_NAMES } from "./constants";

export function generateMockSales(lat, lng) {
  const sales = [
    { title: "Moving Sale — Everything Must Go!", desc: "Furniture, electronics, kids toys, kitchen appliances, vintage records, and much more. 20+ years of treasures!", tags: ["Furniture", "Electronics", "Kids"], off: [0.008, 0.005], seller: { name: "Martha J.", rating: 4.8, sales: 12, bio: "Love finding new homes for old treasures!", phone: "", avatarColor: "#059669" } },
    { title: "Estate Sale — Antiques & Collectibles", desc: "Beautiful antique furniture, fine china, crystal glassware, vintage jewelry, old books, and rare collectibles.", tags: ["Antiques", "Jewelry", "Books"], off: [-0.012, 0.018], seller: { name: "Robert K.", rating: 4.9, sales: 8, bio: "Collector for 30 years. Time to share.", phone: "", avatarColor: "#3b82f6" }, featuredItems: [{ name: "Victorian Writing Desk", price: "450" }, { name: "1920s Crystal Chandelier", price: "800" }] },
    { title: "Baby & Kids Mega Sale", desc: "Gently used baby gear, strollers, cribs, toys, clothes (newborn to size 8), books, and outdoor play equipment.", tags: ["Baby", "Kids", "Toys"], off: [0.025, -0.015], seller: { name: "Sarah M.", rating: 4.7, sales: 5, bio: "Mom of 3 — outgrown everything!", phone: "", avatarColor: "#a855f7" } },
    { title: "Tools & Garage Cleanout", desc: "Power tools, hand tools, lawn equipment, automotive supplies, workbenches, and miscellaneous garage items.", tags: ["Tools", "Automotive", "Garden"], off: [-0.035, -0.028], seller: { name: "Dave P.", rating: 4.6, sales: 3, bio: "", phone: "", avatarColor: "#f59e0b" } },
    { title: "Vintage Vinyl & Music Gear", desc: "Thousands of vinyl records, turntables, speakers, guitars, amps, and music memorabilia.", tags: ["Music", "Vintage", "Electronics"], off: [0.055, 0.042], seller: { name: "Mike T.", rating: 5.0, sales: 15, bio: "DJ & vinyl addict since '85", phone: "", avatarColor: "#6366f1" }, featuredItems: [{ name: "1975 Fender Stratocaster", price: "2,200" }, { name: "Technics SL-1200 Turntable", price: "650" }] },
    { title: "Designer Clothing & Accessories", desc: "High-end designer clothing, handbags, shoes, and accessories. Most items 70-90% off retail!", tags: ["Clothing", "Vintage", "Jewelry"], off: [-0.068, 0.055], seller: { name: "Lisa R.", rating: 4.9, sales: 22, bio: "Fashion buyer downsizing my closet", phone: "", avatarColor: "#f43f5e" } },
    { title: "Outdoor & Camping Gear Sale", desc: "Tents, sleeping bags, hiking gear, fishing equipment, kayaks, bikes, and more outdoor adventure gear.", tags: ["Outdoor", "Sports"], off: [0.095, -0.075], seller: { name: "Tom H.", rating: 4.7, sales: 9, bio: "", phone: "", avatarColor: "#14b8a6" } },
  ];

  return sales.map((s, i) => ({
    id: `mock-${i + 1}`,
    title: s.title,
    description: s.desc,
    address: `${1234 + i * 111} ${STREET_NAMES[i]}`,
    date: i % 2 === 0 ? "Today, 8am – 2pm" : "Sat–Sun, 9am – 4pm",
    photos: [SALE_PHOTOS[i], SALE_PHOTOS[(i + 3) % SALE_PHOTOS.length]],
    seller: s.seller,
    tags: s.tags,
    coords: { lat: lat + s.off[0], lng: lng + s.off[1] },
    saved: false,
    featuredItems: s.featuredItems || null,
    createdAt: Date.now() - i * 86400000,
  }));
}
