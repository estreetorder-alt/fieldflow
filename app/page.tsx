"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, ChevronRight, MapPin, Star, CheckCircle, DollarSign, Clock, Shield, Zap, Users, Car, Building2, Home, ClipboardList } from "lucide-react";
import PublicNav from "./components/PublicNav";
import PublicFooter from "./components/PublicFooter";

const TESTIMONIALS = [
  { name:"Arthur", city:"Jacksonville, FL", text:"We placed an order at 12:20 PM and received the photographs at 1:25 PM — that's 65 minutes later! It saved me an 8-hour round trip drive!" },
  { name:"Will", city:"Marietta, GA", text:"I used WeGoLook in former times, and this company is significantly cheaper, covers more areas, and so much faster." },
  { name:"Kelly", city:"California", text:"My life is all new thanks to FieldFlow. I went from putting 200+ miles on my car each week to next to nothing. Cannot thank you enough." },
  { name:"Bruce", city:"Keller Williams", text:"I am now in the BPO business full time with 3 employees. I could not have reached this level without your company." },
];

const SERVICES = [
  { icon:<Home className="w-5 h-5"/>, name:"BPO / REO Photo Sets", desc:"3–8 photo exterior sets", from:"$40" },
  { icon:<Car className="w-5 h-5"/>, name:"Vehicle Inspections", desc:"Car, motorcycle, RV, boat", from:"$45" },
  { icon:<Building2 className="w-5 h-5"/>, name:"Property Inspections", desc:"Pre-sale, REO, insurance", from:"$80" },
  { icon:<MapPin className="w-5 h-5"/>, name:"Occupancy Checks", desc:"Occupied / vacant verification", from:"$80" },
  { icon:<Camera className="w-5 h-5"/>, name:"Videography", desc:"Full walkthrough + drone", from:"$150" },
  { icon:<ClipboardList className="w-5 h-5"/>, name:"Commercial & Rental", desc:"Move-in/out, office, retail", from:"$110" },
];

const STEPS = [
  { n:"01", title:"Enter the Address", desc:"Type the property or vehicle address. We serve 8,500+ cities across the US. Our system validates and checks agent coverage instantly." },
  { n:"02", title:"Select Your Service", desc:"Choose from 45+ predefined services — each has a fixed price, a specific shot list, and clear instructions for the field agent. Or customize your own order." },
  { n:"03", title:"Choose Turnaround", desc:"Next business day (standard), 24-hour rush (+$15), or 6-hour rush (+$35). Orders before 10 AM local time are dispatched same day." },
  { n:"04", title:"Add Date Stamp (Optional)", desc:"Request a complimentary date stamp burned into every photo at no extra charge — useful for legal, insurance, or BPO documentation." },
  { n:"05", title:"Pay & Submit", desc:"Review your order details and pay securely via Stripe. Your order is dispatched to the highest-graded nearest agent within seconds." },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      <PublicNav />

      {/* Hero */}
      <section className="bg-[#0f1f3d] text-white py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=60 height=60 viewBox=0 0 60 60 xmlns=http://www.w3.org/2000/svg%3E%3Cg fill=none fill-rule=evenodd%3E%3Cg fill=%23ffffff opacity=0.03%3E%3Cpath d=M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-100" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-[#c8991a]/20 border border-[#c8991a]/40 text-[#f0b429] text-sm font-semibold px-4 py-1.5 rounded-full mb-8">
            <Star className="w-3.5 h-3.5 fill-current" />
            America&apos;s Trusted Field Inspection &amp; Photo Documentation Platform
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight mb-6 tracking-tight">
            BPO &amp; REO Photo Sets<br />
            <span className="text-[#f0b429]">Delivered in Hours</span>
          </h1>
          <p className="text-xl text-slate-300 mb-4 max-w-2xl mx-auto leading-relaxed">
            45+ services · Verified local agents · 35 states · 87% of standard orders completed within 24 hours
          </p>
          <p className="text-slate-400 text-sm mb-10">Vehicle inspections · Property assessments · Occupancy checks · Videography</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => router.push("/register/client")}
              className="bg-[#c8991a] hover:bg-[#f0b429] text-[#0f1f3d] font-bold px-8 py-4 rounded-xl text-lg transition-colors flex items-center justify-center gap-2 shadow-lg">
              Order an Inspection
              <ChevronRight className="w-5 h-5" />
            </button>
            <Link href="/services"
              className="border-2 border-[#1a3260] hover:border-[#c8991a] text-slate-300 hover:text-[#f0b429] font-semibold px-8 py-4 rounded-xl text-lg transition-colors flex items-center justify-center">
              View All 45+ Services
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-[#c8991a] py-4 px-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-8 text-[#0f1f3d] text-sm font-bold">
          {[["2,400+","Orders Completed"],["87%","Done Within 24hrs"],["45+","Service Types"],["35","States Covered"],["150+","Verified Agents"]].map(([v,l])=>(
            <div key={l} className="text-center">
              <div className="text-2xl font-extrabold">{v}</div>
              <div className="text-xs font-medium opacity-80">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="py-20 px-4 bg-[#faf8f3]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[#c8991a] font-bold text-sm uppercase tracking-wider mb-2">45+ Services Available</p>
            <h2 className="text-3xl font-bold text-[#0f1f3d] mb-3">Fixed Pricing. No Surprises.</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Every service has a flat price shown before you pay. Rush orders add a flat fee — not a percentage.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map(s=>(
              <div key={s.name} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-[#c8991a] hover:shadow-md transition-all group">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-[#0f1f3d] text-[#c8991a] rounded-xl flex items-center justify-center group-hover:bg-[#c8991a] group-hover:text-[#0f1f3d] transition-colors">{s.icon}</div>
                    <h3 className="font-bold text-[#0f1f3d]">{s.name}</h3>
                  </div>
                  <span className="text-[#c8991a] font-bold text-sm whitespace-nowrap">From {s.from}</span>
                </div>
                <p className="text-sm text-slate-500 ml-11">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/services" className="inline-flex items-center gap-2 text-[#0f1f3d] font-bold hover:text-[#c8991a] transition-colors border-2 border-[#0f1f3d] hover:border-[#c8991a] px-6 py-3 rounded-xl">
              See All 45+ Services &amp; Prices <ChevronRight className="w-4 h-4"/>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works — 5 steps like Velocity */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#c8991a] font-bold text-sm uppercase tracking-wider mb-2">Simple Process</p>
            <h2 className="text-3xl font-bold text-[#0f1f3d] mb-3">How It Works</h2>
            <p className="text-slate-500">From order to delivered photos in as little as 6 hours</p>
          </div>
          <div className="space-y-5">
            {STEPS.map((s,i)=>(
              <div key={s.n} className="flex gap-6 items-start bg-[#faf8f3] border border-slate-200 rounded-2xl p-6 hover:border-[#c8991a] transition-colors">
                <div className="w-14 h-14 bg-[#0f1f3d] text-[#c8991a] rounded-xl flex items-center justify-center text-xl font-black flex-shrink-0">{s.n}</div>
                <div>
                  <h3 className="font-bold text-[#0f1f3d] text-lg mb-1">{s.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 p-5 bg-[#0f1f3d] rounded-2xl text-white text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-[#f0b429]"/>
              <span className="font-bold text-[#f0b429]">After you submit:</span>
            </div>
            <p className="text-slate-300 text-sm">The highest-graded field agent nearest to the property is dispatched automatically. You can track your order in real time. Photos delivered via email and stored on your dashboard for 30 days.</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-[#faf8f3]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#c8991a] font-bold text-sm uppercase tracking-wider mb-2">Why Choose FieldFlow</p>
            <h2 className="text-3xl font-bold text-[#0f1f3d]">Built for Property Professionals</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon:<Shield className="w-6 h-6"/>, title:"Verified & Graded Agents", desc:"Every agent submits a 7-photo sample set before approval. Agents earn grades based on quality, speed, and reliability. Highest-graded agents get priority dispatch." },
              { icon:<Zap className="w-6 h-6"/>, title:"Auto-Dispatch in Seconds", desc:"The majority of orders are sent to field agents within seconds of being placed. The system finds the highest-graded available agent in your ZIP code automatically." },
              { icon:<Clock className="w-6 h-6"/>, title:"87% Done Within 24 Hours", desc:"Orders submitted before 10 AM local time are completed by next business day. Rush options available for 24-hour and 6-hour completion with flat fees." },
              { icon:<DollarSign className="w-6 h-6"/>, title:"Fixed Transparent Pricing", desc:"No dynamic pricing, no surprises. Every service has a fixed price. Rush adds a flat fee (+$15 or +$35). You see the full cost before paying." },
              { icon:<Camera className="w-6 h-6"/>, title:"30-Day Photo Storage", desc:"Photos delivered instantly by email and stored securely on your dashboard for 30 days. Download, email, or select specific photos anytime." },
              { icon:<Users className="w-6 h-6"/>, title:"Multi-User & Sub-Accounts", desc:"Create employee sub-accounts under your organization. Each employee can place orders tracked to your billing. Ideal for BPO companies with large teams." },
            ].map(f=>(
              <div key={f.title} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-[#c8991a] hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-[#0f1f3d] text-[#c8991a] rounded-xl flex items-center justify-center mb-4">{f.icon}</div>
                <h3 className="font-bold text-[#0f1f3d] mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-[#0f1f3d]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#c8991a] font-bold text-sm uppercase tracking-wider mb-2">What Our Clients Say</p>
            <h2 className="text-3xl font-bold text-white">Trusted by 500+ Property Professionals</h2>
            <p className="text-slate-400 mt-2">Some clients have been with us since 2008</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TESTIMONIALS.map(t=>(
              <div key={t.name} className="bg-[#1a3260] border border-[#1a3260] rounded-2xl p-5">
                <div className="flex mb-3">
                  {[1,2,3,4,5].map(i=><Star key={i} className="w-4 h-4 text-[#c8991a] fill-current"/>)}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <p className="text-white font-semibold text-sm">{t.name}</p>
                  <p className="text-slate-500 text-xs">{t.city}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agent CTA */}
      <section className="py-16 px-4 bg-[#faf8f3] border-y border-slate-200">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-[#c8991a] font-bold text-sm uppercase tracking-wider mb-2">Earn Money as a Field Agent</p>
            <h2 className="text-2xl font-bold text-[#0f1f3d] mb-2">Work your own schedule. Earn $40–$300+ per job.</h2>
            <p className="text-slate-500 text-sm">Paid every Friday via PayPal. No equipment needed — just your smartphone. 3-minute application.</p>
            <ul className="mt-4 space-y-1">
              {["No photography license required","Only local jobs in your area","Respond to orders within 3 hours","Weekly PayPal payout"].map(p=>(
                <li key={p} className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle className="w-4 h-4 text-[#c8991a]"/>{p}</li>
              ))}
            </ul>
          </div>
          <div className="flex-shrink-0 text-center">
            <Link href="/work"
              className="inline-flex items-center gap-2 bg-[#c8991a] hover:bg-[#f0b429] text-[#0f1f3d] font-bold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg">
              Apply Now — 3 Minutes
              <ChevronRight className="w-5 h-5"/>
            </Link>
            <p className="text-xs text-slate-400 mt-3">One-time $15 non-refundable application fee</p>
          </div>
        </div>
      </section>

      {/* Main CTA */}
      <section className="py-20 px-4 bg-[#c8991a]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-[#0f1f3d] mb-4">Ready to place your first order?</h2>
          <p className="text-[#0f1f3d]/70 mb-8 text-lg">Create a free account. Your first order can be dispatched within seconds.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => router.push("/register/client")}
              className="bg-[#0f1f3d] hover:bg-[#1a3260] text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors inline-flex items-center justify-center gap-2">
              Create Free Account <ChevronRight className="w-5 h-5"/>
            </button>
            <Link href="/contact"
              className="border-2 border-[#0f1f3d] text-[#0f1f3d] hover:bg-[#0f1f3d] hover:text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors inline-flex items-center justify-center">
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
