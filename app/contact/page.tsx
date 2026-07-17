"use client";
import { useState } from "react";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import { Mail, Phone, MapPin, Send, CheckCircle, XCircle } from "lucide-react";

const INFO_CARDS = [
  { icon: Mail, title: "Email Us", line1: "contact@snapect.com", line2: "We reply within 24 hours" },
  { icon: Phone, title: "Call Us", line1: "1-800-SNAPECT", line2: "Mon-Fri, 9am-6pm EST" },
  { icon: MapPin, title: "Coverage", line1: "35+ States", line2: "Nationwide service" },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) return;
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setStatus("error");
        return;
      }
      setStatus("sent");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      setError("Network error — please try again");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF6EF] pt-20">
      <PublicNav />

      <section className="py-16 px-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-5 leading-tight">
          <span className="text-[#2A2320]">Get in </span>
          <span className="text-[#C2410C]">Touch</span>
        </h1>
        <p className="text-lg text-[#6B5D52] max-w-xl mx-auto">
          Have questions about our services? Our team is here to help. Reach out and we&apos;ll respond promptly.
        </p>
      </section>

      <section className="px-4 pb-20">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="space-y-4">
            {INFO_CARDS.map((c) => (
              <div key={c.title} className="bg-white border border-[#E7DBCB] rounded-2xl p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#FCEEE3] flex items-center justify-center flex-shrink-0">
                  <c.icon className="w-5 h-5 text-[#C2410C]" />
                </div>
                <div>
                  <p className="font-bold text-[#2A2320] text-sm mb-0.5">{c.title}</p>
                  <p className="text-[#C2410C] font-semibold text-sm">{c.line1}</p>
                  <p className="text-[#8A7A6C] text-xs mt-0.5">{c.line2}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="md:col-span-2 bg-white border border-[#E7DBCB] rounded-2xl p-6 sm:p-8">
            {status === "sent" ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <CheckCircle className="w-12 h-12 text-green-600 mb-4" />
                <h3 className="text-xl font-bold text-[#2A2320] mb-2">Message sent</h3>
                <p className="text-[#6B5D52] text-sm">Thanks for reaching out — we&apos;ll respond within 24 hours.</p>
                <button onClick={() => setStatus("idle")} className="mt-6 text-sm font-semibold text-[#C2410C] hover:underline">
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-[#2A2320] mb-1.5">Name</label>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Your name"
                      className="w-full border border-[#E7DBCB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#2A2320] mb-1.5">Email</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="w-full border border-[#E7DBCB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#2A2320] mb-1.5">Subject</label>
                  <input
                    required
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    placeholder="How can we help?"
                    className="w-full border border-[#E7DBCB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#2A2320] mb-1.5">Message</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    placeholder="Tell us more..."
                    className="w-full border border-[#E7DBCB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C2410C] resize-none"
                  />
                </div>

                {status === "error" && (
                  <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                    <XCircle className="w-4 h-4 flex-shrink-0" />{error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full flex items-center justify-center gap-2 bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-50 text-white font-bold py-3.5 rounded-full transition-colors"
                >
                  {status === "sending" ? "Sending…" : "Send Message"}
                  {status !== "sending" && <Send className="w-4 h-4" />}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
