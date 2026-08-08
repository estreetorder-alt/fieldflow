"use client";
import { useState } from "react";
import { MapPin, CheckCircle, Search } from "lucide-react";
import CoverageMap, { type CoverageFlyTarget } from "@/app/components/CoverageMap";

async function geocodeZip(zip: string): Promise<{ lng: number; lat: number; place: string } | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;
  try {
    const r = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${zip}.json?country=us&types=postcode&access_token=${token}`
    );
    const d = await r.json();
    const feature = d?.features?.[0];
    if (!feature?.center) return null;
    const [lng, lat] = feature.center as [number, number];
    return { lng, lat, place: feature.place_name ?? zip };
  } catch {
    return null;
  }
}

export default function CoverageMapPanel() {
  const [zip, setZip] = useState("");
  const [result, setResult] = useState<{ covered: boolean; agentCount: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [flyTarget, setFlyTarget] = useState<CoverageFlyTarget | null>(null);

  async function check() {
    if (zip.length !== 5) return;
    setLoading(true);
    const [r, geo] = await Promise.all([
      fetch("/api/coverage-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ zip }) }),
      geocodeZip(zip),
    ]);
    const d = await r.json();
    setResult(d);
    if (geo) setFlyTarget({ lng: geo.lng, lat: geo.lat, zoom: 10.5, label: geo.place });
    setLoading(false);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--brand-navy)]">Check ZIP coverage</h2>
        <p className="text-sm text-[var(--brand-ink-soft)] mt-1">Look up agent coverage for any address before you place an order — right here in your account.</p>
      </div>

      <div className="flex gap-3 max-w-xl">
        <div className="relative flex-1">
          <MapPin className="w-4 h-4 text-[var(--brand-ink-faint)] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="Enter ZIP code"
            maxLength={5}
            onKeyDown={(e) => { if (e.key === "Enter") check(); }}
            className="w-full bg-white border border-[var(--brand-border)] rounded-full pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
          />
        </div>
        <button
          onClick={check}
          disabled={loading || zip.length !== 5}
          className="flex items-center gap-2 bg-[#FF6A00] hover:bg-[#FF8C1A] disabled:opacity-50 text-white font-bold px-6 py-3 rounded-full text-sm transition-colors whitespace-nowrap"
        >
          <Search className="w-4 h-4" />{loading ? "…" : "Check"}
        </button>
      </div>

      {result && (
        <div className="max-w-xl flex items-center gap-3 p-4 rounded-xl text-sm font-medium border bg-green-50 text-green-800 border-green-200">
          {result.covered ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span><strong>Great! We service your area.</strong> {result.agentCount} agent{result.agentCount !== 1 ? "s" : ""} available nearby.</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span>We have <strong>a representative</strong> in the area for ZIP {zip}. Your order will be queued and matched shortly.</span>
            </>
          )}
        </div>
      )}

      <div className="relative h-[420px] rounded-3xl overflow-hidden border border-[var(--brand-border)] bg-[#1C1917]">
        <CoverageMap flyTo={flyTarget} />
      </div>
    </div>
  );
}
