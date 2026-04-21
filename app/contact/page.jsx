"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Mail, MessageCircle, Send } from "lucide-react";

const SUBJECTS = [
  "General Inquiry",
  "Bug Report",
  "Ad / Posting Question",
  "Account Issue",
  "Partnership / Sponsorship",
  "Feedback & Suggestions",
];

const CONTACT_EMAIL = "shopyardsapp@gmail.com";

export default function ContactPage() {
  const router = useRouter();
  const [subject, setSubject] = useState("General Inquiry");

  const openEmailApp = () => {
    const encodedSubject = encodeURIComponent(`[Yard$] ${subject}`);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodedSubject}`;
  };

  return (
    <div className="p-5 space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-stone-100 rounded-full">
          <ChevronLeft className="w-6 h-6 text-stone-600" />
        </button>
        <h1 className="text-xl font-bold text-stone-800 font-display">Contact Us</h1>
      </div>

      {/* Intro card */}
      <div
        className="rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #065f46, #059669, #84cc16)" }}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-white/15 backdrop-blur rounded-full flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold font-display text-lg">We'd love to hear from you</h2>
            <p className="text-white/80 text-sm mt-1 leading-relaxed">
              Pick a topic and we'll open your email app with everything ready to go. We typically respond within 24 hours.
            </p>
          </div>
        </div>
      </div>

      {/* Subject dropdown */}
      <div>
        <label className="block font-medium text-stone-800 mb-1.5">What's this about?</label>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white cursor-pointer"
        >
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Preview */}
      <div className="bg-stone-50 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Preview</p>
        <div className="flex items-start gap-2 text-sm">
          <span className="text-stone-500 font-medium w-14 shrink-0">To:</span>
          <span className="text-stone-800 break-all">{CONTACT_EMAIL}</span>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <span className="text-stone-500 font-medium w-14 shrink-0">Subject:</span>
          <span className="text-stone-800">[Yard$] {subject}</span>
        </div>
      </div>

      {/* Open email app button */}
      <button
        onClick={openEmailApp}
        className="w-full py-4 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2"
        style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}
      >
        <Send className="w-5 h-5" />
        Open Email App
      </button>

      {/* Direct copy fallback */}
      <div className="pt-2 text-center">
        <p className="text-stone-400 text-xs mb-1">Prefer to copy the email?</p>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold text-sm hover:underline"
        >
          <Mail className="w-4 h-4" />
          {CONTACT_EMAIL}
        </a>
      </div>
    </div>
  );
}
