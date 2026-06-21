"use client";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { useAdminUsers } from "@/lib/admin";

const AdminUserMap = dynamic(() => import("@/components/AdminUserMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[calc(100dvh-220px)] min-h-[420px] rounded-2xl border border-stone-800 bg-stone-900 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
    </div>
  ),
});

export default function AdminMapPage() {
  const { users, loading } = useAdminUsers();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">User Map</h1>
        <p className="text-stone-400 text-sm mt-1">Every geo-located signup, plotted worldwide. Click a cluster to see who's there.</p>
      </div>
      {loading ? (
        <div className="w-full h-[calc(100dvh-220px)] min-h-[420px] rounded-2xl border border-stone-800 bg-stone-900 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        <AdminUserMap users={users} />
      )}
    </div>
  );
}
