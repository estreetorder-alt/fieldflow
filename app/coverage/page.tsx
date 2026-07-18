"use client";
import { useState } from "react";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import Link from "next/link";
import { MapPin, CheckCircle, AlertTriangle, Search } from "lucide-react";
import CoverageMap from "../components/CoverageMap";

function ZipChecker() {
  const [zip, setZip] = useState("");
  const [result, setResult] = useState<{ covered: boolean; agentCount: number } | null>(null);
  const [loading, setLoading] = useState(false);

  async function check() {
    if (zip.length !== 5) return;
    setLoading(true);
    const r = await fetch("/api/coverage-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ zip }) });
    const d = await r.json();
    setResult(d);
    setLoading(false);
  }

  return (
    <div>
      <div className="flex gap-3 max-w-xl mx-auto">
        <div className="relative flex-1">
          <MapPin className="w-4 h-4 text-[#A99885] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="Enter ZIP code"
            maxLength={5}
            onKeyDown={(e) => { if (e.key === "Enter") check(); }}
            className="w-full bg-white border border-[#E7DBCB] rounded-full pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
          />
        </div>
        <button
          onClick={check}
          disabled={loading || zip.length !== 5}
          className="flex items-center gap-2 bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-50 text-white font-bold px-6 py-3.5 rounded-full text-sm transition-colors whitespace-nowrap"
        >
          <Search className="w-4 h-4" />{loading ? "…" : "Check"}
        </button>
      </div>
      {result && (
        <div className={`mt-4 max-w-xl mx-auto flex items-center gap-3 p-4 rounded-xl text-sm font-medium border ${result.covered ? "bg-green-50 text-green-800 border-green-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}>
          {result.covered ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span><strong>Great! We service your area.</strong> {result.agentCount} agent{result.agentCount !== 1 ? "s" : ""} available nearby. <Link href="/register/client" className="underline font-bold">Order now →</Link></span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span><strong>No agents yet</strong> in ZIP {zip}. Your order will be queued. <Link href="/register/agent" className="underline font-bold">Become the first agent here →</Link></span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Ordered by population/coverage prominence, matching the live coverage map
const STATES = [
  "California", "Texas", "Florida", "New York", "Pennsylvania",
  "Illinois", "Ohio", "Georgia", "North Carolina", "Michigan",
  "New Jersey", "Virginia", "Washington", "Arizona", "Massachusetts",
  "Tennessee", "Indiana", "Missouri", "Maryland", "Wisconsin",
  "Colorado", "Minnesota", "South Carolina", "Alabama", "Louisiana",
  "Kentucky", "Oregon", "Oklahoma", "Connecticut", "Utah",
  "Iowa", "Nevada", "Arkansas", "Mississippi", "Kansas",
];

export default function CoveragePage() {
  return (
    <div className="min-h-screen bg-[#FAF6EF] pt-20">
      <PublicNav />

      <section className="py-16 px-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-5 leading-tight">
          <span className="text-[#2A2320]">Nationwide </span>
          <span className="text-[#C2410C]">Coverage</span>
        </h1>
        <p className="text-lg text-[#6B5D52] max-w-2xl mx-auto mb-10">
          Our network of professional field agents covers 35+ states with rapid response times. Check if we service your area.
        </p>
        <ZipChecker />
      </section>

      {/* Live 3D coverage map */}
      <section className="px-4 max-w-6xl mx-auto">
        <div className="relative h-[420px] rounded-3xl overflow-hidden border border-[#2A2320] bg-[#1C1917]">
          <CoverageMap />
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto text-center mb-10">
          <h2 className="text-3xl font-extrabold mb-3">
            <span className="text-[#2A2320]">States We </span>
            <span className="text-[#C2410C]">Serve</span>
          </h2>
          <p className="text-[#6B5D52]">Professional agents ready to serve you across these states</p>
        </div>
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {STATES.map((state) => (
            <div key={state} className="flex items-center gap-2 bg-white border border-[#E7DBCB] rounded-xl px-4 py-3.5 hover:border-[#C2410C] hover:shadow-sm transition-all">
              <MapPin className="w-4 h-4 text-[#C2410C] flex-shrink-0" />
              <span className="text-sm text-[#2A2320] font-medium">{state}</span>
            </div>
          ))}
        </div>
        <p className="text-center text-[#A99885] text-sm mt-8">
          Don&apos;t see your state? <Link href="/contact" className="text-[#C2410C] font-semibold hover:underline">Request coverage</Link>
        </p>
      </section>

      <PublicFooter />
    </div>
  );
}
