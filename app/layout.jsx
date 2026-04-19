import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Outfit, Fraunces } from "next/font/google";
import { AppProvider } from "@/lib/AppContext";
import { PostHogProvider } from "@/lib/posthog";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import AuthModal from "@/components/AuthModal";
import SplashScreen from "@/components/SplashScreen";

const body = Outfit({ subsets: ["latin"], variable: "--font-body", weight: ["300", "400", "500", "600", "700", "800"] });
const display = Fraunces({ subsets: ["latin"], variable: "--font-display", weight: ["700", "800", "900"] });

export const metadata = {
  metadataBase: new URL("https://shopyards.ca"),
  title: "Yard$ — Yard Sale Marketplace",
  description: "Find and post yard sales near you. The live yard sale map for your city.",
  manifest: "/manifest.json",
  themeColor: "#059669",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Yard$" },
  icons: { apple: "/icon-192.png" },
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
        <SplashScreen />
        <PostHogProvider>
          <AppProvider>
            <div className="md:max-w-md mx-auto bg-white min-h-[100dvh] h-[100dvh] relative shadow-2xl flex flex-col overflow-hidden">
              <Header />
              <main className="flex-1 overflow-y-auto no-scrollbar">
                {children}
              </main>
              <BottomNav />
              <AuthModal />
            </div>
          </AppProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
