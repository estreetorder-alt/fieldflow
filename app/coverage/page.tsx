"use client";
import { useState } from "react";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import Link from "next/link";
import { MapPin, CheckCircle, ChevronRight, Search, AlertTriangle, Users, Zap } from "lucide-react";

function ZipChecker() {
  const [zip, setZip] = useState("");
  const [result, setResult] = useState<{covered:boolean;agentCount:number}|null>(null);
  const [loading, setLoading] = useState(false);

  async function check() {
    if (zip.length !== 5) return;
    setLoading(true);
    const r = await fetch("/api/coverage-check", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({zip}) });
    const d = await r.json();
    setResult(d);
    setLoading(false);
  }

  return (
    <div>
      <div className="flex gap-2">
        <input value={zip} onChange={e=>setZip(e.target.value.replace(/\D/g,"").slice(0,5))}
          placeholder="Enter ZIP code…" maxLength={5}
          onKeyDown={e=>{ if(e.key==="Enter") check(); }}
          className="flex-1 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a] focus:border-transparent"/>
        <button onClick={check} disabled={loading||zip.length!==5}
          className="flex items-center gap-2 bg-[#c8991a] hover:bg-[#f0b429] disabled:opacity-50 text-[#0f1f3d] font-bold px-5 py-3 rounded-xl text-sm transition-colors">
          <Search className="w-4 h-4"/>{loading?"…":"Check"}
        </button>
      </div>
      {result && (
        <div className={`mt-3 flex items-center gap-3 p-4 rounded-xl text-sm font-medium border ${result.covered?"bg-green-50 text-green-800 border-green-200":"bg-amber-50 text-amber-800 border-amber-200"}`}>
          {result.covered
            ? <><CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0"/>
                <span><strong>Coverage confirmed!</strong> {result.agentCount} verified agent{result.agentCount!==1?"s":""} available in ZIP {zip}.{" "}
                <Link href="/register/client" className="underline font-bold">Order now →</Link></span></>
            : <><AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0"/>
                <span><strong>No agents yet</strong> in ZIP {zip}. Your order will be queued — we're expanding coverage daily.{" "}
                <Link href="/register/agent" className="underline font-bold">Become the first agent here →</Link></span></>}
        </div>
      )}
    </div>
  );
}

const STATES = [
  "Alabama","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia",
  "Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maryland","Massachusetts",
  "Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Jersey",
  "New Mexico","New York","North Carolina","Ohio","Oklahoma","Oregon","Pennsylvania","South Carolina",
  "Tennessee","Texas","Utah","Virginia","Washington","Wisconsin",
];

export default function CoveragePage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNav />

      <section className="bg-white text-[#0f1f3d] py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[#c8991a] font-bold text-sm uppercase tracking-wider mb-3">35 States · 8,500+ Cities</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-5 leading-tight">Coverage Area</h1>
          <p className="text-xl text-slate-600 max-w-xl mx-auto mb-8">We're growing fast. Check if your ZIP code is covered right now.</p>
          <div className="max-w-lg mx-auto bg-slate-100 border border-slate-300 rounded-2xl p-5 backdrop-blur-sm">
            <ZipChecker />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#c8991a] py-4 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6 text-center text-[#0f1f3d]">
          {[["35","States Covered"],["8,500+","Cities"],["150+","Verified Agents"]].map(([v,l])=>(
            <div key={l}><div className="text-2xl font-extrabold">{v}</div><div className="text-xs font-medium opacity-75">{l}</div></div>
          ))}
        </div>
      </section>

      <section className="py-16 px-4 bg-[#faf8f3]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[#c8991a] font-bold text-sm uppercase tracking-wider mb-2">Active Coverage</p>
            <h2 className="text-2xl font-bold text-[#0f1f3d] mb-3">States We Serve</h2>
            <p className="text-slate-500">We have active agents in these states. Coverage varies by ZIP — use the checker above.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {STATES.map(state=>(
              <div key={state} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 hover:border-[#c8991a] transition-colors">
                <CheckCircle className="w-3.5 h-3.5 text-[#c8991a] flex-shrink-0"/>
                <span className="text-sm text-slate-700 font-medium">{state}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-400 text-sm mt-6">Alaska, Hawaii, and remaining states — coming soon. <Link href="/contact" className="text-[#c8991a] font-semibold hover:underline">Request coverage</Link></p>
        </div>
      </section>

      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-8 items-center">
          <div className="text-[#0f1f3d]">
            <p className="text-[#c8991a] font-bold text-sm uppercase tracking-wider mb-3">Expand Our Network</p>
            <h2 className="text-2xl font-bold mb-4">Become the First Agent in Your Area</h2>
            <p className="text-slate-600 mb-6 leading-relaxed">If we don't have coverage in your ZIP, you could be the first Snapect agent there. Early agents in new areas get priority on all orders.</p>
            <ul className="space-y-2 mb-6">
              {["Earn as much as you can","First-in-area priority routing","Flexible hours — work when you want","Paid every Friday via PayPal"].map(b=>(
                <li key={b} className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle className="w-4 h-4 text-[#c8991a]"/>{b}</li>
              ))}
            </ul>
            <Link href="/register/agent" className="inline-flex items-center gap-2 bg-[#c8991a] hover:bg-[#f0b429] text-[#0f1f3d] font-bold px-6 py-3 rounded-xl transition-colors">
              Apply as Field Agent <ChevronRight className="w-4 h-4"/>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon:<MapPin className="w-6 h-6"/>, title:"Set Your ZIPs", desc:"Choose exactly which ZIP codes you want to cover in your dashboard" },
              { icon:<Zap className="w-6 h-6"/>, title:"Auto-Dispatched", desc:"Orders in your ZIPs are sent to you automatically based on your grade" },
              { icon:<Users className="w-6 h-6"/>, title:"Rotation System", desc:"Multiple agents in same ZIP share orders fairly — higher grade = more orders" },
              { icon:<CheckCircle className="w-6 h-6"/>, title:"Weekly Payout", desc:"Get paid every Friday via PayPal for all completed & approved orders" },
            ].map(c=>(
              <div key={c.title} className="bg-slate-50 rounded-xl p-4">
                <div className="text-[#c8991a] mb-2">{c.icon}</div>
                <h3 className="font-bold text-[#0f1f3d] text-sm mb-1">{c.title}</h3>
                <p className="text-slate-400 text-xs">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
