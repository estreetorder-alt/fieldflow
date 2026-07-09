"use client";
import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  MapPin, CheckCircle, AlertCircle, AlertTriangle, ChevronDown, ChevronUp,
  DollarSign, FileText, CreditCard, Info, ArrowLeft, Camera, Clock, User, Package,
} from "lucide-react";

interface ServiceItem { id: string; name: string; description: string; basePrice: number; compensation: number; category: string; photoCount?: number; shotList?: string[]; isCustom?: boolean; requiresInterior?: boolean; }
interface ServiceCategory { id: string; label: string; services: ServiceItem[]; }
interface PaymentLink { id: string; label: string; url: string; amount?: number; description: string; active: boolean; }

const TIER_LABELS: Record<string,string> = { standard:"Next Business Day", rush_24hr:"24-Hour Rush (+25%)", rush_6hr:"6-Hour Rush (+75%)" };
const TIER_MULS: Record<string,number> = { standard:1, rush_24hr:1.25, rush_6hr:1.75 };

function calcPrice(svc: ServiceItem | undefined, tier: string, customPrice?: number): number {
  if (!svc) return 0;
  if (svc.isCustom) return customPrice ?? 0;
  return Math.round(svc.basePrice * (TIER_MULS[tier] ?? 1));
}

function SectionHeader({ n, title, sub, done }: { n: string; title: string; sub?: string; done?: boolean }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 ${done?"bg-green-500 text-white":"bg-[#0f1f3d] text-[#c8991a]"}`}>
        {done ? <CheckCircle className="w-4 h-4"/> : n}
      </span>
      <div>
        <h2 className="font-extrabold text-[#0f1f3d] leading-tight">{title}</h2>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function PlaceOrderInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [catalog, setCatalog] = useState<ServiceCategory[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string|null>("bpo_exterior");
  const [selectedServiceId, setSelectedServiceId] = useState("ext_7");

  const [address, setAddress] = useState("");
  const [validatingAddress, setValidatingAddress] = useState(false);
  const [addressValid, setAddressValid] = useState<boolean|null>(null);
  const [addressSuggestion, setAddressSuggestion] = useState("");
  const [addrLat, setAddrLat] = useState<number|null>(null);
  const [addrLng, setAddrLng] = useState<number|null>(null);
  const [coverageStatus, setCoverageStatus] = useState<{covered:boolean;agentCount:number}|null>(null);

  const [tier, setTier] = useState("standard");
  const [dateStamp, setDateStamp] = useState(false);
  const [accessContact, setAccessContact] = useState("");
  const [notes, setNotes] = useState("");
  const [customShotList, setCustomShotList] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [cutoffMsg, setCutoffMsg] = useState("");
  const [placedOrderId, setPlacedOrderId] = useState<string|null>(null);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);

  const selectedSvc = catalog.flatMap(c=>c.services).find(s=>s.id===selectedServiceId);
  const price = calcPrice(selectedSvc, tier, selectedSvc?.isCustom ? Number(customPrice) : undefined);
  const addressStepDone = address.trim().length > 0 && addressValid !== null;
  const unlocked = address.trim().length > 0; // sections below unlock once an address is entered

  useEffect(() => {
    fetch("/api/services").then(r=>r.json()).then(d=>{ if(d.catalog) setCatalog(d.catalog); });
    fetch("/api/payment-links").then(r=>r.json()).then(d=>{ setPaymentLinks(d.links?.filter((l: PaymentLink) => l.active) ?? []); });
    const h = new Date().getHours();
    setCutoffMsg(h < 10
      ? "Placed before 10 AM — standard orders complete next business day"
      : "Placed after 10 AM — standard orders complete in 2 business days");
  }, []);

  const validateAddress = useCallback(async (addr: string) => {
    if (!addr.trim() || addr.length < 10) return;
    setValidatingAddress(true); setAddressValid(null); setCoverageStatus(null);
    try {
      const r = await fetch("/api/validate-address", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({address:addr}) });
      const d = await r.json();
      setAddressValid(d.valid);
      if (d.suggestion) setAddressSuggestion(d.suggestion);
      if (d.lat) setAddrLat(d.lat);
      if (d.lng) setAddrLng(d.lng);
      const zipMatch = addr.match(/\b(\d{5})\b/);
      if (zipMatch) {
        const cr = await fetch("/api/coverage-check", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({zip:zipMatch[1]}) });
        const cd = await cr.json();
        setCoverageStatus({covered:cd.covered, agentCount:cd.agentCount});
      }
    } finally { setValidatingAddress(false); }
  }, []);

  // Reorder prefill (?address=…)
  useEffect(() => {
    const pre = searchParams.get("address");
    if (pre) { setAddress(pre); validateAddress(pre); }
  }, [searchParams, validateAddress]);

  async function submitOrder() {
    if (!address.trim()) { setFormError("Enter the property address first"); return; }
    if (!selectedSvc) { setFormError("Select a service"); return; }
    if (selectedSvc.isCustom && !customPrice) { setFormError("Enter your offered price for this custom order"); return; }
    setFormError(""); setSubmitting(true);

    const combinedNotes = accessContact.trim()
      ? `Access contact: ${accessContact.trim()}${notes.trim() ? ` — ${notes.trim()}` : ""}`
      : notes;

    const orderData = {
      address, serviceId: selectedServiceId, turnaroundTier: tier,
      notes: combinedNotes, dateStamp,
      ...(selectedSvc.isCustom ? { customShotList, customClientPrice: Number(customPrice) } : {}),
      lat: addrLat, lng: addrLng,
    };

    // Whop checkout when configured (predefined services)
    if (!selectedSvc.isCustom) {
      const whopRes = await fetch("/api/whop", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ orderData, totalPrice: price, description: `${selectedSvc.name} — ${address}` }),
      });
      const whopData = await whopRes.json();
      if (whopData.url) { window.location.href = whopData.url; return; }
    }

    const r = await fetch("/api/orders", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(orderData),
    });
    const d = await r.json();
    if (!r.ok) { setFormError(d.error ?? "Failed to submit"); setSubmitting(false); return; }
    setSubmitting(false);
    setPlacedOrderId(d.order?.id ?? "new");
  }

  // ── Post-submit screen (manual payment path) ──
  if (placedOrderId) {
    return (
      <div className="min-h-screen bg-[#eef1f6]">
        <div className="max-w-xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="bg-[#0f1f3d] p-7 text-center">
              <div className="w-14 h-14 bg-[#c8991a] rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-7 h-7 text-[#0f1f3d]"/>
              </div>
              <h1 className="text-xl font-bold text-white mb-1">Order Submitted!</h1>
              <p className="text-slate-300 text-sm">Complete payment to activate it — an agent is dispatched the moment payment is confirmed.</p>
            </div>
            <div className="p-6">
              {paymentLinks.length > 0 ? (
                <>
                  <p className="text-sm font-semibold text-slate-700 mb-3">Choose a payment method:</p>
                  <div className="space-y-3">
                    {paymentLinks.map(link => (
                      <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-between gap-3 p-4 border-2 border-[#c8991a] rounded-xl hover:bg-[#c8991a]/5 transition-colors group">
                        <div>
                          <p className="font-bold text-[#0f1f3d]">{link.label}</p>
                          {link.description && <p className="text-xs text-slate-500">{link.description}</p>}
                        </div>
                        <span className="text-xs bg-[#c8991a] text-[#0f1f3d] font-bold px-3 py-1.5 rounded-lg group-hover:bg-[#f0b429]">Pay Now →</span>
                      </a>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 text-center mt-4">Your order activates within a few hours of payment verification.</p>
                </>
              ) : (
                <p className="text-sm text-slate-600 text-center">Your order is pending payment confirmation. We&apos;ll email you as soon as it&apos;s activated.</p>
              )}
              <Link href="/client" className="block w-full text-center mt-5 bg-[#0f1f3d] hover:bg-[#1a3260] text-white font-bold py-3 rounded-xl">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef1f6]">
      {/* Slim navy header */}
      <header className="bg-[#0f1f3d] sticky top-0 z-20 shadow-md">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/client" className="flex items-center gap-2 text-slate-200 hover:text-white text-sm font-medium">
            <ArrowLeft className="w-4 h-4"/>Back to Dashboard
          </Link>
          <span className="text-white font-extrabold tracking-tight flex items-center gap-2"><Camera className="w-4 h-4 text-[#c8991a]"/>Place An Order</span>
          <Link href="/client/multi-order" className="flex items-center gap-1.5 text-[#c8991a] hover:text-[#f0b429] text-sm font-semibold">
            <Package className="w-4 h-4"/>Multi Orders
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {formError&&<div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{formError}</div>}

        {/* ── 1. Address (coverage checked BEFORE you order) ── */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
          <SectionHeader n="1" title="Enter the property address" sub="We check that a field agent is nearby before you order any service" done={addressStepDone}/>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
            <input value={address} onChange={e=>{ setAddress(e.target.value); setAddressValid(null); setCoverageStatus(null); }}
              onBlur={()=>validateAddress(address)}
              placeholder="123 Main St, Chicago, IL 60601"
              className="w-full pl-9 pr-10 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
            {validatingAddress&&<div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#c8991a] border-t-transparent rounded-full animate-spin"/>}
            {!validatingAddress&&addressValid===true&&<CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500"/>}
            {!validatingAddress&&addressValid===false&&<AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500"/>}
          </div>
          {addressSuggestion&&addressValid&&<p className="text-xs text-green-600 mt-1.5">✓ Verified: {addressSuggestion}</p>}
          {addressValid===false&&<p className="text-xs text-red-600 mt-1.5">Address not found — check spelling or add a ZIP code</p>}
          {coverageStatus&&(
            <div className={`mt-3 flex items-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-xl ${coverageStatus.covered?"bg-green-50 text-green-700 border border-green-200":"bg-amber-50 text-amber-700 border border-amber-200"}`}>
              {coverageStatus.covered ? <><CheckCircle className="w-4 h-4"/>Coverage confirmed — {coverageStatus.agentCount} field agent{coverageStatus.agentCount!==1?"s":""} in this area</>
              : <><AlertTriangle className="w-4 h-4"/>No agents in this ZIP yet — your order will be queued until one is available</>}
            </div>
          )}
        </section>

        {/* Sections below unlock after address */}
        <div className={unlocked ? "space-y-6" : "space-y-6 opacity-40 pointer-events-none select-none"}>

          {/* ── 2. Service ── */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
            <SectionHeader n="2" title="Select a service" sub="Predefined packages have fixed pricing and a set shot list — they cannot be altered. Need something specific? Choose Customize an Order and you set the price." done={unlocked && !!selectedSvc}/>
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {catalog.map(cat=>(
                <div key={cat.id}>
                  <button onClick={()=>setExpandedCategory(expandedCategory===cat.id?null:cat.id)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 text-sm font-bold text-[#0f1f3d]">
                    {cat.label}
                    {expandedCategory===cat.id?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}
                  </button>
                  {expandedCategory===cat.id&&(
                    <div className="divide-y divide-slate-50">
                      {cat.services.map(svc=>{
                        const p = svc.isCustom ? 0 : Math.round(svc.basePrice*(TIER_MULS[tier]??1));
                        const isSelected = selectedServiceId===svc.id;
                        return (
                          <button key={svc.id} onClick={()=>setSelectedServiceId(svc.id)}
                            className={`w-full flex items-start justify-between gap-3 px-4 py-3 text-left transition-colors ${isSelected?"bg-amber-50/60":"hover:bg-slate-50"}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {isSelected&&<div className="w-2 h-2 rounded-full bg-[#c8991a] flex-shrink-0"/>}
                                <span className="text-sm font-semibold text-slate-800">{svc.name}</span>
                                {svc.photoCount&&<span className="text-xs text-slate-400">{svc.photoCount} photos</span>}
                                {svc.requiresInterior&&<span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">Interior access</span>}
                                {svc.isCustom&&<span className="text-xs bg-[#0f1f3d] text-[#c8991a] px-1.5 py-0.5 rounded">You set the price</span>}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 ml-4">{svc.description}</p>
                              {svc.shotList&&isSelected&&(
                                <div className="mt-2 ml-4">
                                  <p className="text-xs font-semibold text-slate-600 mb-1">Photo breakdown you&apos;ll receive:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {svc.shotList.map((shot,i)=><span key={i} className="text-xs bg-[#0f1f3d]/5 text-[#0f1f3d] px-2 py-0.5 rounded-full">{shot}</span>)}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex-shrink-0 text-right">
                              {svc.isCustom ? <span className="text-xs text-slate-400">Your price</span>
                              : <span className="font-extrabold text-[#0f1f3d]">${p}</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selectedSvc?.isCustom&&(
              <div className="mt-4 space-y-3 p-4 bg-[#0f1f3d]/5 rounded-xl border border-[#0f1f3d]/15">
                <p className="text-sm font-bold text-[#0f1f3d]">Customize an Order</p>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Outline your photo requirements — exactly what you need</label>
                  <textarea value={customShotList} onChange={e=>setCustomShotList(e.target.value)} rows={4}
                    placeholder="E.g. Front of house, all 4 sides, interior living room, kitchen, master bedroom, basement, HVAC unit…"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a] resize-none"/>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Your Offered Price ($) *</label>
                  <div className="relative w-36">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                    <input type="number" min="1" value={customPrice} onChange={e=>setCustomPrice(e.target.value)} placeholder="150"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ── 3. Date stamp ── */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
            <SectionHeader n="3" title="Date stamp" done={unlocked}/>
            <label className="flex items-center gap-3 cursor-pointer p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 w-full sm:w-80">
              <input type="checkbox" checked={dateStamp} onChange={e=>setDateStamp(e.target.checked)} className="w-4 h-4 rounded border-slate-300 accent-[#c8991a]"/>
              <div>
                <p className="text-sm font-semibold text-slate-700">Add a date stamp to every photo</p>
                <p className="text-xs text-slate-400">The capture date is burned into each image</p>
              </div>
            </label>
          </section>

          {/* ── 4. Turnaround ── */}
          {!selectedSvc?.isCustom&&(
            <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
              <SectionHeader n="4" title="How soon do you need it?" sub="Orders placed before 10:00 AM (local time of the property) complete the next business day. Rush options carry an added fee." done={unlocked}/>
              <div className="grid sm:grid-cols-3 gap-3">
                {Object.entries(TIER_LABELS).map(([k,label])=>{
                  const p = selectedSvc ? Math.round(selectedSvc.basePrice*(TIER_MULS[k]??1)) : 0;
                  return (
                    <button key={k} type="button" onClick={()=>setTier(k)}
                      className={`p-3.5 rounded-xl border-2 text-left transition-all ${tier===k?"border-[#c8991a] bg-amber-50/60":"border-slate-200 bg-white hover:border-slate-300"}`}>
                      <div className="text-sm font-bold text-slate-800">{label}</div>
                      <div className="text-xl font-extrabold text-[#0f1f3d] mt-1">${p}</div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><Info className="w-3 h-3"/>{cutoffMsg}</p>
            </section>
          )}

          {/* ── 5. Access & comments ── */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
            <SectionHeader n={selectedSvc?.isCustom?"4":"5"} title="Access & comments" sub="If someone needs to be contacted for access, tell us who — and add any concerns in the comments" done={unlocked}/>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400"/>Access contact (optional)</label>
                <input value={accessContact} onChange={e=>setAccessContact(e.target.value)} placeholder="Name & phone — e.g. John (Tenant) 555-0123"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Comments (optional)</label>
                <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Gate code, dog on property, special instructions…"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
              </div>
            </div>
          </section>

          {/* ── Summary + submit ── */}
          <section className="bg-[#0f1f3d] rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <div>
                <p className="text-white font-bold">{selectedSvc?.isCustom ? "Customized Order" : selectedSvc?.name ?? "—"}</p>
                <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3"/>{selectedSvc?.isCustom ? "Reviewed & priced as offered" : TIER_LABELS[tier]}
                  <span className="mx-1">·</span><CreditCard className="w-3 h-3"/>Paid securely via Whop
                </p>
              </div>
              <div className="text-3xl font-extrabold text-[#c8991a]">${selectedSvc?.isCustom ? (customPrice||"0") : price}</div>
            </div>
            <button onClick={submitOrder} disabled={submitting||!unlocked}
              className="w-full bg-[#c8991a] hover:bg-[#f0b429] disabled:opacity-50 text-[#0f1f3d] font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
              {submitting ? "Submitting…" : selectedSvc?.isCustom
                ? <><FileText className="w-4 h-4"/>Submit Custom Order</>
                : <><CreditCard className="w-4 h-4"/>Pay &amp; Submit Order</>}
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-3">The nearest highest-rated field agent is dispatched within seconds of payment. Photos are delivered by email and stored in your portal for 30 days.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function PlaceOrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#eef1f6] flex items-center justify-center text-slate-400">Loading…</div>}>
      <PlaceOrderInner />
    </Suspense>
  );
}
