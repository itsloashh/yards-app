import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Outfit, Fraunces } from "next/font/google";
import { AppProvider } from "@/lib/AppContext";
import { PostHogProvider } from "@/lib/posthog";
import AppShell from "@/components/AppShell";

const body = Outfit({ subsets: ["latin"], variable: "--font-body", weight: ["300", "400", "500", "600", "700", "800"] });
const display = Fraunces({ subsets: ["latin"], variable: "--font-display", weight: ["700", "800", "900"] });

export const metadata = {
  metadataBase: new URL("https://shopyards.ca"),
  title: "Yard$ — Find Yard Sales Near You | Live Garage & Estate Sale Map",
  description: "Find and post yard sales near you on Yard$, the live yard sale marketplace. Discover garage sales, estate sales, and rummage sales with addresses, photos, and directions.",
  manifest: "/manifest.json",
  themeColor: "#059669",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no",
  alternates: { canonical: "https://shopyards.ca" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Yard$",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon-32.png",
  },
  openGraph: {
    title: "Yard$ — Yard Sale Marketplace",
    description: "Find and post yard sales near you. The live yard sale map for your city.",
    url: "https://shopyards.ca",
    siteName: "Yard$",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Yard$ — The live yard sale marketplace",
      },
    ],
    locale: "en_CA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Yard$ — Yard Sale Marketplace",
    description: "Find and post yard sales near you. The live yard sale map for your city.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body className={`${body.className} bg-stone-100 antialiased`}>
        <PostHogProvider>
          <AppProvider>
            <AppShell>{children}</AppShell>
          </AppProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
