"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// PostHog snippet — loads async, won't block rendering
export function PostHogProvider({ children }) {
  const pathname = usePathname();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
    if (!key) return;

    // Load PostHog script
    if (!window.posthog) {
      window.posthog = { _q: [], _i: [key] };
      const script = document.createElement("script");
      script.src = "https://us-assets.i.posthog.com/static/array.js";
      script.async = true;
      script.onload = () => {
        if (window.posthog?.init) {
          window.posthog.init(key, {
            api_host: host,
            capture_pageview: false, // We capture manually on route change
            capture_pageleave: true,
          });
        }
      };
      document.head.appendChild(script);
    }
  }, []);

  // Track page views on route change
  useEffect(() => {
    if (window.posthog?.capture) {
      window.posthog.capture("$pageview", { $current_url: window.location.href });
    }
  }, [pathname]);

  return children;
}

// Helper to track custom events
export function trackEvent(event, properties = {}) {
  if (typeof window !== "undefined" && window.posthog?.capture) {
    window.posthog.capture(event, properties);
  }
}
