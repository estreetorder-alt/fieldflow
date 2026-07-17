import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import Link from "next/link";
import Image from "next/image";
import { Home as HomeIcon, FileText, Camera, Car, Shield, ClipboardList, CheckCircle, Clock, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BPO & REO Inspection Services",
  description: "Browse Snapect's field inspection services: exterior photo sets, interior condition reports, occupancy checks, vehicle inspections, and property documentation. Committed timeframes, fast turnaround.",
  keywords: [
    "BPO inspection services", "REO photo services", "exterior photo set pricing",
    "occupancy verification service", "vehicle condition inspection", "property condition report service",
    "interior BPO inspection", "field inspection pricing", "REO property services"
  ],
  alternates: { canonical: "/services" },
  openGraph: {
    title: "BPO & REO Inspection Services | Snapect",
    description: "Field inspection services: photo sets, condition reports, occupancy checks, vehicle inspections. Committed timeframes, fast dispatch.",
    url: "/services",
  },
};

const SERVICES = [
  {
    icon: HomeIcon,
    title: "Exterior Photography Set",
    desc: "Complete property exterior documentation including all sides, landscaping, and street view",
    bullets: ["High-resolution photo set", "All four sides", "Front, back, and street views", "Driveway and landscaping"],
    image: "https://images.unsplash.com/photo-1511452885600-a3d2c9148a31",
  },
  {
    icon: FileText,
    title: "Interior Condition Report",
    desc: "Room-by-room interior documentation with detailed condition assessment",
    bullets: ["Full interior photo coverage", "All rooms documented", "Condition notes", "Damage documentation"],
    image: "https://images.unsplash.com/photo-1493809842364-78817add7ffb",
  },
  {
    icon: Camera,
    title: "Occupancy Check",
    desc: "Verification of property occupancy status with photo evidence",
    bullets: ["Date-stamped photos", "Occupancy verification", "Utility meter readings", "Property condition notes"],
    image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92",
  },
  {
    icon: Car,
    title: "Vehicle Inspection",
    desc: "Comprehensive vehicle condition assessment with detailed photos",
    bullets: ["Full vehicle photo set", "VIN documentation", "Damage assessment", "Interior & exterior"],
    image: "https://images.unsplash.com/photo-1625047509248-ec889cbff17f",
  },
  {
    icon: Shield,
    title: "Complete Property Package",
    desc: "Full interior and exterior property inspection with comprehensive reporting",
    bullets: ["Comprehensive photo coverage", "Interior & exterior", "Detailed condition report", "Priority handling"],
    image: "https://images.unsplash.com/photo-1449844908441-8829872d2607",
  },
  {
    icon: ClipboardList,
    title: "Custom Field Services",
    desc: "Tailored inspection services designed around your specific requirements",
    bullets: ["Flexible scope", "Priority assignment", "Any service type", "Available nationwide"],
    image: "https://images.unsplash.com/photo-1560184897-ae75f418493e",
  },
];

const WHY = [
  { icon: Clock, title: "On-Time Delivery", desc: "Every inspection completed within our committed timeframe" },
  { icon: ShieldCheck, title: "Transparent Quotes", desc: "Clear, upfront quotes tailored to your specific job — no surprises" },
  { icon: Shield, title: "Quality Guaranteed", desc: "Professional agents with standardized quality protocols" },
  { icon: Sparkles, title: "High-Resolution", desc: "All photos delivered in high-resolution with proper documentation" },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-[#FAF6EF] pt-20">
      <PublicNav />

      <section className="py-16 px-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-5 leading-tight">
          <span className="text-[#2A2320]">Our </span>
          <span className="text-[#C2410C]">Services</span>
        </h1>
        <p className="text-lg text-[#6B5D52] max-w-2xl mx-auto">
          Professional field inspection services completed within your committed timeframe. Choose a service and request a custom quote tailored to your needs.
        </p>
      </section>

      <section className="px-4 pb-8">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((s) => (
            <div key={s.title} className="bg-white rounded-2xl overflow-hidden border border-[#E7DBCB] shadow-sm hover:shadow-lg transition-shadow flex flex-col">
              <div className="relative h-44">
                <Image src={s.image} alt={s.title} fill className="object-cover" />
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="w-10 h-10 rounded-lg bg-[#FCEEE3] flex items-center justify-center mb-3 -mt-10 relative z-10 border-4 border-white">
                  <s.icon className="w-5 h-5 text-[#C2410C]" />
                </div>
                <h3 className="font-bold text-lg text-[#2A2320] mb-1.5">{s.title}</h3>
                <p className="text-sm text-[#6B5D52] mb-4">{s.desc}</p>
                <ul className="space-y-2 mb-5">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm text-[#4A403A]">
                      <CheckCircle className="w-3.5 h-3.5 text-[#C2410C] flex-shrink-0" />{b}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex items-center justify-between pt-4 border-t border-[#F0E4D3]">
                  <span className="flex items-center gap-1.5 text-xs text-[#8A7A6C]">
                    <Clock className="w-3.5 h-3.5" /> Committed timeframe
                  </span>
                  <Link
                    href="/register/client"
                    className="text-sm font-bold text-[#C2410C] border border-[#C2410C] rounded-full px-4 py-1.5 hover:bg-[#C2410C] hover:text-white transition-colors"
                  >
                    Get a Quote
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-extrabold">
            <span className="text-[#2A2320]">Why Choose </span>
            <span className="text-[#C2410C]">Snapect?</span>
          </h2>
        </div>
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {WHY.map((w) => (
            <div key={w.title} className="bg-white border border-[#E7DBCB] rounded-2xl p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-[#FCEEE3] flex items-center justify-center mx-auto mb-4">
                <w.icon className="w-6 h-6 text-[#C2410C]" />
              </div>
              <h3 className="font-bold text-[#2A2320] mb-2">{w.title}</h3>
              <p className="text-sm text-[#6B5D52]">{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 pb-20">
        <div className="max-w-4xl mx-auto rounded-3xl p-12 text-center" style={{ background: "linear-gradient(135deg, #C2410C, #EA580C)" }}>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-white/90 text-lg mb-8 max-w-xl mx-auto">Request a custom quote for any inspection service today and get matched with a local field agent.</p>
          <Link
            href="/register/client"
            className="inline-flex items-center gap-2 bg-white text-[#C2410C] hover:bg-[#FAF6EF] font-bold px-8 py-4 rounded-full text-base transition-colors"
          >
            Get a Quote Today <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
