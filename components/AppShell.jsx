"use client";
import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import AuthModal from "@/components/AuthModal";
import WelcomeModal from "@/components/WelcomeModal";
import SplashScreen from "@/components/SplashScreen";

// Decides which layout to render: the mobile consumer app shell, or a
// full-screen admin surface. Admin routes get no mobile chrome.
export default function AppShell({ children }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isSeo = pathname?.startsWith("/yard-sales");

  if (isAdmin) {
    // Full-bleed: admin pages control their own layout entirely
    return <div className="min-h-[100dvh] bg-stone-50">{children}</div>;
  }

  if (isSeo) {
    // SEO landing pages render standalone (no mobile chrome) for clean crawling
    return <div className="min-h-[100dvh] bg-white">{children}</div>;
  }

  // Standard consumer mobile-app shell
  return (
    <>
      <SplashScreen />
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

