"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera, ClipboardList, Shield, Clock, Star, ChevronRight,
  MapPin, Users, CheckCircle, Car, Building2, Home, Gavel, DollarSign, Zap,
} from "lucide-react";
import PublicNav from "./components/PublicNav";
import PublicFooter from "./components/PublicFooter";

const FEATURES = [
  { icon:<ClipboardList className="w-6 h-6 text-blue-600"/>, title:"45+ Services", desc:"BPO photo sets, vehicle inspections, property assessments, occupancy checks, videography, and more — all in one platform." },
  { icon:<Camera className="w-6 h-6 text-blue-600"/>, title:"Photo Documentation", desc:"Field agents capture and upload photos directly to your dashboard. 30-day secure storage with download and email delivery." },
  { icon:<Shield className="w-6 h-6 text-blue-600"/>, title:"Verified & Graded Agents", desc:"Every agent submits a sample photo set before approval. Agents are graded on quality, speed, and reliability." },
  { icon:<Clock className="w-6 h-6 text-blue-600"/>, title:"Real-Time Updates", desc:"Live status feed, SSE push notifications, and automatic email on completion. Know exactly where your order stands." },
  { icon:<Zap className="w-6 h-6 text-blue-600"/>, title:"Auto-Dispatch", desc:"Orders are automatically dispatched to the highest-graded agent in your ZIP code within minutes of submission." },
  { icon:<Users className="w-6 h-6 text-blue-600"/>, title:"Multi-Role Access", desc:"Separate portals for clients (with employee sub-accounts), field agents, and administrators." },
];

const SERVICE_HIGHLIGHTS = [
  { icon:<Home className="w-5 h-5"/>, category:"BPO / REO Photo Sets", examples:"3, 4, 5, 6, 7, 8-photo exterior sets", from:"$40", color:"blue" },
  { icon:<Car className="w-5 h-5"/>, category:"Vehicle Inspections", examples:"Car, motorcycle, RV, boat, truck", from:"$45", color:"violet" },
  { icon:<Building2 className="w-5 h-5"/>, category:"Property Inspections", examples:"Pre-sale, REO, insurance, disaster", from:"$80", color:"emerald" },
  { icon:<MapPin className="w-5 h-5"/>, category:"Occupancy & Condition", examples:"Occupancy check, condition reports", from:"$80", color:"amber" },
  { icon:<Camera className="w-5 h-5"/>, category:"Videography", examples:"Exterior walkthrough, full interior, drone", from:"$150", color:"rose" },
  { icon:<ClipboardList className="w-5 h-5"/>, category:"Commercial & Rental", examples:"Retail, office, move-in/move-out", from:"$110", color:"sky" },
];

const COLOR_MAP: Record<string, string> = {
  blue:"bg-blue-50 text-blue-700 border-blue-200",
  violet:"bg-violet-50 text-violet-700 border-violet-200",
  emerald:"bg-emerald-50 text-emerald-700 border-emerald-200",
  amber:"bg-amber-50 text-amber-700 border-amber-200",
  rose:"bg-rose-50 text-rose-700 border-rose-200",
  sky:"bg-sky-50 text-sky-700 border-sky-200",
};

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
            Trusted by 500+ property managers &amp; REO companies
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight mb-6 tracking-tight">
            Field Inspections &amp;<br />
            <span className="text-blue-400">Photo Documentation</span>
          </h1>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            45+ services — BPO photo sets, vehicle inspections, property assessments, occupancy checks, and videography. Verified local agents dispatched within hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => router.push("/register/client")}
              className="bg-blue-500 hover:bg-blue-400 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors flex items-center justify-center gap-2">
              Order an Inspection
              <ChevronRight className="w-5 h-5" />
            </button>
            <Link href="/services"
              className="border border-slate-500 hover:border-slate-400 text-slate-300 hover:text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors flex items-center justify-center">
              View All Services
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-slate-50 border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { value:"2,400+", label:"Orders Completed" },
            { value:"98%",    label:"Client Satisfaction" },
            { value:"45+",    label:"Service Types" },
            { value:"150+",   label:"Verified Agents" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-extrabold text-blue-700 mb-1">{s.value}</div>
              <div className="text-sm text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Service highlights */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">45+ Services Available</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">From quick photo sets to full property assessments — fixed transparent pricing on every service.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICE_HIGHLIGHTS.map((s) => (
              <div key={s.category} className={`border rounded-2xl p-5 hover:shadow-md transition-shadow ${COLOR_MAP[s.color]}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    {s.icon}
                    <h3 className="font-bold text-slate-900">{s.category}</h3>
                  </div>
                  <span className="text-sm font-bold whitespace-nowrap">From {s.from}</span>
                </div>
                <p className="text-sm opacity-80">{s.examples}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/services" className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-800 transition-colors">
              See all 45+ services &amp; pricing
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Built for property professionals</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">Everything you need, nothing you don't</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">{f.icon}</div>
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">How it works</h2>
            <p className="text-slate-500 text-lg">Order to delivery in 3 steps</p>
          </div>
          <div className="space-y-6">
            {[
              { step:"01", title:"Submit Your Order", desc:"Enter the property address, select your service from 45+ options, choose turnaround (standard or rush), and pay securely via Stripe. Orders before 10 AM are dispatched same day." },
              { step:"02", title:"Agent Auto-Dispatched", desc:"Our system finds the highest-graded agent in your ZIP code and assigns them automatically. They have 3 hours to confirm. You receive email confirmation." },
              { step:"03", title:"Photos Delivered to Dashboard", desc:"Agent uploads photos directly to your client portal. You get an email the moment it's done. Photos stored for 30 days — download or email anytime." },
            ].map((s) => (
              <div key={s.step} className="flex gap-6 items-start bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-sm transition-shadow">
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

      {/* Pricing transparency */}
      <section className="py-16 px-4 bg-slate-50 border-y border-slate-200">
        <div className="max-w-3xl mx-auto text-center">
          <DollarSign className="w-10 h-10 text-blue-600 mx-auto mb-4"/>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Fixed, transparent pricing</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">No surprises. Every service has a flat price shown before you pay. Rush orders add a flat fee — not a percentage multiplier.</p>
          <div className="grid sm:grid-cols-3 gap-4 text-left">
            {[
              { tier:"Standard", timing:"Next business day", note:"Orders before 10 AM dispatch same day", color:"border-slate-200" },
              { tier:"Rush 24hr", timing:"+$15 flat fee", note:"Completed within 24 hours on business days", color:"border-amber-200 bg-amber-50" },
              { tier:"Rush 6hr", timing:"+$35 flat fee", note:"Completed within 6 hours during daylight", color:"border-red-200 bg-red-50" },
            ].map((t) => (
              <div key={t.tier} className={`border rounded-xl p-4 bg-white ${t.color}`}>
                <div className="font-bold text-slate-900 mb-1">{t.tier}</div>
                <div className="text-lg font-bold text-blue-700 mb-1">{t.timing}</div>
                <div className="text-xs text-slate-500">{t.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agent CTA */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-emerald-900 to-slate-900 rounded-3xl p-10 text-white text-center">
          <Camera className="w-12 h-12 text-emerald-400 mx-auto mb-4"/>
          <h2 className="text-2xl font-bold mb-3">Earn money as a field agent</h2>
          <p className="text-slate-300 mb-6 max-w-lg mx-auto">Accept inspection jobs in your area. Earn $40–$300+ per job. Paid weekly via PayPal. Work your own schedule.</p>
          <Link href="/work"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-6 py-3 rounded-xl transition-colors">
            Join as Field Agent
            <ChevronRight className="w-5 h-5"/>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-blue-700 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to place your first order?</h2>
          <p className="text-blue-200 mb-8 text-lg">Join hundreds of property managers and REO companies who trust FieldFlow.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => router.push("/register/client")}
              className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-8 py-4 rounded-xl text-lg transition-colors inline-flex items-center justify-center gap-2">
              Create Free Account
              <ChevronRight className="w-5 h-5"/>
            </button>
            <Link href="/contact"
              className="border border-blue-400 text-white hover:bg-blue-600 font-semibold px-8 py-4 rounded-xl text-lg transition-colors inline-flex items-center justify-center">
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
