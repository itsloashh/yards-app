"use client";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import AuthModal from "@/components/AuthModal";
import WelcomeModal from "@/components/WelcomeModal";
import SplashScreen from "@/components/SplashScreen";
import BrandChooser from "@/components/BrandChooser";

// Decides which layout to render: the mobile consumer app shell, a
// full-screen admin surface, or the standalone golf section.
export default function AppShell({ children }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isSeo = pathname?.startsWith("/yard-sales");
  const isGolf = pathname?.startsWith("/golf");

  // Brand chooser: shown after the splash on every visit to the home route.
  // Deliberately NOT remembered — we want every visitor choosing a side each
  // time, so the golf section is always surfaced.
  const [showChooser, setShowChooser] = useState(false);
  useEffect(() => {
    // Only consider showing the chooser on the main app home, not deep links
    if (pathname === "/") {
      // Wait for the splash to finish before showing the chooser
      const t = setTimeout(() => setShowChooser(true), 2000);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  if (isAdmin) {
    // Full-bleed: admin pages control their own layout entirely
    return <div className="min-h-[100dvh] bg-stone-50">{children}</div>;
  }

  if (isSeo) {
    // SEO landing pages render standalone (no mobile chrome) for clean crawling
    return <div className="min-h-[100dvh] bg-white">{children}</div>;
  }

  if (isGolf) {
    // Golf section has its own layout/shell entirely
    return <>{children}</>;
  }

  // Standard consumer mobile-app shell
  return (
    <>
      <SplashScreen />
      {showChooser && <BrandChooser onChoose={() => setShowChooser(false)} />}
      <div className="md:max-w-md mx-auto bg-white min-h-[100dvh] h-[100dvh] relative shadow-2xl flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto no-scrollbar">{children}</main>
        <BottomNav />
        <AuthModal />
        <WelcomeModal />
      </div>
    </>
  );
}

