import Link from "next/link";

export const metadata = { title: "Page Not Found | Yard$" };

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center" style={{ minHeight: "60vh" }}>
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-5">
        <span className="text-4xl" aria-hidden="true">🧭</span>
      </div>
      <h2 className="text-xl font-bold text-stone-800 mb-2 font-display">Page not found</h2>
      <p className="text-stone-500 text-sm mb-6 max-w-[280px]">
        That link doesn&apos;t go anywhere. The sale may have ended or been removed.
      </p>
      <Link
        href="/"
        className="px-8 py-3 text-white font-bold rounded-xl shadow-lg"
        style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}
      >
        Browse sales
      </Link>
    </div>
  );
}
