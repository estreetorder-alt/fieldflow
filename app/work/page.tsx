"use client";
import Link from "next/link";
import Image from "next/image";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import { ArrowRight, Smartphone, MapPin, Camera, DollarSign, Clock, TrendingUp } from "lucide-react";

const EARNING_TIERS = [
  { label: "Part-Time", amount: "Flexible", suffix: "income", note: "20-30 jobs / month" },
  { label: "Regular", amount: "Steady", suffix: "income", note: "50-70 jobs / month" },
  { label: "Full-Time", amount: "Maximum", suffix: "income", note: "100+ jobs / month" },
];

const STEPS = [
  { icon: Smartphone, title: "Download the App", desc: "Get started with our mobile app for iOS and Android" },
  { icon: MapPin, title: "Set Your Area", desc: "Choose your coverage zones and availability" },
  { icon: Camera, title: "Accept Jobs", desc: "Browse and accept inspection jobs near you" },
  { icon: DollarSign, title: "Get Paid", desc: "Complete inspections and receive fast, reliable payouts" },
];

const BENEFITS = [
  { icon: Clock, title: "Flexible Schedule", desc: "Work when you want, as much as you want" },
  { icon: DollarSign, title: "Competitive Pay", desc: "Rewarding compensation for every inspection completed" },
  { icon: TrendingUp, title: "Growth Opportunities", desc: "Increase your earnings with performance bonuses" },
  { icon: MapPin, title: "Local Work", desc: "Jobs near you, minimizing travel time" },
];

export default function WorkPage() {
  return (
    <div className="min-h-screen bg-[#FAF6EF] pt-20">
      <PublicNav />

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block bg-[#FCEEE3] text-[#C2410C] text-sm font-semibold px-4 py-1.5 rounded-full mb-5">
              Join 2,000+ Active Agents
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-5 leading-tight">
              <span className="text-[#2A2320]">Earn on Your </span>
              <span className="text-[#C2410C]">Own Terms</span>
            </h1>
            <p className="text-lg text-[#6B5D52] mb-8 max-w-md">
              Become a Snapect field agent and turn your smartphone into a money-making tool. Flexible hours, competitive pay, and consistent work in your local area.
            </p>
            <Link
              href="/register/agent"
              className="inline-flex items-center gap-2 bg-[#C2410C] hover:bg-[#EA580C] text-white font-bold px-7 py-3.5 rounded-full transition-colors"
            >
              Apply Now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="relative h-[400px] rounded-2xl overflow-hidden">
            <Image
              src="https://images.unsplash.com/photo-1704375611931-8438a4e4945d"
              alt="Field agent photographing with smartphone"
              fill
              priority
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-[#F3EBDD]">
        <div className="max-w-5xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-extrabold mb-3">
            <span className="text-[#2A2320]">Earning </span>
            <span className="text-[#C2410C]">Potential</span>
          </h2>
          <p className="text-[#6B5D52]">Your income scales with your effort</p>
        </div>
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-6">
          {EARNING_TIERS.map((t) => (
            <div key={t.label} className="bg-white rounded-2xl p-8 text-center border border-[#E7DBCB]">
              <p className="text-xs font-semibold text-[#8A7A6C] uppercase tracking-wide mb-2">{t.label}</p>
              <p className="text-2xl font-extrabold mb-1">
                <span className="text-[#C2410C]">{t.amount}</span>{" "}
                <span className="text-[#2A2320]">{t.suffix}</span>
              </p>
              <p className="text-sm text-[#8A7A6C]">{t.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-extrabold">
            <span className="text-[#2A2320]">Get Started in </span>
            <span className="text-[#C2410C]">4 Steps</span>
          </h2>
        </div>
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s) => (
            <div key={s.title} className="bg-white border border-[#E7DBCB] rounded-2xl p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-[#FCEEE3] flex items-center justify-center mx-auto mb-4">
                <s.icon className="w-6 h-6 text-[#C2410C]" />
              </div>
              <h3 className="font-bold text-[#2A2320] mb-2">{s.title}</h3>
              <p className="text-sm text-[#6B5D52]">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 px-4 bg-[#F3EBDD]">
        <div className="max-w-5xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-extrabold">
            <span className="text-[#2A2320]">Agent </span>
            <span className="text-[#C2410C]">Benefits</span>
          </h2>
        </div>
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {BENEFITS.map((b) => (
            <div key={b.title} className="bg-white border border-[#E7DBCB] rounded-2xl p-6">
              <b.icon className="w-6 h-6 text-[#C2410C] mb-4" />
              <h3 className="font-bold text-[#2A2320] mb-1.5">{b.title}</h3>
              <p className="text-sm text-[#6B5D52]">{b.desc}</p>
            </div>
          ))}
        </div>

        <div className="max-w-2xl mx-auto bg-white border border-[#E7DBCB] rounded-3xl p-12 text-center shadow-sm">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
            <span className="text-[#2A2320]">Start Earning </span>
            <span className="text-[#C2410C]">Today</span>
          </h2>
          <p className="text-[#6B5D52] mb-8">
            Join our growing network of professional field agents and start earning on your schedule.
          </p>
          <Link
            href="/register/agent"
            className="inline-flex items-center gap-2 bg-[#C2410C] hover:bg-[#EA580C] text-white font-bold px-7 py-3.5 rounded-full transition-colors"
          >
            Apply to Become an Agent <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
