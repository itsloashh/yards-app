"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Send, Mail, MessageCircle, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useApp } from "@/lib/AppContext";

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
  const { user, profile } = useApp();

  const [form, setForm] = useState({
    name: profile?.name || "",
    email: user?.email || "",
    subject: "General Inquiry",
    message: "",
  });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    if (!form.message.trim()) e.message = "Please write a message";
    else if (form.message.trim().length < 10) e.message = "Message should be at least 10 characters";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async () => {
    if (!validate()) return;
    setSending(true);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      subject: form.subject,
      message: form.message.trim(),
      user_id: user?.id || null,
      source: "shopyards.ca",
      submitted_at: new Date().toISOString(),
    };

    const webhookUrl = process.env.NEXT_PUBLIC_N8N_CONTACT_WEBHOOK;

    // If a webhook is configured, send there (production-ready)
    if (webhookUrl) {
      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Webhook returned ${res.status}`);
        setSending(false);
        setSent(true);
        return;
      } catch (err) {
        console.warn("[contact] Webhook failed, falling back to mailto:", err);
        // Fall through to mailto
      }
    }

    // Fallback: open user's email client pre-filled
    const subject = encodeURIComponent(`[Yard$] ${form.subject} — from ${form.name}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\n` +
      `Email: ${form.email}\n` +
      `Subject: ${form.subject}\n` +
      (user?.id ? `User ID: ${user.id}\n` : "") +
      `\n---\n\n${form.message}\n\n---\nSent from shopyards.ca`
    );
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;

    setSending(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="p-5 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-stone-100 rounded-full">
            <ChevronLeft className="w-6 h-6 text-stone-600" />
          </button>
          <h1 className="text-xl font-bold text-stone-800 font-display">Contact Us</h1>
        </div>

        <div className="flex flex-col items-center text-center py-10">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
            style={{ background: "linear-gradient(135deg, #ecfdf5, #d1fae5)" }}
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-stone-800 mb-2 font-display">Message sent!</h3>
          <p className="text-stone-600 text-sm max-w-[280px] leading-relaxed">
            Thanks for reaching out — we'll get back to you as soon as possible.
          </p>

          <button
            onClick={() => router.push("/")}
            className="mt-8 px-8 py-3 text-white font-bold rounded-xl shadow-lg transition"
            style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}
          >
            Back to Browse
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-stone-100 rounded-full">
          <ChevronLeft className="w-6 h-6 text-stone-600" />
        </button>
        <h1 className="text-xl font-bold text-stone-800 font-display">Contact Us</h1>
      </div>

      {/* Intro card */}
      <div className="rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #065f46, #059669, #84cc16)" }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-white/15 backdrop-blur rounded-full flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold font-display text-lg">We'd love to hear from you</h2>
            <p className="text-white/80 text-sm mt-1 leading-relaxed">
              Found a bug, got a question, or want to partner with us? Drop a message — we typically respond within 24 hours.
            </p>
          </div>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block font-medium text-stone-800 mb-1.5">Name <span className="text-rose-500">*</span></label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Your name"
          className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm ${
            errors.name ? "border-rose-300 bg-rose-50" : "border-stone-200"
          }`}
        />
        {errors.name && (
          <p className="text-rose-500 text-xs mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />{errors.name}
          </p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="block font-medium text-stone-800 mb-1.5">Email <span className="text-rose-500">*</span></label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@example.com"
            className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm ${
              errors.email ? "border-rose-300 bg-rose-50" : "border-stone-200"
            }`}
          />
        </div>
        {errors.email && (
          <p className="text-rose-500 text-xs mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />{errors.email}
          </p>
        )}
      </div>

      {/* Subject dropdown */}
      <div>
        <label className="block font-medium text-stone-800 mb-1.5">What's this about?</label>
        <select
          value={form.subject}
          onChange={(e) => set("subject", e.target.value)}
          className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white cursor-pointer"
        >
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label className="block font-medium text-stone-800 mb-1.5">Message <span className="text-rose-500">*</span></label>
        <textarea
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          rows={6}
          placeholder="Tell us what's on your mind…"
          className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm ${
            errors.message ? "border-rose-300 bg-rose-50" : "border-stone-200"
          }`}
        />
        {errors.message && (
          <p className="text-rose-500 text-xs mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />{errors.message}
          </p>
        )}
        <p className="text-stone-400 text-xs mt-1">{form.message.length} characters</p>
      </div>

      {/* Submit */}
      <button
        onClick={submit}
        disabled={sending}
        className="w-full py-4 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 disabled:opacity-70"
        style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}
      >
        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        {sending ? "Sending…" : "Send Message"}
      </button>

      {/* Direct email fallback */}
      <p className="text-center text-stone-400 text-xs pt-2">
        Or email us directly at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-600 font-semibold hover:underline">
          {CONTACT_EMAIL}
        </a>
      </p>
    </div>
  );
}
