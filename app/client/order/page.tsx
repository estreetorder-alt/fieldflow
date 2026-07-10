"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle, AlertTriangle, ChevronDown, ArrowLeft, Package,
  Home as HomeIcon, Settings2, Building2, BadgeCheck, MapPin, FileText,
} from "lucide-react";

interface ServiceItem { id: string; name: string; description: string; category: string; photoCount?: number; shotList?: string[]; isCustom?: boolean; requiresInterior?: boolean; requiresAppointment?: boolean; }
interface ServiceCategory { id: string; label: string; services: ServiceItem[]; }

const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

const TAB_META: Record<string,{icon:React.ReactNode}> = {
  real_estate: { icon:<HomeIcon className="w-4 h-4"/> },
  custom: { icon:<Settings2 className="w-4 h-4"/> },
  site_inspections: { icon:<Building2 className="w-4 h-4"/> },
  agent_validate: { icon:<BadgeCheck className="w-4 h-4"/> },
};

function PlaceOrderInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [catalog, setCatalog] = useState<ServiceCategory[]>([]);
  const [tab, setTab] = useState("real_estate");
  const [selectedServiceId, setSelectedServiceId] = useState("re_main6");
  const [customDuties, setCustomDuties] = useState("");

  // Address
  const [street, setStreet] = useState("");
  const [unit, setUnit] = useState("");
  const [city, setCity] = useState("");
  const [stateAbbr, setStateAbbr] = useState("");
  const [zip, setZip] = useState("");

  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const currentTab = catalog.find(c=>c.id===tab);
  const selectedSvc = catalog.flatMap(c=>c.services).find(s=>s.id===selectedServiceId);
  const isCustom = tab==="custom";
  const composedAddress = `${street.trim()}${unit.trim()?` ${unit.trim()}`:""}, ${city.trim()}, ${stateAbbr} ${zip.trim()}`;

  useEffect(() => {
    fetch("/api/services").then(r=>r.json()).then(d=>{ if(d.catalog) setCatalog(d.catalog); });
  }, []);

  // Reorder prefill (?address=…) — best-effort split into fields
  useEffect(() => {
    const pre = searchParams.get("address");
    if (!pre) return;
    const zipM = pre.match(/\b(\d{5})(-\d{4})?\b/);
    if (zipM) setZip(zipM[1]);
    const stM = pre.match(/,\s*([A-Za-z]{2})\b(?=[^,]*$)/);
    if (stM && STATES.includes(stM[1].toUpperCase())) setStateAbbr(stM[1].toUpperCase());
    const parts = pre.split(",").map(p=>p.trim());
    if (parts[0]) setStreet(parts[0]);
    if (parts.length>=2) setCity(parts[1].replace(/\b[A-Z]{2}\b.*$/,"").trim() || parts[1]);
  }, [searchParams]);

  async function submitOrder() {
    if (isCustom && !customDuties.trim()) { setFormError("Describe the exact duties for your custom order"); return; }
    if (!isCustom && !selectedSvc) { setFormError("Choose a service to continue"); return; }
    if (!street.trim()||!city.trim()||!stateAbbr||!zip.trim()) { setFormError("Complete the address fields"); return; }
    setFormError(""); setSubmitting(true);

    const orderData = {
      address: composedAddress,
      serviceId: isCustom ? "custom_order" : selectedServiceId,
      turnaroundTier: "standard",
      notes: comments.trim(),
      ...(isCustom ? { customShotList: customDuties, customClientPrice: 0 } : {}),
    };

    const r = await fetch("/api/orders", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(orderData),
    });
    const d = await r.json();
    if (!r.ok) { setFormError(d.error ?? "Failed to submit"); setSubmitting(false); return; }
    // Auto-redirect back to the vendor dashboard
    router.push("/client?placed=1");
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/client" className="flex items-center gap-2 text-slate-500 hover:text-[#0f1f3d] text-sm font-medium">
            <ArrowLeft className="w-4 h-4"/>Back to Dashboard
          </Link>
          <span className="flex items-center gap-2">
            <img src="/snapect-logo.png" alt="Snapect" className="h-8 w-auto object-contain"/>
            <span className="text-[#0f1f3d] font-extrabold tracking-tight hidden sm:inline">Place An Order</span>
          </span>
          <Link href="/client/multi-order" className="flex items-center gap-1.5 text-[#c8991a] hover:text-[#a87f13] text-sm font-semibold">
            <Package className="w-4 h-4"/>Multi Orders
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {formError&&<div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{formError}</div>}

        {/* ── Service ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
          <h1 className="text-lg font-extrabold text-[#0f1f3d] mb-4">1. Choose a Service</h1>

          {/* Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4">
            {catalog.map(cat=>(
              <button key={cat.id} onClick={()=>{ setTab(cat.id); if(cat.id!=="custom"){ const first=cat.services[0]; if(!cat.services.some(s=>s.id===selectedServiceId)) setSelectedServiceId(first?.id ?? ""); } }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wide whitespace-nowrap border-2 transition-colors ${
                  tab===cat.id ? "bg-[#0f1f3d] text-[#c8991a] border-[#0f1f3d]" : "bg-white text-[#0f1f3d] border-slate-200 hover:border-[#c8991a]"
                }`}>
                {TAB_META[cat.id]?.icon}{cat.label}
              </button>
            ))}
          </div>

          {!isCustom ? (
            <>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{currentTab?.label} Services</label>
              <div className="relative">
                <select value={currentTab?.services.some(s=>s.id===selectedServiceId)?selectedServiceId:""} onChange={e=>setSelectedServiceId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c8991a] appearance-none font-medium text-[#0f1f3d]">
                  <option value="" disabled>Choose the Service</option>
                  {currentTab?.services.map(s=>(
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"/>
              </div>

              {selectedSvc && currentTab?.services.some(s=>s.id===selectedSvc.id) && (
                <div className="mt-4 text-sm text-slate-700 space-y-2">
                  <p className="font-bold text-[#0f1f3d]">{selectedSvc.name}</p>
                  {selectedSvc.shotList ? (
                    <ul className="list-disc ml-5 space-y-1 text-xs text-slate-600">
                      {selectedSvc.shotList.map((shot,i)=><li key={i}>1 photo — {shot}</li>)}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-600">{selectedSvc.description}</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Duties</label>
              <textarea value={customDuties} onChange={e=>setCustomDuties(e.target.value)} rows={5}
                placeholder="Specify the exact duties you want performed for this order. Include any lockbox codes or access / contact details."
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
            </>
          )}
        </div>

        {/* ── Address ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
          <h1 className="text-lg font-extrabold text-[#0f1f3d] mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-[#c8991a]"/>2. Enter the Address</h1>
          <div className="grid sm:grid-cols-[1fr_120px] gap-3 mb-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Street</label>
              <input value={street} onChange={e=>setStreet(e.target.value)} placeholder="132 Mabeline Rd"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Unit #</label>
              <input value={unit} onChange={e=>setUnit(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
            </div>
          </div>
          <div className="grid sm:grid-cols-[1fr_110px_130px] gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">City</label>
              <input value={city} onChange={e=>setCity(e.target.value)} placeholder="Saint George"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">State</label>
              <select value={stateAbbr} onChange={e=>setStateAbbr(e.target.value)}
                className="w-full px-2 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c8991a]">
                <option value="">—</option>
                {STATES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">ZIP</label>
              <input value={zip} onChange={e=>setZip(e.target.value.replace(/\D/g,"").slice(0,5))} placeholder="29477"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5"/>Comments (optional)</label>
            <textarea value={comments} onChange={e=>setComments(e.target.value)} rows={2} placeholder="Gate code 4471, beware of dog in rear yard…"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
          </div>
        </div>

        {/* ── Place Order Now ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-2 text-xs text-slate-500 max-w-sm">
            <AlertTriangle className="w-4 h-4 text-[#c8991a] flex-shrink-0 mt-0.5"/>
            <span>Once placed, your order goes into the queue and field agents will start sending offers. You&apos;ll review and accept an offer from your dashboard.</span>
          </div>
          <button onClick={submitOrder} disabled={submitting}
            className="bg-[#c8991a] hover:bg-[#f0b429] disabled:opacity-50 text-[#0f1f3d] font-extrabold px-8 py-3.5 rounded-xl flex items-center gap-2 transition-colors text-base">
            <CheckCircle className="w-5 h-5"/>{submitting ? "Placing Order…" : "Place Order Now"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PlaceOrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center text-slate-400">Loading…</div>}>
      <PlaceOrderInner />
    </Suspense>
  );
}
