"use client";

import { useState } from "react";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import {
  Mail, Phone, MapPin, Clock, CheckCircle, Send,
  MessageSquare, Building2, Users,
} from "lucide-react";

const CONTACT_REASONS = [
  "Request a quote",
  "Technical support",
  "Billing question",
  "Partnership inquiry",
  "Join as a field agent",
  "Other",
];

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    reason: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setSubmitted(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-white">
      <PublicNav />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-5">Get in Touch</h1>
          <p className="text-xl text-slate-300 max-w-xl mx-auto leading-relaxed">
            Questions about pricing, coverage, or how FieldFlow works? We&apos;re here to help.
          </p>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-12">
          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Contact Information</h2>
              <div className="space-y-5">
                {[
                  {
                    icon: <Mail className="w-5 h-5 text-blue-600" />,
                    label: "Email",
                    value: "support@fieldflow.com",
                    sub: "We reply within 4 business hours",
                  },
                  {
                    icon: <Phone className="w-5 h-5 text-blue-600" />,
                    label: "Phone",
                    value: "1-800-FIELDFLOW",
                    sub: "Mon–Fri, 8am–6pm CST",
                  },
                  {
                    icon: <MapPin className="w-5 h-5 text-blue-600" />,
                    label: "Headquarters",
                    value: "Chicago, IL",
                    sub: "Serving all 50 states",
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{item.label}</div>
                      <div className="font-semibold text-slate-900">{item.value}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{item.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-8 space-y-4">
              <h3 className="font-semibold text-slate-900">Other ways to connect</h3>
              {[
                { icon: <Clock className="w-4 h-4" />, text: "Typical response: under 4 hours" },
                { icon: <MessageSquare className="w-4 h-4" />, text: "Live chat available on the client portal" },
                { icon: <Building2 className="w-4 h-4" />, text: "Enterprise accounts get a dedicated rep" },
                { icon: <Users className="w-4 h-4" />, text: "Agent inquiries: join our staff page" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="text-blue-500">{item.icon}</span>
                  {item.text}
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-12 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Message Sent!</h3>
                <p className="text-slate-500 max-w-sm mx-auto">
                  Thanks for reaching out. A member of our team will follow up within 4 business hours.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: "", email: "", company: "", reason: "", message: "" }); }}
                  className="mt-6 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-5">
                <h2 className="text-xl font-bold text-slate-900 mb-2">Send us a message</h2>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
                    <input
                      required
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Jane Smith"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address *</label>
                    <input
                      required
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="jane@company.com"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Company</label>
                    <input
                      name="company"
                      value={form.company}
                      onChange={handleChange}
                      placeholder="Acme Realty (optional)"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason for Contact *</label>
                    <select
                      required
                      name="reason"
                      value={form.reason}
                      onChange={handleChange}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white"
                    >
                      <option value="">Select a reason…</option>
                      {CONTACT_REASONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Message *</label>
                  <textarea
                    required
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    rows={5}
                    placeholder="Tell us how we can help…"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="animate-pulse">Sending…</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Message
                    </>
                  )}
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
