"use client";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import AuthModal from "@/components/AuthModal";
import WelcomeModal from "@/components/WelcomeModal";
import SplashScreen, { shouldShowSplash } from "@/components/SplashScreen";
import BrandChooser from "@/components/BrandChooser";

// Decides which layout to render: the mobile consumer app shell, a
// full-screen admin surface, or the standalone golf section.
export default function AppShell({ children }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isSeo = pathname?.startsWith("/yard-sales");
  const isGolf = pathname?.startsWith("/golf");

  // Splash + brand chooser: once per browsing session, and only when the
  // visitor arrives on the home screen. Opening the app fresh shows both again;
  // moving around inside the app (or opening a shared link) doesn't.
  // "pending" until we've checked on the client, then "splash" | "chooser" | "done".
  const [intro, setIntro] = useState("pending");
  useEffect(() => {
    if (intro !== "pending") return;
    if (shouldShowSplash(pathname)) { setIntro("splash"); return; }
    setIntro("done");
  }, [pathname, intro]);

  const chooserSeen = () => {
    try { return sessionStorage.getItem("yards_chooser_seen") === "1"; } catch { return false; }
  };
  const afterSplash = () => setIntro(chooserSeen() ? "done" : "chooser");
  const closeChooser = () => {
    try { sessionStorage.setItem("yards_chooser_seen", "1"); } catch {}
    setIntro("done");
  };

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
      {/* Plain cover for the split second before we know whether to play the splash (avoids a flash of the page) */}
      {intro === "pending" && pathname === "/" && <div className="fixed inset-0 z-[9999] bg-white" aria-hidden="true" />}
      {intro === "splash" && <SplashScreen onDone={afterSplash} />}
      {intro === "chooser" && <BrandChooser onChoose={closeChooser} />}
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

