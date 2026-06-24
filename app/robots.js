export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: "https://shopyards.ca/sitemap.xml",
    host: "https://shopyards.ca",
  };
}
