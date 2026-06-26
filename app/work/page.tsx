"use client";

import { useState } from "react";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import {
  CheckCircle, DollarSign, Clock, MapPin, Star, Camera,
  ChevronRight, Send, Users, Smartphone, Award,
} from "lucide-react";

const PERKS = [
  {
    icon: <DollarSign className="w-6 h-6 text-green-600" />,
    title: "Competitive Pay",
    desc: "Earn $40–$300+ per job depending on service type and urgency. Payments deposited weekly.",
  },
  {
    icon: <Clock className="w-6 h-6 text-blue-600" />,
    title: "Flexible Schedule",
    desc: "Accept jobs that fit your calendar. No minimums, no quotas — work when you want.",
  },
  {
    icon: <MapPin className="w-6 h-6 text-violet-600" />,
    title: "Work Locally",
    desc: "Only jobs in your area appear in your feed. No long drives or multi-state routing.",
  },
  {
    icon: <Smartphone className="w-6 h-6 text-rose-600" />,
    title: "Simple App",
    desc: "Accept, document, and complete jobs entirely through the FieldFlow agent dashboard — no extra equipment.",
  },
  {
    icon: <Award className="w-6 h-6 text-amber-600" />,
    title: "Build Your Rating",
    desc: "Top-rated agents get first pick of premium, high-value jobs and bonus pay for urgent orders.",
  },
  {
    icon: <Users className="w-6 h-6 text-sky-600" />,
    title: "Supportive Team",
    desc: "Dedicated agent support line plus an active community of field professionals to share tips.",
  },
];

const STEPS = [
  { step: "01", title: "Apply Online", desc: "Fill out the short application below. Takes about 3 minutes." },
  { step: "02", title: "Background Check", desc: "We run a standard background check — usually cleared within 48 hours." },
  { step: "03", title: "Short Orientation", desc: "Watch a 20-minute onboarding video and complete a short knowledge check." },
  { step: "04", title: "Start Earning", desc: "Your account goes live. Accept your first job and get paid within 7 days." },
];

export default function WorkPage() {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", city: "", state: "", experience: "", why: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSubmitted(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-white">
      <PublicNav />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Star className="w-3.5 h-3.5" />
            150+ active agents nationwide · Always hiring
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-5 leading-tight">
            Join Our Field Agent Network
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Earn flexible income conducting property inspections and photo documentation in your area. No real estate license required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <a
              href="#apply"
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors flex items-center justify-center gap-2"
            >
              Apply Now
              <ChevronRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-10 bg-slate-50 border-y border-slate-200">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: "$40–$300+", label: "Per Job" },
            { value: "Weekly", label: "Payouts" },
            { value: "150+", label: "Active Agents" },
            { value: "2,400+", label: "Jobs Completed" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-extrabold text-emerald-700 mb-1">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Perks */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Why agents choose FieldFlow</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">Flexible work, real income, no boss.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {PERKS.map((perk) => (
              <div key={perk.title} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-4">
                  {perk.icon}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{perk.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{perk.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">How to get started</h2>
            <p className="text-slate-500 text-lg">From application to first paycheck in under a week.</p>
          </div>
          <div className="space-y-5">
            {STEPS.map((s) => (
              <div key={s.step} className="flex gap-6 items-start bg-white rounded-2xl p-6 border border-slate-200">
                <div className="text-4xl font-black text-emerald-100 leading-none flex-shrink-0 w-14">{s.step}</div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">{s.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">What you&apos;ll need</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              "A smartphone with a camera (iOS or Android)",
              "A reliable vehicle and valid driver's license",
              "Ability to pass a standard background check",
              "Attention to detail and basic photography skills",
              "Willingness to follow our inspection protocols",
              "18+ years old and legally authorized to work in the US",
            ].map((req) => (
              <div key={req} className="flex items-start gap-3 text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                {req}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section id="apply" className="py-20 px-4 bg-slate-50 border-t border-slate-200">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Apply to Join</h2>
            <p className="text-slate-500">Takes 3 minutes. We&apos;ll follow up within 48 hours.</p>
          </div>

          {submitted ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-12 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Application Received!</h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                We&apos;ve got your info. A member of our agent team will reach out within 48 hours with next steps.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
                  <input required name="name" value={form.name} onChange={handleChange}
                    placeholder="Jane Smith"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address *</label>
                  <input required type="email" name="email" value={form.email} onChange={handleChange}
                    placeholder="jane@email.com"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number *</label>
                  <input required name="phone" value={form.phone} onChange={handleChange}
                    placeholder="555-123-4567"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">City *</label>
                  <input required name="city" value={form.city} onChange={handleChange}
                    placeholder="Chicago"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">State *</label>
                <input required name="state" value={form.state} onChange={handleChange}
                  placeholder="Illinois"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Relevant Experience (optional)
                </label>
                <select name="experience" value={form.experience} onChange={handleChange}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all bg-white">
                  <option value="">Select one…</option>
                  <option value="none">No experience</option>
                  <option value="photography">Photography / Videography</option>
                  <option value="real-estate">Real Estate or Property Management</option>
                  <option value="construction">Construction or Contracting</option>
                  <option value="inspection">Home Inspection</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Why do you want to join FieldFlow? *
                </label>
                <textarea required name="why" value={form.why} onChange={handleChange}
                  rows={3}
                  placeholder="Tell us a bit about yourself and what interests you about field work…"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                {loading ? <span className="animate-pulse">Submitting…</span> : <><Send className="w-4 h-4" />Submit Application</>}
              </button>
            </form>
          )}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
