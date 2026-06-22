import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import Link from "next/link";
import {
  Camera, ClipboardList, Shield, Clock, CheckCircle,
  Star, Building2, Home, Wrench, FileSearch, ChevronRight,
} from "lucide-react";

const SERVICES = [
  {
    icon: <Home className="w-7 h-7 text-blue-600" />,
    title: "Property Inspection",
    price: "From $100",
    turnaround: "24–48 hrs",
    desc: "Full interior and exterior walkthrough with photographic documentation. Ideal for buyers, sellers, and property managers needing a baseline condition report.",
    includes: [
      "Exterior condition & curb appeal",
      "Interior room-by-room documentation",
      "Roof, foundation & structural notes",
      "Utility panel & HVAC overview",
      "Timestamped photos delivered to dashboard",
    ],
    color: "blue",
  },
  {
    icon: <FileSearch className="w-7 h-7 text-violet-600" />,
    title: "Property Survey",
    price: "From $150",
    turnaround: "48–72 hrs",
    desc: "Detailed survey and measurement documentation for pre-sale, refinancing, or insurance purposes. Our agents capture dimensions, lot boundaries, and condition notes.",
    includes: [
      "Exterior measurements & boundary notes",
      "Comparable property context",
      "Condition rating per room",
      "Utility connections documentation",
      "PDF report with photo attachments",
    ],
    color: "violet",
  },
  {
    icon: <Building2 className="w-7 h-7 text-emerald-600" />,
    title: "Full Assessment",
    price: "From $200",
    turnaround: "72–96 hrs",
    desc: "Comprehensive property assessment covering structural integrity, systems, and detailed condition scoring. Perfect for investors, lenders, or legal proceedings.",
    includes: [
      "Multi-point structural inspection",
      "Systems assessment (HVAC, plumbing, electrical)",
      "Deficiency log with severity ratings",
      "Estimated repair cost ranges",
      "Notarized report available on request",
    ],
    color: "emerald",
  },
  {
    icon: <Camera className="w-7 h-7 text-rose-600" />,
    title: "Photo Documentation",
    price: "From $75",
    turnaround: "Same day",
    desc: "Rapid photo capture for insurance claims, occupancy verification, or marketing listings. Agents dispatch within hours.",
    includes: [
      "Exterior & interior photo sets",
      "Timestamped GPS metadata",
      "High-resolution uploads to dashboard",
      "Occupancy status confirmation",
      "Rush same-day availability",
    ],
    color: "rose",
  },
  {
    icon: <Wrench className="w-7 h-7 text-amber-600" />,
    title: "Maintenance Inspection",
    price: "From $90",
    turnaround: "24–48 hrs",
    desc: "Routine check of property condition to proactively identify maintenance needs before they become costly repairs.",
    includes: [
      "Plumbing fixture check",
      "Door, window & lock condition",
      "HVAC filter & venting review",
      "Grounds & exterior maintenance items",
      "Prioritized action list",
    ],
    color: "amber",
  },
  {
    icon: <Shield className="w-7 h-7 text-sky-600" />,
    title: "Insurance Inspection",
    price: "From $125",
    turnaround: "24–48 hrs",
    desc: "Carrier-accepted inspection reports for policy renewals, new purchases, or claims support.",
    includes: [
      "Roof condition & estimated age",
      "Foundation & drainage review",
      "Electrical panel documentation",
      "Pool, fence & outbuilding check",
      "Carrier-formatted summary",
    ],
    color: "sky",
  },
];

const COLOR_MAP: Record<string, { bg: string; text: string; badge: string; border: string }> = {
  blue:    { bg: "bg-blue-50",    text: "text-blue-600",    badge: "bg-blue-100 text-blue-700",    border: "border-blue-100" },
  violet:  { bg: "bg-violet-50",  text: "text-violet-600",  badge: "bg-violet-100 text-violet-700",  border: "border-violet-100" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700", border: "border-emerald-100" },
  rose:    { bg: "bg-rose-50",    text: "text-rose-600",    badge: "bg-rose-100 text-rose-700",    border: "border-rose-100" },
  amber:   { bg: "bg-amber-50",   text: "text-amber-600",   badge: "bg-amber-100 text-amber-700",   border: "border-amber-100" },
  sky:     { bg: "bg-sky-50",     text: "text-sky-600",     badge: "bg-sky-100 text-sky-700",     border: "border-sky-100" },
};

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNav />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Star className="w-3.5 h-3.5" />
            Nationwide field agents · 48-hr turnaround
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-5 leading-tight">
            Our Services
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            From quick photo documentation to comprehensive property assessments — every service delivered by verified, local field agents.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {SERVICES.map((svc) => {
              const c = COLOR_MAP[svc.color];
              return (
                <div
                  key={svc.title}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
                >
                  <div className="p-6 flex-1">
                    <div className={`w-14 h-14 ${c.bg} rounded-xl flex items-center justify-center mb-4`}>
                      {svc.icon}
                    </div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-slate-900 text-lg">{svc.title}</h3>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${c.badge}`}>
                        {svc.price}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
                      <Clock className="w-3.5 h-3.5" />
                      {svc.turnaround} turnaround
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed mb-4">{svc.desc}</p>
                    <ul className="space-y-2">
                      {svc.includes.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-xs text-slate-600">
                          <CheckCircle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${c.text}`} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={`px-6 py-4 ${c.bg} border-t ${c.border}`}>
                    <Link
                      href="/login"
                      className={`text-sm font-semibold ${c.text} flex items-center gap-1 hover:gap-2 transition-all`}
                    >
                      Order this service
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Urgency Pricing Note */}
      <section className="py-16 px-4 bg-slate-50 border-y border-slate-200">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Transparent Pricing</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            All prices shown are base rates. Urgent orders (needed within 24 hours) carry a small multiplier — shown clearly at checkout before you confirm.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 text-left">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="text-sm font-semibold text-slate-700 mb-1">Standard Delivery</div>
              <div className="text-2xl font-bold text-slate-900 mb-1">Base price</div>
              <div className="text-xs text-slate-500">24–96 hour turnaround depending on service type</div>
            </div>
            <div className="bg-white border border-red-100 rounded-xl p-5">
              <div className="text-sm font-semibold text-red-700 mb-1">Urgent Delivery</div>
              <div className="text-2xl font-bold text-slate-900 mb-1">Base × 1.3–1.5×</div>
              <div className="text-xs text-slate-500">Same-day or next-day rush. Price shown before you pay.</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-blue-700 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to book an inspection?</h2>
          <p className="text-blue-200 mb-8 text-lg">
            Create a free account and get an instant price quote in under 2 minutes.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold px-8 py-4 rounded-xl text-lg transition-colors"
          >
            Get Started
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
