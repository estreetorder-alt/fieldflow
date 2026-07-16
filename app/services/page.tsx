import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import Link from "next/link";
import { CheckCircle, Clock, ChevronRight, Star } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BPO & REO Inspection Services — 45+ Options",
  description: "Browse Snapect's full catalog of BPO and REO field inspection services: exterior photo sets, interior condition reports, occupancy checks, vehicle inspections, and property documentation. Fixed pricing, fast turnaround.",
  keywords: [
    "BPO inspection services", "REO photo services", "exterior photo set pricing",
    "occupancy verification service", "vehicle condition inspection", "property condition report service",
    "interior BPO inspection", "field inspection pricing", "REO property services"
  ],
  alternates: { canonical: "/services" },
  openGraph: {
    title: "BPO & REO Inspection Services — 45+ Options | Snapect",
    description: "Full catalog of field inspection services: photo sets, condition reports, occupancy checks, vehicle inspections. Fixed pricing, fast dispatch.",
    url: "/services",
  },
};

const CATALOG = [
  {
    category: "BPO / REO Exterior Photo Sets",
    color: "blue",
    desc: "Fixed-price exterior photo sets for BPO, REO, and property management. The most ordered services on the platform.",
    services: [
      { name:"3-Photo Set",   price:40,  rush24:55,  rush6:75,  shots:["Front of property","Address number","Street scene"] },
      { name:"4-Photo Set A", price:50,  rush24:65,  rush6:85,  shots:["Front of property","Right or left side","Address number","Street scene"] },
      { name:"4-Photo Set B", price:55,  rush24:70,  rush6:90,  shots:["Front of property","Address number","Street scene (left)","Street scene (right)"] },
      { name:"5-Photo Set",   price:65,  rush24:80,  rush6:100, shots:["Front","Right side","Left side","Address number","Street scene"] },
      { name:"6-Photo Set",   price:75,  rush24:90,  rush6:110, shots:["Front","Right side","Left side","Address number","Street scene (left)","Street scene (right)"] },
      { name:"7-Photo Set",   price:85,  rush24:100, rush6:120, shots:["Front","Right side","Left side","Street sign","Address number","Street scene (left)","Street scene (right)"] },
      { name:"8-Photo Set ★", price:95,  rush24:110, rush6:130, shots:["Front","Right side","Left side","Street sign","Address number","Street scene (left)","Street scene (right)","View from across street"] },
    ],
  },
  {
    category: "Interior Photo Packages",
    color: "violet",
    desc: "Full interior documentation. Interior access required — coordinate with property contact before ordering.",
    services: [
      { name:"Interior Basic",           price:120, rush24:135, rush6:155, shots:["Living room","Kitchen","All bedrooms","All bathrooms","Any visible damage"] },
      { name:"Interior Full Package",    price:160, rush24:175, rush6:195, shots:["All rooms","Basement","Garage","HVAC","Roof access","Any damage"] },
      { name:"Interior + Exterior Combo",price:220, rush24:235, rush6:255, shots:["Full 7-photo exterior + full interior"] },
    ],
  },
  {
    category: "Occupancy & Condition Checks",
    color: "amber",
    desc: "Determine if a property is occupied, vacant, or in poor condition. No interior access required for basic checks.",
    services: [
      { name:"Occupancy Check",           price:80,  rush24:95,  rush6:115, shots:["Front","Mailbox","Utility meters","Signs of occupancy","Address"] },
      { name:"Occupancy Check + Report",  price:110, rush24:125, rush6:145, shots:["Full occupancy check + written condition report"] },
      { name:"Exterior Condition Report", price:95,  rush24:110, rush6:130, shots:["All four sides","Roof visible","Foundation","Driveway","Any damage"] },
      { name:"Full Condition Report",     price:200, rush24:215, rush6:235, shots:["Complete interior + exterior condition documentation"] },
    ],
  },
  {
    category: "Vehicle Inspections",
    color: "rose",
    desc: "Full vehicle inspection and documentation for financing, insurance, estate, or private sale purposes.",
    services: [
      { name:"Car Exterior Only",           price:80,  rush24:95,  rush6:115, shots:["Front","Rear","Both sides","Any body damage"] },
      { name:"Car Full Inspection",         price:120, rush24:135, rush6:155, shots:["All exterior angles","Interior","Dashboard","Engine bay","Odometer","VIN","Any damage"] },
      { name:"Motorcycle Inspection",       price:45,  rush24:60,  rush6:80,  shots:["Both sides","Front","Rear","Engine","Odometer","VIN"] },
      { name:"RV / Camper Inspection",      price:80,  rush24:95,  rush6:115, shots:["All exterior","Interior living","Kitchen","Bathroom","Sleeping","Engine","Roof","Damage"] },
      { name:"Boat / Marine Inspection",    price:40,  rush24:55,  rush6:75,  shots:["Both sides","Bow","Stern","Interior","Engine","Hull","Any damage"] },
      { name:"Truck / Commercial Vehicle",  price:150, rush24:165, rush6:185, shots:["All angles","Cab interior","Cargo area","Engine bay","Tires","VIN"] },
      { name:"Trailer Inspection",          price:90,  rush24:105, rush6:125, shots:["All sides","Hitch","Floor","Tires","Any damage"] },
    ],
  },
  {
    category: "Property Inspections",
    color: "emerald",
    desc: "Detailed inspection and documentation for buyers, sellers, lenders, investors, and insurance carriers.",
    services: [
      { name:"Pre-Sale Inspection Photos",   price:130, rush24:145, rush6:165, shots:["Document property condition before listing"] },
      { name:"Construction Inspection",      price:175, rush24:190, rush6:210, shots:["Document construction progress and condition"] },
      { name:"Disaster / Storm Inspection",  price:250, rush24:265, rush6:285, shots:["Document storm or disaster damage"] },
      { name:"Insurance Inspection",         price:120, rush24:135, rush6:155, shots:["Roof","Foundation","Electrical panel","Pool/fence","Carrier-formatted summary"] },
      { name:"Tax Lien Inspection",          price:100, rush24:115, rush6:135, shots:["Property condition for tax lien assessment"] },
      { name:"REO Property Inspection",      price:150, rush24:165, rush6:185, shots:["Full bank-owned property documentation"] },
      { name:"Investment Assessment",        price:200, rush24:215, rush6:235, shots:["Full property assessment for investment"] },
    ],
  },
  {
    category: "Commercial & Business",
    color: "sky",
    desc: "Document commercial properties for acquisition, insurance, lease review, or project completion.",
    services: [
      { name:"Retail Space Inspection",     price:200, rush24:215, rush6:235, shots:["Full retail space documentation"] },
      { name:"Restaurant Inspection",       price:220, rush24:235, rush6:255, shots:["Kitchen","Dining area","Storage","Equipment","Any issues"] },
      { name:"Office Space Documentation",  price:180, rush24:195, rush6:215, shots:["Full office condition photography"] },
      { name:"Warehouse Inspection",        price:250, rush24:265, rush6:285, shots:["Full warehouse condition report"] },
      { name:"Project Completion Verify",   price:160, rush24:175, rush6:195, shots:["Verify project completed as agreed"] },
    ],
  },
  {
    category: "Rental & Lease",
    color: "indigo",
    desc: "Move-in, move-out, and mid-lease documentation. Interior access required.",
    services: [
      { name:"Move-In Condition Report",    price:130, rush24:145, rush6:165, shots:["All rooms","Appliances","Fixtures","Any pre-existing damage"] },
      { name:"Move-Out Condition Report",   price:130, rush24:145, rush6:165, shots:["All rooms","Appliances","Fixtures","Damage comparison"] },
      { name:"Mid-Lease Inspection",        price:110, rush24:125, rush6:145, shots:["Property condition mid-tenancy"] },
      { name:"Short-Term Rental Inspection",price:120, rush24:135, rush6:155, shots:["Airbnb/VRBO condition verification"] },
    ],
  },
  {
    category: "Land & Lot Surveys",
    color: "green",
    desc: "Document vacant land, lot boundaries, and land condition.",
    services: [
      { name:"Vacant Lot Documentation",  price:80,  rush24:95,  rush6:115, shots:["All four corners","Street sign","Address/lot marker","Any improvements","Surrounding area"] },
      { name:"Boundary Survey Photos",    price:100, rush24:115, rush6:135, shots:["Property boundary markers and lines"] },
      { name:"Land Condition Survey",     price:120, rush24:135, rush6:155, shots:["Full land condition documentation with notes"] },
    ],
  },
  {
    category: "Videography",
    color: "purple",
    desc: "Full walkthrough video for listings, insurance, or documentation. Exterior or full interior.",
    services: [
      { name:"Exterior Walkthrough Video",   price:150, rush24:165, rush6:185, shots:["Full exterior 360-degree walkthrough"] },
      { name:"Full Property Video",          price:250, rush24:265, rush6:285, shots:["Complete interior + exterior walkthrough — all rooms, all angles"] },
      { name:"Aerial Drone Video",           price:300, rush24:315, rush6:335, shots:["Drone footage where permitted — property and surroundings"] },
      { name:"Vehicle Video Inspection",     price:130, rush24:145, rush6:165, shots:["Full video walk-around of vehicle"] },
    ],
  },
  {
    category: "Specialty Services",
    color: "slate",
    desc: "Targeted documentation for specific needs.",
    services: [
      { name:"Neighborhood Assessment",      price:110, rush24:125, rush6:145, shots:["Subject property","Neighboring properties","Street both directions","Any concerns"] },
      { name:"Pool & Spa Inspection",        price:120, rush24:135, rush6:155, shots:["Pool/spa condition and visible issues"] },
      { name:"Roof Condition Photos",        price:100, rush24:115, rush6:135, shots:["Roof condition from ground and accessible angles"] },
      { name:"Utility Meter Documentation",  price:75,  rush24:90,  rush6:110, shots:["All utility meters for occupancy/usage verification"] },
      { name:"Lockbox Verification",         price:70,  rush24:85,  rush6:105, shots:["Verify lockbox present and accessible"] },
      { name:"Sign Placement Verification",  price:65,  rush24:80,  rush6:100, shots:["Verify signage correctly placed at property"] },
      { name:"Hoarding / Code Violation",    price:150, rush24:165, rush6:185, shots:["Document hoarding or code violation conditions"] },
      { name:"Winterization Verification",   price:100, rush24:115, rush6:135, shots:["Verify property properly winterized"] },
      { name:"Custom Order (You Set Price)", price:0,   rush24:0,   rush6:0,   shots:["Describe what you need — you set the price"] },
    ],
  },
];

const COLOR_MAP: Record<string, { header: string; badge: string; check: string }> = {
  blue:   { header:"bg-blue-700",   badge:"bg-blue-100 text-blue-700",   check:"text-blue-600" },
  violet: { header:"bg-violet-700", badge:"bg-violet-100 text-violet-700",check:"text-violet-600" },
  amber:  { header:"bg-amber-700",  badge:"bg-amber-100 text-amber-700",  check:"text-amber-600" },
  rose:   { header:"bg-rose-700",   badge:"bg-rose-100 text-rose-700",    check:"text-rose-600" },
  emerald:{ header:"bg-emerald-700",badge:"bg-emerald-100 text-emerald-700",check:"text-emerald-600" },
  sky:    { header:"bg-sky-700",    badge:"bg-sky-100 text-sky-700",      check:"text-sky-600" },
  indigo: { header:"bg-indigo-700", badge:"bg-indigo-100 text-indigo-700",check:"text-indigo-600" },
  green:  { header:"bg-green-700",  badge:"bg-green-100 text-green-700",  check:"text-green-600" },
  purple: { header:"bg-purple-700", badge:"bg-purple-100 text-purple-700",check:"text-purple-600" },
  slate:  { header:"bg-[#2A2320]",  badge:"bg-[#EADCC8] text-[#6B5D52]",  check:"text-[#8A7A6C]" },
};

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-[#FAF6EF] pt-20">
      <PublicNav />

      {/* Hero */}
      <section className="bg-white border-b border-[#F0E4D3] text-[#2A2320] py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#C2410C]/10 border border-[#C2410C]/30 text-[#2A2320] text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Star className="w-3.5 h-3.5 text-[#C2410C]" />
            45+ services · Verified local agents · Rush available
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-5 leading-tight">Our Services</h1>
          <p className="text-xl text-[#6B5D52] max-w-2xl mx-auto leading-relaxed">
            Choose a service, enter the address, and place your order. Verified field agents send offers within minutes — you pick the offer that works for you.
          </p>
        </div>
      </section>

      {/* Rush pricing banner */}
      <section className="py-8 px-4 bg-[#F3EBDD] border-b border-[#E7DBCB]">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-4 text-center">
          {[
            { tier:"Standard", note:"Orders before 10 AM → next business day", color:"text-[#4A403A]" },
            { tier:"Rush 24hr", note:"Completed within 24 hours on business days", color:"text-amber-600" },
            { tier:"Rush 6hr",  note:"Completed within 6 daylight hours", color:"text-red-600" },
          ].map(t=>(
            <div key={t.tier} className="bg-white border border-[#E7DBCB] rounded-xl p-4">
              <div className={`text-lg font-bold ${t.color}`}>{t.tier}</div>
              <div className="text-xs text-[#A99885] mt-1">{t.note}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Service catalog */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto space-y-12">
          {CATALOG.map(cat=>{
            const c = COLOR_MAP[cat.color] ?? COLOR_MAP.slate;
            return (
              <div key={cat.category} className="rounded-2xl overflow-hidden border border-[#E7DBCB] shadow-sm">
                {/* Category header */}
                <div className="bg-[#F3EBDD] border-b border-[#F0E4D3] text-[#2A2320] px-6 py-4">
                  <h2 className="text-lg font-bold">{cat.category}</h2>
                  <p className="text-sm opacity-80 mt-0.5">{cat.desc}</p>
                </div>
                {/* Services grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#F0E4D3] bg-white">
                  {cat.services.map(svc=>(
                    <div key={svc.name} className="p-5 flex flex-col">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-[#2A2320] text-sm leading-snug">{svc.name}</h3>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${c.badge}`}>{svc.price > 0 ? "Available" : "Custom"}</span>
                      </div>

                      <ul className="space-y-1 mt-auto">
                        {svc.shots.map((shot,i)=>(
                          <li key={i} className="flex items-start gap-1.5 text-xs text-[#8A7A6C]">
                            <CheckCircle className={`w-3 h-3 mt-0.5 flex-shrink-0 ${c.check}`}/>
                            {shot}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-blue-700 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to place an order?</h2>
          <p className="text-blue-200 mb-8 text-lg">Create a free account and submit your first order in under 2 minutes.</p>
          <Link href="/register/client"
            className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold px-8 py-4 rounded-xl text-lg transition-colors">
            Get Started — Free Account
            <ChevronRight className="w-5 h-5"/>
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

// SEO
// metadata already exported above - this is just for reference
