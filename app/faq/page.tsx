"use client";
import { useState } from "react";
import Link from "next/link";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";

interface QA { q: string; a: string; }
interface Cat { id: string; label: string; items: QA[]; }

const CATS: Cat[] = [
  { id:"orders", label:"Orders — Placing, status & delivery", items:[
    { q:"How do I place single orders?", a:"Log in to your client portal and choose Orders → Place An Order. Pick an order type (Real Estate, Custom, Site Inspections, or Agent Validate), select a service from the list, enter the property address and click Check Address — we verify a field agent is nearby before you order — then choose delivery speed, photo size & date stamp, add any comments, review, and pay. The nearest highest-rated agent is dispatched within seconds of payment." },
    { q:"How do I place multiple orders?", a:"Use Orders → Place Multi Orders. You can enter up to 50 properties at once — one row per address with its own service and turnaround. Submit them together and complete a single payment." },
    { q:"Can I make any changes to a predefined order?", a:"No. Predefined services carry a fixed Work Order that is sent to the field agent exactly as described, and they cannot be altered in any way. Once a field agent accepts an order it can no longer be modified or cancelled. If you need something specific, place a Customized Order instead." },
    { q:"Can I place a customized order?", a:"Yes — choose the Custom tab when placing an order. Describe the exact duties you need performed (avoid vague phrases like “a typical exterior set”), state whether an appointment with the occupant is required, and set your own payout. Custom orders have a $23.00 minimum, and we reserve the right to decline rates we consider unsuitable for our field agents." },
    { q:"When will my order be delivered?", a:"Orders placed before 10:00 AM (local time of the property) complete the next business day. After 10 AM, standard orders complete in two business days. 24-Hour Rush and 6-Hour Daylight Rush options are available for an additional fee. Specific times of day are not guaranteed." },
    { q:"How do I get the status of an order?", a:"Your dashboard updates in real time — each order row shows its live status: Rep notified → Accepted (with time) → Completed. Click any address for full details, photos, invoice and report." },
  ]},
  { id:"coverage", label:"Coverage", items:[
    { q:"How do I determine if an area is covered?", a:"Enter the property address on the order form and click Check Address — we tell you immediately how many field agents cover that ZIP, before you pay anything. You can also browse the Coverage Map. If a ZIP has no agents yet, your order is queued until one is available." },
    { q:"What if the nearest agent is far from my property?", a:"Field agents typically accept orders within about 7 miles of their location. For remote properties you can add an optional Mileage/Toll Incentive (roughly $1.25 per mile beyond 7) on the address step — it goes to the agent and greatly increases acceptance speed in rural areas." },
  ]},
  { id:"employees", label:"Employees — Add employee logins", items:[
    { q:"Can my employees have their own logins?", a:"Yes. Go to Settings → Manage Employees to create sub-accounts. Each employee logs in with their own credentials and places orders billed to your account, and every order on your dashboard is tagged with which employee placed it." },
  ]},
  { id:"fees", label:"Fees, payments & credits", items:[
    { q:"How do payments work?", a:"Payment is required before an order is processed. Pay by card at checkout (via Whop) or from your Snapect wallet balance. Your Invoices page shows your full transaction ledger and lets you add funds for future orders." },
    { q:"What is your refund policy?", a:"Snapect does not issue cash refunds. If something goes wrong with a delivered order, open a dispute within 5 business days — we resolve it with a free reshoot or a wallet credit toward a future order. See our Refund Policy page for full details." },
    { q:"Can I offer a tip to the field agent?", a:"Yes — the Incentive Payment on the address step is added directly to the field agent's payout. It's optional for covered areas and recommended for remote ones." },
  ]},
  { id:"agents", label:"Field Agents — Recruiting", items:[
    { q:"How do I become a field agent?", a:"Signup is free — no application fee. Register on the Work With Us page, then upload your 7-photo sample set within 48 hours. Once approved, you'll start receiving job offers in your coverage ZIPs and get paid per completed order." },
  ]},
];

export default function FaqPage() {
  const [cat, setCat] = useState("orders");
  const [open, setOpen] = useState<string|null>(null);
  const current = CATS.find(c=>c.id===cat)!;

  return (
    <div className="min-h-screen bg-white">
      <PublicNav />
      <section className="bg-[#0f1f3d] text-white py-14 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <HelpCircle className="w-12 h-12 text-[#c8991a] mx-auto mb-4"/>
          <h1 className="text-4xl font-extrabold mb-2">Frequently Asked Questions</h1>
          <p className="text-slate-300 text-sm">Orders, coverage, employees, fees, and joining as a field agent</p>
        </div>
      </section>

      <section className="py-14 px-4">
        <div className="max-w-4xl mx-auto grid md:grid-cols-[230px_1fr] gap-6 items-start">
          <aside className="bg-[#0f1f3d] rounded-2xl overflow-hidden">
            {CATS.map(c=>(
              <button key={c.id} onClick={()=>{setCat(c.id);setOpen(null);}}
                className={`w-full text-left px-4 py-3 text-sm font-semibold border-b border-white/5 last:border-0 transition-colors ${cat===c.id?"bg-[#c8991a] text-[#0f1f3d]":"text-slate-200 hover:bg-white/10"}`}>
                {c.label}
              </button>
            ))}
          </aside>

          <div className="space-y-3">
            {current.items.map(item=>(
              <div key={item.q} className="border border-slate-200 rounded-xl overflow-hidden">
                <button onClick={()=>setOpen(open===item.q?null:item.q)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-50">
                  <span className="font-bold text-[#0f1f3d] text-sm">{item.q}</span>
                  {open===item.q?<ChevronUp className="w-4 h-4 text-[#c8991a] flex-shrink-0"/>:<ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0"/>}
                </button>
                {open===item.q&&(
                  <div className="px-4 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">{item.a}</div>
                )}
              </div>
            ))}
            <p className="text-xs text-slate-400 pt-2">Still stuck? <Link href="/contact" className="text-[#c8991a] font-semibold underline">Contact support</Link> — or see our <Link href="/refund-policy" className="text-[#c8991a] font-semibold underline">Refund Policy</Link>.</p>
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
