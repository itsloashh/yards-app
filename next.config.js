/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['images.unsplash.com'],
  },
  // Basic browser security headers on every page.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Don't let browsers guess file types (stops uploaded files being run as scripts)
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Don't let other sites put Yard$ inside a hidden frame (clickjacking)
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Don't leak full page addresses to other sites
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Location stays available to Yard$ itself; camera/mic are never needed
          { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=()" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
