"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera, ChevronRight, MapPin, Star, CheckCircle, DollarSign,
  Clock, Shield, Zap, Users, Car, Building2, Home, ClipboardList, Play,
} from "lucide-react";
import PublicNav from "./components/PublicNav";
import PublicFooter from "./components/PublicFooter";

const TESTIMONIALS = [
  { name:"Arthur M.", city:"Jacksonville, FL", text:"We placed an order at 12:20 PM and received the photographs at 1:25 PM — that's 65 minutes! It saved me an 8-hour round trip drive." },
  { name:"Will T.", city:"Marietta, GA", text:"Significantly cheaper than competitors, covers more areas, and so much faster. This is the only platform I use now." },
  { name:"Kelly R.", city:"California", text:"I went from putting 200+ miles on my car each week doing BPOs to next to nothing. Cannot thank this company enough." },
  { name:"Bruce K.", city:"Keller Williams", text:"I am now in the BPO business full time with 3 employees. I could not have reached this level without Snapect." },
];

const SERVICES = [
  { icon:<Home className="w-5 h-5"/>, name:"BPO / REO Photo Sets", desc:"3–8 photo exterior sets", from:"$40" },
  { icon:<Car className="w-5 h-5"/>, name:"Vehicle Inspections", desc:"Car, motorcycle, RV, boat", from:"$45" },
  { icon:<Building2 className="w-5 h-5"/>, name:"Property Inspections", desc:"Pre-sale, REO, insurance, disaster", from:"$80" },
  { icon:<MapPin className="w-5 h-5"/>, name:"Occupancy Checks", desc:"Occupied / vacant verification", from:"$80" },
  { icon:<Camera className="w-5 h-5"/>, name:"Videography", desc:"Full walkthrough + aerial drone", from:"$150" },
  { icon:<ClipboardList className="w-5 h-5"/>, name:"Commercial & Rental", desc:"Move-in/out, office, retail", from:"$110" },
];

const STEPS = [
  { n:"01", title:"Enter the Address", desc:"Type the property or vehicle address. Validated instantly via Mapbox. Coverage checked automatically." },
  { n:"02", title:"Choose Your Service", desc:"45+ predefined services with fixed prices and shot lists. Or customize your own order." },
  { n:"03", title:"Select Turnaround", desc:"Next business day, 24-hour rush (+$15), or 6-hour rush (+$35). Orders before 10 AM dispatched same day." },
  { n:"04", title:"Add Date Stamp", desc:"Optional complimentary date stamp burned into every photo — ideal for BPO, legal, and insurance use." },
  { n:"05", title:"Pay & Submit", desc:"Pay securely via Whop. Order dispatched to your nearest highest-graded agent within seconds." },
];

const TRUSTED_BY = ["Johnson Realty LLC", "Midwest Property Group", "First National Bank", "CoreLogic Partners", "Asset Management Co.", "Premier REO Services"];

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      <PublicNav />

      {/* ── HERO — full-bleed background image like PrimeInspect ── */}
      <section className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden">
        {/* Background image overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600&q=80')`,
          }}
          aria-hidden="true"
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f1f3d]/95 via-[#0f1f3d]/80 to-[#0f1f3d]/40" aria-hidden="true"/>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-24">
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#c8991a]/20 border border-[#c8991a]/50 text-[#f0b429] text-sm font-semibold px-4 py-1.5 rounded-full mb-8">
              <Star className="w-3.5 h-3.5 fill-current" aria-hidden="true"/>
              <span>America&apos;s Trusted Field Inspection Platform</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6 tracking-tight">
              BPO &amp; REO<br />
              <span className="text-[#f0b429]">Photo Sets</span><br />
              <span className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-200">Delivered in Hours</span>
            </h1>

            <p className="text-xl text-slate-300 mb-4 leading-relaxed">
              45+ services · Verified local agents · 35 states · 87% of orders done within 24 hours
            </p>
            <p className="text-slate-400 text-sm mb-10">
              Vehicle inspections · Property assessments · Occupancy checks · Videography
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => router.push("/register/client")}
                className="bg-[#c8991a] hover:bg-[#f0b429] text-[#0f1f3d] font-bold px-8 py-4 rounded-xl text-lg transition-all shadow-lg hover:shadow-[#c8991a]/30 hover:shadow-xl flex items-center justify-center gap-2">
                Order an Inspection
                <ChevronRight className="w-5 h-5" aria-hidden="true"/>
              </button>
              <Link
                href="/services"
                className="border-2 border-white/30 hover:border-[#c8991a] text-white hover:text-[#f0b429] font-semibold px-8 py-4 rounded-xl text-lg transition-all flex items-center justify-center gap-2 backdrop-blur-sm">
                <Play className="w-5 h-5" aria-hidden="true"/>
                View All Services
              </Link>
            </div>
          </div>
        </div>

        {/* Floating stats cards */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
            {[
              { val:"2,400+", label:"Orders Completed" },
              { val:"87%",    label:"Done in 24hrs" },
              { val:"45+",    label:"Service Types" },
              { val:"35",     label:"States" },
            ].map(s=>(
              <div key={s.label} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 text-center">
                <div className="text-2xl font-extrabold text-[#f0b429]">{s.val}</div>
                <div className="text-xs text-slate-300 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUSTED BY bar ── */}
      <section className="bg-[#1a1a2e] py-5 px-4 border-y border-[#16213e]" aria-label="Trusted by companies">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-slate-500 text-xs uppercase tracking-widest mb-4 font-semibold">Trusted by property managers &amp; REO companies nationwide</p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {TRUSTED_BY.map(name=>(
              <span key={name} className="text-slate-400 font-bold text-sm tracking-wide opacity-60 hover:opacity-100 transition-opacity">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section className="py-20 px-4 bg-[#faf8f3]" id="services" aria-labelledby="services-heading">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#c8991a] font-bold text-sm uppercase tracking-widest mb-2">45+ Services Available</p>
            <h2 id="services-heading" className="text-3xl sm:text-4xl font-extrabold text-[#0f1f3d] mb-4">Fixed Pricing. No Surprises.</h2>
            <p className="text-slate-500 max-w-xl mx-auto text-lg">Every service has a flat price shown before you pay. Rush orders add a flat fee — not a percentage.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map(s=>(
              <div key={s.name} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-[#c8991a] hover:shadow-lg transition-all group cursor-default">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0f1f3d] text-[#c8991a] rounded-xl flex items-center justify-center group-hover:bg-[#c8991a] group-hover:text-[#0f1f3d] transition-colors flex-shrink-0" aria-hidden="true">{s.icon}</div>
                    <h3 className="font-bold text-[#0f1f3d] leading-tight">{s.name}</h3>
                  </div>
                  <span className="text-[#c8991a] font-bold text-sm whitespace-nowrap">From {s.from}</span>
                </div>
                <p className="text-sm text-slate-500 ml-13">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/services"
              className="inline-flex items-center gap-2 bg-[#0f1f3d] hover:bg-[#1a3260] text-white font-bold px-8 py-4 rounded-xl transition-colors shadow-md">
              See All 45+ Services &amp; Pricing <ChevronRight className="w-4 h-4" aria-hidden="true"/>
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 px-4 bg-white" id="how-it-works" aria-labelledby="how-heading">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#c8991a] font-bold text-sm uppercase tracking-widest mb-2">Simple Process</p>
            <h2 id="how-heading" className="text-3xl sm:text-4xl font-extrabold text-[#0f1f3d] mb-3">How It Works</h2>
            <p className="text-slate-500 text-lg">From order to delivered photos in as little as 6 hours</p>
          </div>
          <div className="space-y-4">
            {STEPS.map((s,i)=>(
              <div key={s.n} className="flex gap-5 items-start bg-[#faf8f3] border border-slate-200 rounded-2xl p-6 hover:border-[#c8991a] hover:shadow-md transition-all">
                <div className="w-14 h-14 bg-[#0f1f3d] text-[#c8991a] rounded-xl flex items-center justify-center text-xl font-black flex-shrink-0 shadow-md" aria-hidden="true">{s.n}</div>
                <div className="pt-1">
                  <h3 className="font-bold text-[#0f1f3d] text-lg mb-1">{s.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 p-5 bg-[#0f1f3d] rounded-2xl text-center" role="note">
            <p className="text-[#f0b429] font-bold mb-1 flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" aria-hidden="true"/>After you submit:
            </p>
            <p className="text-slate-300 text-sm">The highest-graded field agent nearest to the property is dispatched automatically. Real-time status updates. Photos delivered by email and stored for 30 days.</p>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-20 px-4 bg-[#faf8f3]" aria-labelledby="features-heading">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#c8991a] font-bold text-sm uppercase tracking-widest mb-2">Why Choose Snapect</p>
            <h2 id="features-heading" className="text-3xl sm:text-4xl font-extrabold text-[#0f1f3d]">Built for Property Professionals</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon:<Shield className="w-6 h-6"/>, title:"Verified & Graded Agents", desc:"Every agent submits a 7-photo sample set before approval. Grades are based on quality, speed, and reliability. Highest-graded agents get priority dispatch." },
              { icon:<Zap className="w-6 h-6"/>, title:"Auto-Dispatch in Seconds", desc:"Orders are dispatched to the highest-graded available agent in your ZIP within seconds. No manual assignment, no delays." },
              { icon:<Clock className="w-6 h-6"/>, title:"87% Done Within 24 Hours", desc:"Orders before 10 AM local time are completed by next business day. Rush options: 24-hour (+$15) and 6-hour (+$35) with flat fees." },
              { icon:<DollarSign className="w-6 h-6"/>, title:"Fixed Transparent Pricing", desc:"No dynamic pricing, no surprises. Every service has a fixed price. You see the full cost before paying via Whop." },
              { icon:<Camera className="w-6 h-6"/>, title:"30-Day Photo Storage", desc:"Photos delivered by email instantly and stored securely for 30 days. Download, select, or email photos from your dashboard." },
              { icon:<Users className="w-6 h-6"/>, title:"Multi-User Accounts", desc:"Create employee sub-accounts. Each employee can place orders tracked to your billing. Ideal for BPO companies with large teams." },
            ].map(f=>(
              <div key={f.title} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-[#c8991a] hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-[#0f1f3d] text-[#c8991a] rounded-xl flex items-center justify-center mb-4" aria-hidden="true">{f.icon}</div>
                <h3 className="font-bold text-[#0f1f3d] mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HERO 2 — Full bleed property image ── */}
      <section className="relative py-32 px-4 overflow-hidden" aria-labelledby="cta2-heading">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1600&q=80')` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[#0f1f3d]/85" aria-hidden="true"/>
        <div className="relative z-10 max-w-3xl mx-auto text-center text-white">
          <p className="text-[#c8991a] font-bold text-sm uppercase tracking-widest mb-3">Coverage Nationwide</p>
          <h2 id="cta2-heading" className="text-3xl sm:text-4xl font-extrabold mb-5">35 States · 8,500+ Cities · 150+ Verified Agents</h2>
          <p className="text-slate-300 text-lg mb-8">Check if we have agents in your area before placing an order. Most ZIPs covered same-day.</p>
          <Link href="/coverage"
            className="inline-flex items-center gap-2 bg-[#c8991a] hover:bg-[#f0b429] text-[#0f1f3d] font-bold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg">
            Check Coverage Area <ChevronRight className="w-5 h-5" aria-hidden="true"/>
          </Link>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 px-4 bg-[#0f1f3d]" aria-labelledby="testimonials-heading">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#c8991a] font-bold text-sm uppercase tracking-widest mb-2">Client Stories</p>
            <h2 id="testimonials-heading" className="text-3xl sm:text-4xl font-extrabold text-white">Trusted Since 2008</h2>
            <p className="text-slate-400 mt-2">Real clients. Real results.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TESTIMONIALS.map(t=>(
              <figure key={t.name} className="bg-[#1a1a2e] border border-[#16213e] rounded-2xl p-5">
                <div className="flex mb-3" aria-label="5 stars">
                  {[1,2,3,4,5].map(i=><Star key={i} className="w-4 h-4 text-[#c8991a] fill-current" aria-hidden="true"/>)}
                </div>
                <blockquote><p className="text-slate-300 text-sm leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p></blockquote>
                <figcaption>
                  <p className="text-white font-semibold text-sm">{t.name}</p>
                  <p className="text-slate-500 text-xs">{t.city}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── AGENT CTA ── */}
      <section className="py-16 px-4 bg-[#faf8f3] border-y border-slate-200" aria-labelledby="agent-cta-heading">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-[#c8991a] font-bold text-sm uppercase tracking-widest mb-2">Field Agent Opportunities</p>
            <h2 id="agent-cta-heading" className="text-2xl font-extrabold text-[#0f1f3d] mb-2">Earn $40–$300+ Per Job. Work Your Schedule.</h2>
            <p className="text-slate-500 text-sm max-w-lg">Paid every Friday via PayPal. Only local jobs. No equipment needed — just your smartphone. 3-minute application.</p>
            <ul className="mt-4 space-y-1.5">
              {["No photography license required","Set your own ZIP code coverage","Respond to orders 9 AM–6 PM local time","Weekly PayPal payout — we cover the fees"].map(p=>(
                <li key={p} className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="w-4 h-4 text-[#c8991a] flex-shrink-0" aria-hidden="true"/>{p}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-shrink-0 text-center">
            <Link href="/work"
              className="inline-flex items-center gap-2 bg-[#c8991a] hover:bg-[#f0b429] text-[#0f1f3d] font-bold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg whitespace-nowrap">
              Join Our Team <ChevronRight className="w-5 h-5" aria-hidden="true"/>
            </Link>
            <p className="text-xs text-slate-400 mt-3">Free to join — no application fee</p>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative py-24 px-4 overflow-hidden" aria-labelledby="final-cta-heading">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&q=80')` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[#c8991a]/90" aria-hidden="true"/>
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <h2 id="final-cta-heading" className="text-3xl sm:text-4xl font-extrabold text-[#0f1f3d] mb-4">Ready to Place Your First Order?</h2>
          <p className="text-[#0f1f3d]/80 mb-8 text-lg">Create a free account. First order dispatched within seconds of submission.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => router.push("/register/client")}
              className="bg-[#0f1f3d] hover:bg-[#1a1a2e] text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg inline-flex items-center justify-center gap-2">
              New Client Signup <ChevronRight className="w-5 h-5" aria-hidden="true"/>
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
