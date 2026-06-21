"use client";
import { useState, useMemo } from "react";
import { Search, Loader2, MapPin, Tag, Mail, Calendar, ArrowUpDown, ShieldCheck } from "lucide-react";
import { useAdminUsers } from "@/lib/admin";

export default function AdminUsersPage() {
  const { users, loading } = useAdminUsers();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [filterSellers, setFilterSellers] = useState(false);

  const filtered = useMemo(() => {
    let list = [...users];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(u =>
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.location || "").toLowerCase().includes(q) ||
        (u.location_city || "").toLowerCase().includes(q) ||
        (u.location_country || "").toLowerCase().includes(q)
      );
    }
    if (filterSellers) list = list.filter(u => (u.sales_posted || 0) > 0);

    list.sort((a, b) => {
      let av, bv;
      switch (sortKey) {
        case "name": av = (a.name || "").toLowerCase(); bv = (b.name || "").toLowerCase(); break;
        case "sales_posted": av = a.sales_posted || 0; bv = b.sales_posted || 0; break;
        case "location": av = (a.location_country || "zzz").toLowerCase(); bv = (b.location_country || "zzz").toLowerCase(); break;
        default: av = new Date(a.created_at).getTime(); bv = new Date(b.created_at).getTime();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [users, query, sortKey, sortDir, filterSellers]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-stone-400 text-sm mt-1">{users.length.toLocaleString()} total · search, sort, and filter your community.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or location…"
            className="w-full pl-10 pr-4 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-sm text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <button
          onClick={() => setFilterSellers(s => !s)}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition flex items-center gap-2 ${
            filterSellers
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
              : "bg-stone-900 border-stone-800 text-stone-400 hover:text-white"
          }`}
        >
          <Tag className="w-4 h-4" /> Sellers only
        </button>
      </div>

      {/* Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-800 text-stone-500 text-xs uppercase tracking-wide">
                <th className="text-left font-medium px-4 py-3">
                  <button onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-white">User <ArrowUpDown className="w-3 h-3" /></button>
                </th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">
                  <button onClick={() => toggleSort("location")} className="flex items-center gap-1 hover:text-white">Location <ArrowUpDown className="w-3 h-3" /></button>
                </th>
                <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">
                  <button onClick={() => toggleSort("sales_posted")} className="flex items-center gap-1 hover:text-white">Sales <ArrowUpDown className="w-3 h-3" /></button>
                </th>
                <th className="text-left font-medium px-4 py-3 hidden lg:table-cell">
                  <button onClick={() => toggleSort("created_at")} className="flex items-center gap-1 hover:text-white">Joined <ArrowUpDown className="w-3 h-3" /></button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-stone-500">No users match your filters.</td></tr>
              ) : filtered.map((u) => (
                <tr key={u.id} className="border-b border-stone-800/50 hover:bg-stone-800/30 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ background: u.avatar_color || "#059669" }}>
                        {(u.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-stone-100 font-medium truncate flex items-center gap-1.5">
                          {u.name || "Unnamed"}
                          {u.role === "admin" && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                        </p>
                        <p className="text-stone-500 text-xs truncate flex items-center gap-1"><Mail className="w-3 h-3" />{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {u.location ? (
                      <span className="text-stone-300 text-xs flex items-center gap-1"><MapPin className="w-3 h-3 text-emerald-500" />{u.location}</span>
                    ) : (
                      <span className="text-stone-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`text-xs font-semibold ${(u.sales_posted || 0) > 0 ? "text-emerald-400" : "text-stone-500"}`}>{u.sales_posted || 0}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-stone-400 text-xs flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(u.created_at).toLocaleDateString()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-stone-500 text-xs">Showing {filtered.length.toLocaleString()} of {users.length.toLocaleString()} users</p>
    </div>
  );
}
