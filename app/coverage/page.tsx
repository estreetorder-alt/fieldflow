"use client";
import { useState } from "react";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import Link from "next/link";
import { MapPin, CheckCircle, Clock, Star, ChevronRight, Search, AlertTriangle } from "lucide-react";

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
          placeholder="e.g. 60601" maxLength={5}
          onKeyDown={e=>{ if(e.key==="Enter") check(); }}
          className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
        <button onClick={check} disabled={loading||zip.length!==5}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-xl text-sm">
          <Search className="w-4 h-4"/>{loading?"…":"Check"}
        </button>
      </div>
      {result && (
        <div className={`mt-3 flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${result.covered?"bg-green-50 text-green-700 border border-green-200":"bg-amber-50 text-amber-700 border border-amber-200"}`}>
          {result.covered
            ? <><CheckCircle className="w-4 h-4"/>{result.agentCount} agent{result.agentCount!==1?"s":""} available in ZIP {zip} — <Link href="/register/client" className="underline font-bold">Order now</Link></>
            : <><AlertTriangle className="w-4 h-4"/>No agents in ZIP {zip} yet — orders will be queued. <Link href="/contact" className="underline">Notify me</Link></>}
        </div>
      )}
    </div>
  );
}

const STATES = [
  { name: "Alabama", abbr: "AL", agents: 8 },
  { name: "Arizona", abbr: "AZ", agents: 14 },
  { name: "Arkansas", abbr: "AR", agents: 6 },
  { name: "California", abbr: "CA", agents: 31 },
  { name: "Colorado", abbr: "CO", agents: 11 },
  { name: "Connecticut", abbr: "CT", agents: 7 },
  { name: "Florida", abbr: "FL", agents: 24 },
  { name: "Georgia", abbr: "GA", agents: 16 },
  { name: "Idaho", abbr: "ID", agents: 4 },
  { name: "Illinois", abbr: "IL", agents: 19 },
  { name: "Indiana", abbr: "IN", agents: 9 },
  { name: "Iowa", abbr: "IA", agents: 5 },
  { name: "Kansas", abbr: "KS", agents: 5 },
  { name: "Kentucky", abbr: "KY", agents: 7 },
  { name: "Louisiana", abbr: "LA", agents: 8 },
  { name: "Maryland", abbr: "MD", agents: 10 },
  { name: "Massachusetts", abbr: "MA", agents: 12 },
  { name: "Michigan", abbr: "MI", agents: 13 },
  { name: "Minnesota", abbr: "MN", agents: 10 },
  { name: "Missouri", abbr: "MO", agents: 9 },
  { name: "Nevada", abbr: "NV", agents: 8 },
  { name: "New Jersey", abbr: "NJ", agents: 14 },
  { name: "New York", abbr: "NY", agents: 22 },
  { name: "North Carolina", abbr: "NC", agents: 15 },
  { name: "Ohio", abbr: "OH", agents: 16 },
  { name: "Oklahoma", abbr: "OK", agents: 6 },
  { name: "Oregon", abbr: "OR", agents: 9 },
  { name: "Pennsylvania", abbr: "PA", agents: 17 },
  { name: "South Carolina", abbr: "SC", agents: 8 },
  { name: "Tennessee", abbr: "TN", agents: 11 },
  { name: "Texas", abbr: "TX", agents: 28 },
  { name: "Utah", abbr: "UT", agents: 7 },
  { name: "Virginia", abbr: "VA", agents: 13 },
  { name: "Washington", abbr: "WA", agents: 11 },
  { name: "Wisconsin", abbr: "WI", agents: 8 },
];

function agentColor(n: number) {
  if (n >= 20) return "bg-blue-700 text-white";
  if (n >= 12) return "bg-blue-500 text-white";
  if (n >= 7) return "bg-blue-300 text-blue-900";
  return "bg-blue-100 text-blue-700";
}

export default function CoveragePage() {
  const totalAgents = STATES.reduce((s, st) => s + st.agents, 0);

  return (
    <div className="min-h-screen bg-white">
      <PublicNav />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <MapPin className="w-3.5 h-3.5" />
            35 states · {totalAgents}+ agents · growing weekly
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-5 leading-tight">Coverage Map</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            FieldFlow agents operate across 35 states with same-week availability in most major metros. New regions added monthly.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 bg-slate-50 border-y border-slate-200">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: "35", label: "States Covered" },
            { value: `${totalAgents}+`, label: "Active Agents" },
            { value: "48hrs", label: "Avg Dispatch Time" },
            { value: "98%", label: "Jobs Fulfilled" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-extrabold text-blue-700 mb-1">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Legend */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center gap-4 mb-8 justify-center">
            <span className="text-sm font-medium text-slate-500">Agent density:</span>
            {[
              { color: "bg-blue-100", label: "1–6 agents" },
              { color: "bg-blue-300", label: "7–11 agents" },
              { color: "bg-blue-500", label: "12–19 agents" },
              { color: "bg-blue-700", label: "20+ agents" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5 text-xs text-slate-600">
                <div className={`w-3.5 h-3.5 rounded-sm ${l.color}`} />
                {l.label}
              </div>
            ))}
          </div>

          {/* ZIP check */}
          <div className="max-w-lg mx-auto mb-10 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-1">Check your ZIP code</h3>
            <p className="text-sm text-slate-500 mb-4">Enter a ZIP code to see if we have agents in that area right now.</p>
            <ZipChecker />
          </div>

          {/* State Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
            {STATES.map((state) => (
              <div
                key={state.abbr}
                className={`rounded-xl p-3 text-center cursor-default hover:scale-105 transition-transform ${agentColor(state.agents)}`}
              >
                <div className="font-bold text-sm">{state.abbr}</div>
                <div className="text-xs opacity-80 mt-0.5">{state.agents} agents</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Not in my state? */}
      <section className="py-16 px-4 bg-slate-50 border-t border-slate-200">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Don&apos;t see your state?</h2>
            <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
              We&apos;re expanding rapidly. Contact us and we&apos;ll let you know when agents are available in your area — or consider joining as an agent yourself.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 border border-slate-300 text-slate-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-sm"
              >
                Notify me when available
              </Link>
              <Link
                href="/work"
                className="inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
              >
                Become an Agent
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Turnaround times */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Typical turnaround by region</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                region: "Major Metros",
                examples: "Chicago, NY, LA, Houston, Atlanta",
                turnaround: "Same or next day",
                icon: <Star className="w-5 h-5 text-blue-600" />,
                badge: "bg-blue-50 border-blue-200",
              },
              {
                region: "Mid-Sized Cities",
                examples: "Indianapolis, Louisville, Raleigh",
                turnaround: "24–48 hours",
                icon: <Clock className="w-5 h-5 text-violet-600" />,
                badge: "bg-violet-50 border-violet-200",
              },
              {
                region: "Rural & Suburban",
                examples: "Small towns, rural counties",
                turnaround: "48–96 hours",
                icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
                badge: "bg-emerald-50 border-emerald-200",
              },
            ].map((r) => (
              <div key={r.region} className={`border rounded-2xl p-6 ${r.badge}`}>
                <div className="mb-3">{r.icon}</div>
                <h3 className="font-semibold text-slate-900 mb-1">{r.region}</h3>
                <p className="text-xs text-slate-500 mb-3">{r.examples}</p>
                <div className="text-sm font-bold text-slate-800">{r.turnaround}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-blue-700 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to order?</h2>
          <p className="text-blue-200 mb-8 text-lg">Check your area and get a quote in 60 seconds.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold px-8 py-4 rounded-xl text-lg transition-colors"
          >
            Get a Quote
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
