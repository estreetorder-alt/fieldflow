"use client";
import { useState } from "react";
import { Send, CheckCircle } from "lucide-react";

export default function FeedbackForm({ defaultName, defaultEmail }: { defaultName: string; defaultEmail: string }) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [subject, setSubject] = useState("General Feedback");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in your name, email, and message.");
      return;
    }
    setError("");
    setSending(true);
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      if (!r.ok) throw new Error();
      setSent(true);
      setMessage("");
    } catch {
      setError("Couldn't send your feedback — please try again.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[var(--brand-navy)]">Thanks for the feedback!</h2>
        <p className="text-sm text-[var(--brand-ink-soft)] mt-1.5">Our team will take a look. You can send more anytime.</p>
        <button onClick={() => setSent(false)} className="mt-5 text-sm font-semibold text-[#FF6A00] hover:underline">Send another message</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[var(--brand-navy)]">Share your feedback</h2>
        <p className="text-sm text-[var(--brand-ink-soft)] mt-1">Suggestions, bug reports, or anything else you&apos;d like us to know — it goes straight to our team.</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-[var(--brand-ink-soft)] mb-1 block">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-[var(--brand-border)] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00]" />
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--brand-ink-soft)] mb-1 block">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full border border-[var(--brand-border)] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00]" />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-[var(--brand-ink-soft)] mb-1 block">Topic</label>
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border border-[var(--brand-border)] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6A00]">
          <option>General Feedback</option>
          <option>Feature Request</option>
          <option>Bug Report</option>
          <option>Order Experience</option>
          <option>Other</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold text-[var(--brand-ink-soft)] mb-1 block">Message</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="Tell us what's on your mind…" className="w-full border border-[var(--brand-border)] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00] resize-none" />
      </div>

      <button onClick={submit} disabled={sending} className="flex items-center gap-2 bg-[#FF6A00] hover:bg-[#FF8C1A] disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
        <Send className="w-4 h-4" />{sending ? "Sending…" : "Send Feedback"}
      </button>
    </div>
  );
}
