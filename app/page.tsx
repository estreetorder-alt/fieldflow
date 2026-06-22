"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera,
  ClipboardList,
  Shield,
  Clock,
  Star,
  ChevronRight,
  MapPin,
  Users,
  CheckCircle,
} from "lucide-react";
import PublicNav from "./components/PublicNav";
import PublicFooter from "./components/PublicFooter";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      <PublicNav />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-sm font-medium px-4 py-1.5 rounded-full mb-8">
            <Star className="w-3.5 h-3.5" />
            Trusted by 500+ property managers
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight mb-6 tracking-tight">
            Field Inspections,
            <br />
            <span className="text-blue-400">Done Right.</span>
          </h1>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Schedule property inspections, surveys, and assessments with
            certified field agents. Real-time status updates and photo
            documentation — all in one platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push("/login")}
              className="bg-blue-500 hover:bg-blue-400 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors flex items-center justify-center gap-2"
            >
              Request Inspection
              <ChevronRight className="w-5 h-5" />
            </button>
            <Link
              href="/services"
              className="border border-slate-500 hover:border-slate-400 text-slate-300 hover:text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors flex items-center justify-center"
            >
              View Services
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-slate-50 border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { value: "2,400+", label: "Inspections Completed" },
            { value: "98%", label: "Client Satisfaction" },
            { value: "48hrs", label: "Average Turnaround" },
            { value: "150+", label: "Certified Agents" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-extrabold text-blue-700 mb-1">{stat.value}</div>
              <div className="text-sm text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">
              Everything you need, nothing you don&apos;t
            </h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              A purpose-built platform for field service management
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <ClipboardList className="w-6 h-6 text-blue-600" />,
                title: "Instant Scheduling",
                desc: "Submit an inspection request in under 2 minutes. Our agents are dispatched within 24 hours.",
              },
              {
                icon: <Camera className="w-6 h-6 text-blue-600" />,
                title: "Photo Documentation",
                desc: "Field agents capture and upload photos directly to your dashboard in real time.",
              },
              {
                icon: <Shield className="w-6 h-6 text-blue-600" />,
                title: "Verified Agents",
                desc: "Every agent is background-checked, licensed, and rated by previous clients.",
              },
              {
                icon: <Clock className="w-6 h-6 text-blue-600" />,
                title: "Real-Time Updates",
                desc: "Live status feed and email notifications at every stage — from assignment through completion.",
              },
              {
                icon: <MapPin className="w-6 h-6 text-blue-600" />,
                title: "Dynamic Pricing",
                desc: "Transparent pricing based on service type and urgency. No hidden fees.",
              },
              {
                icon: <Users className="w-6 h-6 text-blue-600" />,
                title: "Multi-Role Access",
                desc: "Separate portals for clients, field agents, and administrators.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">How it works</h2>
            <p className="text-slate-500 text-lg">Three steps to a completed inspection</p>
          </div>
          <div className="space-y-6">
            {[
              { step: "01", title: "Submit a Request", desc: "Enter your property address, select the service type, and get an instant price quote." },
              { step: "02", title: "Agent Dispatched", desc: "Our team assigns a certified agent to your job. You receive an email confirmation with their details." },
              { step: "03", title: "Receive Your Report", desc: "Photos and notes are uploaded to your dashboard. Download your full report in one click." },
            ].map((s) => (
              <div key={s.step} className="flex gap-6 items-start bg-white rounded-2xl p-6 border border-slate-200">
                <div className="text-4xl font-black text-blue-100 leading-none flex-shrink-0 w-14">{s.step}</div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">{s.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Highlights */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Services we offer</h2>
            <p className="text-slate-500 text-lg">From quick photo docs to full assessments</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { title: "Property Inspection", price: "From $100", tag: "Most popular" },
              { title: "Property Survey", price: "From $150", tag: "Pre-sale" },
              { title: "Full Assessment", price: "From $200", tag: "Investors" },
            ].map((s) => (
              <div key={s.title} className="bg-white border border-slate-200 rounded-2xl p-6 text-center hover:border-blue-200 hover:shadow-md transition-all">
                <span className="inline-block text-xs font-semibold bg-blue-50 text-blue-600 px-3 py-1 rounded-full mb-3">{s.tag}</span>
                <h3 className="font-bold text-slate-900 mb-1">{s.title}</h3>
                <p className="text-sm text-slate-500 mb-4">{s.price}</p>
                <CheckCircle className="w-6 h-6 text-blue-500 mx-auto" />
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/services" className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-800 transition-colors">
              See all services & pricing
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-blue-700 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-blue-200 mb-8 text-lg">
            Join hundreds of property managers who trust FieldFlow for their inspection needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push("/login")}
              className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-8 py-4 rounded-xl text-lg transition-colors inline-flex items-center justify-center gap-2"
            >
              Request Inspection
              <ChevronRight className="w-5 h-5" />
            </button>
            <Link
              href="/contact"
              className="border border-blue-400 text-white hover:bg-blue-600 font-semibold px-8 py-4 rounded-xl text-lg transition-colors inline-flex items-center justify-center"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
