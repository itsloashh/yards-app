"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Globe2, Users, BarChart3, LogOut, ShieldCheck, Loader2, Lock, Menu, X } from "lucide-react";
import { useAdminAuth } from "@/lib/admin";
import { supabase } from "@/lib/supabase";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/map", label: "User Map", icon: Globe2 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/regions", label: "Regions", icon: BarChart3 },
];

export default function AdminLayout({ children }) {
  const { status, profile } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // ─── Gate states ───
  if (status === "loading") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-stone-950">
        <div className="flex flex-col items-center gap-3 text-stone-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-sm">Verifying access…</p>
        </div>
      </div>
    );
  }

  if (status === "noauth" || status === "denied") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-stone-950 p-6">
        <div className="max-w-sm w-full bg-stone-900 border border-stone-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-stone-800 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-stone-500" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Admin Access Only</h1>
          <p className="text-stone-400 text-sm mb-6">
            {status === "noauth"
              ? "You need to sign in with an admin account to access this dashboard."
              : "This account doesn't have admin privileges."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition text-sm"
          >
            {status === "noauth" ? "Go to Sign In" : "Back to Yard$"}
          </button>
        </div>
      </div>
    );
  }

  // ─── Authorized admin shell ───
  const SidebarContent = () => (
    <>
      <div className="px-5 py-5 border-b border-stone-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-lime-500 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight">Yard$ Admin</p>
            <p className="text-stone-500 text-[11px] truncate">{profile?.email}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                active
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "text-stone-400 hover:text-white hover:bg-stone-800/60"
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-stone-800 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-400 hover:text-white hover:bg-stone-800/60 transition"
        >
          <Globe2 className="w-[18px] h-[18px]" /> View Live App
        </Link>
        <button
          onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-400 hover:text-rose-400 hover:bg-stone-800/60 transition"
        >
          <LogOut className="w-[18px] h-[18px]" /> Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-[100dvh] bg-stone-950 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-stone-900 border-r border-stone-800 flex-col fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setMobileOpen(false)} />
          <aside className="lg:hidden fixed inset-y-0 left-0 w-64 bg-stone-900 border-r border-stone-800 flex flex-col z-50">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main content area */}
      <div className="flex-1 lg:ml-64 min-w-0">
        {/* Mobile topbar */}
        <div className="lg:hidden sticky top-0 z-20 bg-stone-900 border-b border-stone-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="text-stone-400 hover:text-white">
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-white font-bold text-sm">Yard$ Admin</span>
        </div>

        <main className="p-5 lg:p-8 max-w-[1400px]">{children}</main>
      </div>
    </div>
  );
}
