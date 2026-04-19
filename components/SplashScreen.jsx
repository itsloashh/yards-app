"use client";
import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Start fade-out after 1.6s, fully hide at 2.0s
    const fadeTimer = setTimeout(() => setFadingOut(true), 1600);
    const hideTimer = setTimeout(() => setVisible(false), 2000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-500 ease-out ${
        fadingOut ? "opacity-0" : "opacity-100"
      }`}
      style={{ pointerEvents: fadingOut ? "none" : "auto" }}
    >
      {/* Subtle decorative blobs in emerald/lime to match brand */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-20 -left-20 w-72 h-72 rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, #84cc16, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-[0.08]"
          style={{ background: "radial-gradient(circle, #059669, transparent 70%)" }}
        />
      </div>

      {/* Logo with entrance animation */}
      <div className="relative flex flex-col items-center">
        <div
          className="w-64 h-64 md:w-80 md:h-80 relative"
          style={{ animation: "splashLogoIn 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
        >
          {/* Soft glow behind logo */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(132,204,22,0.25), transparent 60%)",
              animation: "splashGlow 2s ease-in-out infinite",
            }}
          />
          <img
            src="/logo-sign.png"
            alt="Yard$"
            className="relative w-full h-full object-contain drop-shadow-lg"
          />
        </div>

        {/* Loading dots */}
        <div
          className="flex gap-1.5 mt-8"
          style={{ animation: "splashFadeIn 0.6s ease-out 0.8s both" }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: "#059669",
              animation: "splashDot 1.2s ease-in-out infinite",
              animationDelay: "0s",
            }}
          />
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: "#10b981",
              animation: "splashDot 1.2s ease-in-out infinite",
              animationDelay: "0.2s",
            }}
          />
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: "#84cc16",
              animation: "splashDot 1.2s ease-in-out infinite",
              animationDelay: "0.4s",
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes splashLogoIn {
          0% {
            opacity: 0;
            transform: scale(0.6) translateY(20px);
          }
          60% {
            opacity: 1;
            transform: scale(1.05) translateY(-4px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes splashGlow {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.95);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.05);
          }
        }
        @keyframes splashFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes splashDot {
          0%, 80%, 100% {
            transform: scale(0.6);
            opacity: 0.4;
          }
          40% {
            transform: scale(1.1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
