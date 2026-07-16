"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Camera, ArrowRight, MapPin, Star, CheckCircle, DollarSign,
  Clock, Shield, Zap, Users, Car, Building2, Home as HomeIcon, ClipboardList, CheckCircle2,
} from "lucide-react";
import PublicNav from "./components/PublicNav";
import PublicFooter from "./components/PublicFooter";
import HeroVisual from "./components/HeroVisual";
import { Button } from "./components/ui/button";

const STATS = [
  { value: "2,400+", label: "Orders Completed" },
  { value: "87%", label: "Done in 24hrs" },
  { value: "45+", label: "Service Types" },
  { value: "35", label: "States Covered" },
];

const SERVICES = [
  { icon: HomeIcon, name: "BPO / REO Photo Sets", desc: "3–8 photo exterior sets" },
  { icon: Car, name: "Vehicle Inspections", desc: "Car, motorcycle, RV, boat" },
  { icon: Building2, name: "Property Inspections", desc: "Pre-sale, REO, insurance, disaster" },
  { icon: MapPin, name: "Occupancy Checks", desc: "Occupied / vacant verification" },
  { icon: Camera, name: "Videography", desc: "Full walkthrough + aerial drone" },
  { icon: ClipboardList, name: "Commercial & Rental", desc: "Move-in/out, office, retail" },
];

const STEPS = [
  { n: "01", title: "Enter the Address", desc: "Type the property or vehicle address. Validated instantly via Mapbox. Coverage checked automatically." },
  { n: "02", title: "Choose Your Service", desc: "45+ predefined services with clear shot lists. Or customize your own order." },
  { n: "03", title: "Review Offers", desc: "Field agents send offers on your order within minutes. Accept the offer you like — it is paid straight from your wallet." },
  { n: "04", title: "Add Date Stamp", desc: "Optional complimentary date stamp burned into every photo — ideal for BPO, legal, and insurance use." },
  { n: "05", title: "Pay & Submit", desc: "Pay securely. Order dispatched to your nearest highest-graded agent within seconds." },
];

const FEATURES = [
  { icon: Shield, title: "Verified & Graded Agents", desc: "Every agent submits a 7-photo sample set before approval. Grades are based on quality, speed, and reliability. Highest-graded agents get priority dispatch." },
  { icon: Zap, title: "Auto-Dispatch in Seconds", desc: "Orders are dispatched to the highest-graded available agent in your ZIP within seconds. No manual assignment, no delays." },
  { icon: Clock, title: "87% Done Within 24 Hours", desc: "Orders before 10 AM local time are completed by next business day. Rush options are available when you need them." },
  { icon: DollarSign, title: "You Pick the Offer", desc: "Agents send offers on every order. You review them and accept the one that works — funds come straight from your wallet, no checkout forms." },
  { icon: Camera, title: "30-Day Photo Storage", desc: "Photos delivered by email instantly and stored securely for 30 days. Download, select, or email photos from your dashboard." },
  { icon: Users, title: "Multi-User Accounts", desc: "Create employee sub-accounts. Each employee can place orders tracked to your billing. Ideal for BPO companies with large teams." },
];

const TESTIMONIALS = [
  { name: "Arthur M.", city: "Jacksonville, FL", text: "We placed an order at 12:20 PM and received the photographs at 1:25 PM — that's 65 minutes! It saved me an 8-hour round trip drive." },
  { name: "Will T.", city: "Marietta, GA", text: "Significantly cheaper than competitors, covers more areas, and so much faster. This is the only platform I use now." },
  { name: "Kelly R.", city: "California", text: "I went from putting 200+ miles on my car each week doing BPOs to next to nothing. Cannot thank this company enough." },
  { name: "Bruce K.", city: "Keller Williams", text: "I am now in the BPO business full time with 3 employees. I could not have reached this level without Snapect." },
];

const TRUSTED_BY = ["Johnson Realty LLC", "Midwest Property Group", "First National Bank", "CoreLogic Partners", "Asset Management Co.", "Premier REO Services"];

const MARQUEE_ITEMS = ["Exterior Photo Sets", "Interior Condition Reports", "Occupancy Checks", "Vehicle Inspections", "BPO Support", "REO Field Services", "Nationwide Network"];

const AGENT_PERKS = ["No photography license required", "Set your own ZIP code coverage", "Respond to orders 9 AM–6 PM local time", "Weekly PayPal payout — we cover the fees"];

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen warm-gradient-bg">
      <PublicNav />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute top-24 -left-24 w-96 h-96 rounded-full bg-[#EA580C]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-[#F59E0B]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 container mx-auto px-6 py-16">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C2410C]/10 border border-[#C2410C]/20 text-[#C2410C] text-sm font-medium mb-6"
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                America&apos;s Trusted Field Inspection Platform
              </motion.div>

              <h1 className="text-5xl lg:text-7xl font-bold mb-6 leading-tight">
                <span className="text-[#2A2320]">BPO &amp; REO</span>
                <br />
                <span className="text-gradient">Photo Sets</span>
                <br />
                <span className="text-[#2A2320]">Delivered in Hours</span>
              </h1>

              <p className="text-xl text-[#4A403A] mb-8 leading-relaxed max-w-2xl">
                45+ services · Verified local agents · 35 states · 87% of orders done within 24 hours. Vehicle inspections, property assessments, occupancy checks, and videography.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Button size="lg" className="group" onClick={() => router.push("/register/client")}>
                  Order an Inspection
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
                </Button>
                <Link href="/services">
                  <Button size="lg" variant="outline">View All Services</Button>
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {STATS.map((stat, index) => (
                  <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}>
                    <div className="text-3xl font-bold text-gradient">{stat.value}</div>
                    <div className="text-sm text-[#8A7A6C] mt-1">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.3 }} className="relative">
              <div className="relative h-[560px] rounded-2xl overflow-hidden soft-card animate-pulse-glow bg-gradient-to-br from-[#C2410C] via-[#EA580C] to-[#B45309]">
                <HeroVisual />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="absolute -bottom-6 -left-6 soft-card p-6 rounded-xl max-w-xs animate-float"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#C2410C]/10 flex items-center justify-center">
                    <CheckCircle2 className="text-[#C2410C]" />
                  </div>
                  <div>
                    <div className="text-[#2A2320] font-semibold">Dispatched in Seconds</div>
                    <div className="text-[#8A7A6C] text-sm">Highest-graded agent, automatically</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Editorial Marquee ── */}
      <section className="py-8 bg-[#2A2320] overflow-hidden">
        <div className="flex whitespace-nowrap animate-marquee">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="mx-8 text-2xl font-bold text-[#F3EBDD]/80 uppercase tracking-wider flex items-center gap-8">
              {item}
              <span className="text-[#EA580C]">✦</span>
            </span>
          ))}
        </div>
      </section>

      {/* ── TRUSTED BY ── */}
      <section className="py-10 px-4 bg-[#FAF6EF] border-b border-[#E7DBCB]">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-[#8A7A6C] text-xs uppercase tracking-widest mb-5 font-semibold">Trusted by property managers &amp; REO companies nationwide</p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {TRUSTED_BY.map((name) => (
              <span key={name} className="text-[#6B5D52] font-bold text-sm tracking-wide opacity-60 hover:opacity-100 transition-opacity">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section className="py-32 relative">
        <div className="relative container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-16">
            <span className="text-[#C2410C] font-semibold tracking-widest uppercase text-sm">45+ Services Available</span>
            <h2 className="text-4xl lg:text-6xl font-bold mb-6 mt-3">
              <span className="text-[#2A2320]">One Simple </span>
              <span className="text-gradient">Flow</span>
            </h2>
            <p className="text-xl text-[#6B5D52] max-w-2xl mx-auto">
              Pick a service, enter the address, and place your order. Verified field agents send offers within minutes — you choose the one that works.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((service, index) => (
              <motion.div
                key={service.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.08 }}
                whileHover={{ scale: 1.02, y: -6 }}
                className="soft-card rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#C2410C]/10 flex items-center justify-center mb-4 group-hover:bg-[#C2410C] transition-colors">
                  <service.icon className="w-6 h-6 text-[#C2410C] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-[#2A2320] mb-1 group-hover:text-[#C2410C] transition-colors">{service.name}</h3>
                <p className="text-[#6B5D52] text-sm">{service.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3 }} className="text-center mt-12">
            <Link href="/services">
              <Button size="lg">
                See All 45+ Services &amp; Pricing
                <ArrowRight size={18} />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-32 bg-[#F3EBDD]">
        <div className="container mx-auto px-6 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-16">
            <span className="text-[#C2410C] font-semibold tracking-widest uppercase text-sm">Simple Process</span>
            <h2 className="text-4xl lg:text-6xl font-bold mb-4 mt-3">
              <span className="text-[#2A2320]">How </span>
              <span className="text-gradient">It Works</span>
            </h2>
            <p className="text-xl text-[#6B5D52]">From order to delivered photos in as little as 6 hours</p>
          </motion.div>

          <div className="space-y-4">
            {STEPS.map((step, index) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.08 }}
                className="flex gap-5 items-start soft-card rounded-2xl p-6 hover:shadow-xl transition-all"
              >
                <div className="text-4xl font-bold text-[#C2410C]/25 flex-shrink-0 w-16">{step.n}</div>
                <div>
                  <h3 className="font-bold text-[#2A2320] text-lg mb-1">{step.title}</h3>
                  <p className="text-[#6B5D52] text-sm leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mt-8 soft-card rounded-2xl p-6 text-center">
            <p className="text-[#C2410C] font-bold mb-1 flex items-center justify-center gap-2">
              <Zap size={16} /> After you submit:
            </p>
            <p className="text-[#6B5D52] text-sm">The highest-graded field agent nearest to the property is dispatched automatically. Real-time status updates. Photos delivered by email and stored for 30 days.</p>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-32">
        <div className="container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-16">
            <span className="text-[#C2410C] font-semibold tracking-widest uppercase text-sm">Why Choose Snapect</span>
            <h2 className="text-4xl lg:text-6xl font-bold mb-4 mt-3">
              <span className="text-[#2A2320]">Built for Property </span>
              <span className="text-gradient">Professionals</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, index) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.06 }}
                whileHover={{ y: -6 }}
                className="soft-card rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl"
              >
                <div className="w-12 h-12 rounded-xl bg-[#C2410C]/10 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-[#C2410C]" />
                </div>
                <h3 className="font-bold text-[#2A2320] mb-2">{f.title}</h3>
                <p className="text-[#6B5D52] text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COVERAGE CTA ── */}
      <section className="py-24 px-6 relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative container mx-auto max-w-3xl text-center soft-card rounded-3xl p-12 md:p-16"
        >
          <span className="text-[#C2410C] font-semibold tracking-widest uppercase text-sm">Coverage Nationwide</span>
          <h2 className="text-3xl lg:text-5xl font-bold mb-5 mt-3 text-[#2A2320]">35 States · 8,500+ Cities · 150+ Verified Agents</h2>
          <p className="text-[#6B5D52] text-lg mb-8">Check if we have agents in your area before placing an order. Most ZIPs covered same-day.</p>
          <Link href="/coverage">
            <Button size="lg">
              Check Coverage Area
              <ArrowRight size={18} />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-32">
        <div className="container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-16">
            <span className="text-[#C2410C] font-semibold tracking-widest uppercase text-sm">Vendor Stories</span>
            <h2 className="text-4xl lg:text-6xl font-bold mb-4 mt-3">
              <span className="text-[#2A2320]">Trusted </span>
              <span className="text-gradient">Since 2008</span>
            </h2>
            <p className="text-xl text-[#6B5D52]">Real clients. Real results.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TESTIMONIALS.map((t, index) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.08 }}
                whileHover={{ y: -6 }}
                className="soft-card rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl"
              >
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((i) => (<Star key={i} className="w-4 h-4 fill-[#EA580C] text-[#EA580C]" />))}
                </div>
                <p className="text-[#4A403A] text-sm leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                <div>
                  <p className="text-[#2A2320] font-semibold text-sm">{t.name}</p>
                  <p className="text-[#8A7A6C] text-xs">{t.city}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AGENT CTA ── */}
      <section className="py-20 px-6 bg-[#F3EBDD] border-y border-[#E7DBCB]">
        <div className="container mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-10">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <span className="text-[#C2410C] font-semibold tracking-widest uppercase text-sm">Field Agent Opportunities</span>
            <h2 className="text-2xl lg:text-3xl font-bold text-[#2A2320] mb-2 mt-3">Earn As Much As You Can. Work Your Schedule.</h2>
            <p className="text-[#6B5D52] text-sm max-w-lg mb-4">Paid every Friday via PayPal. Only local jobs. No equipment needed — just your smartphone. 3-minute application.</p>
            <ul className="space-y-1.5">
              {AGENT_PERKS.map((p) => (
                <li key={p} className="flex items-center gap-2 text-sm text-[#4A403A]">
                  <CheckCircle className="w-4 h-4 text-[#C2410C] flex-shrink-0" />{p}
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="flex-shrink-0 text-center">
            <Link href="/work">
              <Button size="lg">
                Join Our Team
                <ArrowRight size={18} />
              </Button>
            </Link>
            <p className="text-xs text-[#8A7A6C] mt-3">Free to join — no application fee</p>
          </motion.div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="relative container mx-auto px-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl p-12 md:p-20 text-center max-w-4xl mx-auto"
            style={{ background: "linear-gradient(135deg, #C2410C, #EA580C)" }}
          >
            <h2 className="text-4xl lg:text-6xl font-bold mb-6 text-white">Ready to Place Your First Order?</h2>
            <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">Create a free account. First order dispatched within seconds of submission.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" className="min-w-[200px] bg-white text-[#C2410C] hover:bg-[#FAF6EF]" onClick={() => router.push("/register/client")}>
                New Vendor Signup
              </Button>
              <Link href="/contact">
                <Button size="lg" className="min-w-[200px] bg-[#2A2320] text-white hover:bg-[#1C1917]">Contact Us</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
