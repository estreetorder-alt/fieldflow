"use client";
import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  MapPin, CheckCircle, AlertCircle, AlertTriangle, ChevronDown, ChevronUp, ChevronRight,
  DollarSign, FileText, CreditCard, Info, ArrowLeft, Camera, Clock, User, Package,
  Home as HomeIcon, Settings2, Building2, BadgeCheck, Minus, Plus as PlusIcon,
} from "lucide-react";

interface ServiceItem { id: string; name: string; description: string; basePrice: number; category: string; photoCount?: number; shotList?: string[]; isCustom?: boolean; requiresInterior?: boolean; requiresAppointment?: boolean; }
interface ServiceCategory { id: string; label: string; services: ServiceItem[]; }
interface PaymentLink { id: string; label: string; url: string; amount?: number; description: string; active: boolean; }

const TIER_LABELS: Record<string,string> = { standard:"Next Business Day", rush_24hr:"24-Hour Rush (+25%)", rush_6hr:"6-Hour Rush (+75%)" };
const TIER_MULS: Record<string,number> = { standard:1, rush_24hr:1.25, rush_6hr:1.75 };
const CUSTOM_MIN = 23;
const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

const STEPS = ["ORDER TYPE","ADDRESS","DELIVERY","PHOTO SIZE & STAMP","COMMENTS / FILES","REVIEW & SUBMIT ORDER"];

const TAB_META: Record<string,{icon:React.ReactNode}> = {
  real_estate: { icon:<HomeIcon className="w-4 h-4"/> },
  custom: { icon:<Settings2 className="w-4 h-4"/> },
  site_inspections: { icon:<Building2 className="w-4 h-4"/> },
  agent_validate: { icon:<BadgeCheck className="w-4 h-4"/> },
};

const r2 = (n:number)=>Math.round(n*100)/100;

function PlaceOrderInner() {
  const searchParams = useSearchParams();

  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [catalog, setCatalog] = useState<ServiceCategory[]>([]);
  const [tab, setTab] = useState("real_estate");
  const [selectedServiceId, setSelectedServiceId] = useState("re_main6");

  // Custom order
  const [customPrice, setCustomPrice] = useState(CUSTOM_MIN);
  const [customAppt, setCustomAppt] = useState<"yes"|"no">("no");
  const [customDuties, setCustomDuties] = useState("");

  // Address
  const [street, setStreet] = useState("");
  const [unit, setUnit] = useState("");
  const [city, setCity] = useState("");
  const [stateAbbr, setStateAbbr] = useState("");
  const [zip, setZip] = useState("");
  const [checking, setChecking] = useState(false);
  const [addressValid, setAddressValid] = useState<boolean|null>(null);
  const [addressSuggestion, setAddressSuggestion] = useState("");
  const [coverageStatus, setCoverageStatus] = useState<{covered:boolean;agentCount:number}|null>(null);
  const [showIncentive, setShowIncentive] = useState(false);
  const [incentive, setIncentive] = useState(0);

  // Delivery / photo / comments
  const [tier, setTier] = useState("standard");
  const [photoSize, setPhotoSize] = useState<"standard"|"large">("standard");
  const [dateStamp, setDateStamp] = useState(false);
  const [accessContact, setAccessContact] = useState("");
  const [comments, setComments] = useState("");

  const [importantOpen, setImportantOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [cutoffMsg, setCutoffMsg] = useState("");
  const [placedOrderId, setPlacedOrderId] = useState<string|null>(null);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);

  const currentTab = catalog.find(c=>c.id===tab);
  const selectedSvc = catalog.flatMap(c=>c.services).find(s=>s.id===selectedServiceId);
  const isCustom = tab==="custom";
  const composedAddress = `${street.trim()}${unit.trim()?` ${unit.trim()}`:""}, ${city.trim()}, ${stateAbbr} ${zip.trim()}`;
  const basePrice = isCustom ? Math.max(customPrice, CUSTOM_MIN) : r2((selectedSvc?.basePrice ?? 0)*(TIER_MULS[tier]??1));
  const total = r2(basePrice + incentive);

  useEffect(() => {
    fetch("/api/services").then(r=>r.json()).then(d=>{ if(d.catalog) setCatalog(d.catalog); });
    fetch("/api/payment-links").then(r=>r.json()).then(d=>{ setPaymentLinks(d.links?.filter((l: PaymentLink) => l.active) ?? []); });
    const h = new Date().getHours();
    setCutoffMsg(h < 10
      ? "Orders placed before 10:00 AM (local time of the property) complete the next business day."
      : "Placed after 10:00 AM — standard orders complete in 2 business days.");
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

  const checkAddress = useCallback(async () => {
    if (!street.trim() || !city.trim() || !stateAbbr || !zip.trim()) { setFormError("Fill in street, city, state and ZIP first"); return; }
    setFormError(""); setChecking(true); setAddressValid(null); setCoverageStatus(null);
    try {
      const r = await fetch("/api/validate-address", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({address:composedAddress}) });
      const d = await r.json();
      setAddressValid(d.valid);
      if (d.suggestion) setAddressSuggestion(d.suggestion);
      const cr = await fetch("/api/coverage-check", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({zip:zip.trim()}) });
      const cd = await cr.json();
      setCoverageStatus({covered:cd.covered, agentCount:cd.agentCount});
    } finally { setChecking(false); }
  }, [street, city, stateAbbr, zip, composedAddress]);

  function goTo(n: number) { setStep(n); setMaxStep(m=>Math.max(m,n)); window.scrollTo({top:0,behavior:"smooth"}); }

  function canLeaveStep(n: number): string | null {
    if (n===0) {
      if (isCustom) {
        if (!customDuties.trim()) return "Describe the exact duties for your custom order";
        if (customPrice < CUSTOM_MIN) return `Custom orders have a $${CUSTOM_MIN}.00 minimum`;
        return null;
      }
      return selectedSvc && !selectedSvc.isCustom ? null : "Choose a service to continue";
    }
    if (n===1) {
      if (!street.trim()||!city.trim()||!stateAbbr||!zip.trim()) return "Complete the address fields";
      if (addressValid===null) return "Click CHECK ADDRESS to verify the property first";
      return null;
    }
    return null;
  }

  function next() {
    const err = canLeaveStep(step);
    if (err) { setFormError(err); return; }
    setFormError("");
    goTo(step+1);
  }

  async function submitOrder() {
    setFormError(""); setSubmitting(true);

    const noteParts: string[] = [];
    if (accessContact.trim()) noteParts.push(`Access contact: ${accessContact.trim()}`);
    if (isCustom && customAppt==="yes") noteParts.push("APPOINTMENT REQUIRED — schedule with the contact above before entry");
    if (selectedSvc?.requiresAppointment) noteParts.push("APPOINTMENT REQUIRED for this service");
    if (photoSize==="large") noteParts.push("Photo size: Large (full resolution)");
    if (incentive>0) noteParts.push(`Mileage/Toll incentive: $${incentive.toFixed(2)} (added by client)`);
    if (comments.trim()) noteParts.push(comments.trim());

    const orderData = {
      address: composedAddress,
      serviceId: isCustom ? "custom_order" : selectedServiceId,
      turnaroundTier: isCustom ? "standard" : tier,
      notes: noteParts.join(" | "),
      dateStamp,
      ...(isCustom ? { customShotList: customDuties, customClientPrice: Math.max(customPrice, CUSTOM_MIN) } : {}),
    };

    if (!isCustom) {
      const whopRes = await fetch("/api/whop", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ orderData, totalPrice: total, description: `${selectedSvc?.name} — ${composedAddress}` }),
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

  const isExteriorRE = !!selectedSvc && selectedSvc.category==="real_estate" && !!selectedSvc.photoCount && !selectedSvc.requiresInterior;

  return (
    <div className="min-h-screen bg-[#eef1f6]">
      <header className="bg-[#0f1f3d] sticky top-0 z-20 shadow-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/client" className="flex items-center gap-2 text-slate-200 hover:text-white text-sm font-medium">
            <ArrowLeft className="w-4 h-4"/>Back to Dashboard
          </Link>
          <span className="text-white font-extrabold tracking-tight flex items-center gap-2"><Camera className="w-4 h-4 text-[#c8991a]"/>Place An Order</span>
          <Link href="/client/multi-order" className="flex items-center gap-1.5 text-[#c8991a] hover:text-[#f0b429] text-sm font-semibold">
            <Package className="w-4 h-4"/>Multi Orders
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Payment-required banner */}
        <div className="bg-white border-2 border-[#0f1f3d] rounded-xl px-4 py-3">
          <p className="text-sm font-bold text-[#0f1f3d]">Payment for any orders entered today will be required before they are processed.</p>
          <p className="text-xs text-slate-500 mt-0.5">Add your order below, then complete payment at checkout — you will require a valid credit card.</p>
        </div>

        {/* Stepper */}
        <div className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {STEPS.map((label,i)=>(
              <button key={label} onClick={()=>{ if(i<=maxStep) goTo(i); }} disabled={i>maxStep}
                className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                  i===step ? "bg-[#0f1f3d] text-[#c8991a]" : i<=maxStep ? "text-[#0f1f3d] hover:bg-slate-100" : "text-slate-300"
                }`}>
                {i+1}. {label}
                {i<STEPS.length-1 && <ChevronRight className="w-3 h-3 opacity-40"/>}
              </button>
            ))}
          </div>
        </div>

        {/* Important collapsible */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <button onClick={()=>setImportantOpen(!importantOpen)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50">
            <span className="flex items-center gap-2 text-sm font-bold text-[#0f1f3d]"><AlertTriangle className="w-4 h-4 text-[#c8991a]"/>Important — read before ordering</span>
            {importantOpen?<ChevronUp className="w-4 h-4 text-slate-400"/>:<ChevronDown className="w-4 h-4 text-slate-400"/>}
          </button>
          {importantOpen&&(
            <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed space-y-2 border-t border-slate-100 pt-3">
              <p>Once you place an order, we will typically allocate a field agent to it within a few minutes. After the field agent accepts the order, you are <strong>unable to modify it</strong>. Once an order has been accepted, we are <strong>unable to cancel it</strong>.</p>
              <p>Each order generates a specific set of instructions (a &quot;Work Order&quot;) sent to our field agents. Attempts to alter these will create conflicts with those instructions — orders with conflicting instructions may be terminated. Predefined orders are executed exactly as stated in the work order and will <strong>not</strong> include any image or requirement mentioned only in the comments section.</p>
              <p>Due to safety and legal considerations, we are unable to access private property for any scheduled exterior work. All photographs will solely be taken from public property.</p>
            </div>
          )}
        </div>

        {formError&&<div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{formError}</div>}

        {/* ── STEP 1: ORDER TYPE ── */}
        {step===0&&(
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
            <h1 className="text-lg font-extrabold text-[#0f1f3d] mb-4">1. Choose Order Type</h1>

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
                <p className="text-xs text-slate-500 mb-3">All services listed below cannot in any way be modified. Once an order has been processed, a &quot;Work Order&quot; will be sent to the field agent giving them instructions as stated in the description of the order. If you need a service that is not listed below, please use a <button onClick={()=>setTab("custom")} className="text-[#c8991a] font-semibold underline">Custom Order</button>.</p>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{currentTab?.label} Services</label>
                <div className="relative">
                  <select value={currentTab?.services.some(s=>s.id===selectedServiceId)?selectedServiceId:""} onChange={e=>setSelectedServiceId(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c8991a] appearance-none font-medium text-[#0f1f3d]">
                    <option value="" disabled>Choose the Service</option>
                    {currentTab?.services.map(s=>(
                      <option key={s.id} value={s.id}>{s.basePrice.toFixed(2)}&nbsp;&nbsp;{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"/>
                </div>

                {/* Work order preview */}
                {selectedSvc && currentTab?.services.some(s=>s.id===selectedSvc.id) && (
                  <div className="mt-5 text-sm text-slate-700 space-y-3">
                    <p className="font-bold text-[#0f1f3d]">{selectedSvc.name}</p>
                    {selectedSvc.requiresAppointment&&(
                      <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/>Requires appointment — provide the contact&apos;s name &amp; phone in step 5</p>
                    )}
                    {selectedSvc.shotList ? (
                      <>
                        <p className="font-semibold">This Work Order will include:</p>
                        <ul className="list-disc ml-5 space-y-1 text-xs text-slate-600">
                          {selectedSvc.shotList.map((shot,i)=><li key={i}>1 photo — {shot}</li>)}
                        </ul>
                        <p className="text-xs font-bold text-slate-700">THERE ARE NO SUBSTITUTIONS.</p>
                        <p className="text-xs text-slate-400">* If there is no address on the property or mailbox, we will add a photo of the neighbor&apos;s address to prove the proximity.</p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-600">{selectedSvc.description}</p>
                    )}
                    {isExteriorRE&&(
                      <div className="text-xs text-slate-600 border-t border-slate-100 pt-3">
                        <p className="font-bold text-[#0f1f3d] mb-1">GATED OR GUARDED COMMUNITIES</p>
                        <p className="mb-2">Please leave a gate code in the comments section. We will not make phone calls to access any exterior order. If our field agent is not able to gain access, your order will include:</p>
                        <ul className="list-disc ml-5 space-y-0.5">
                          <li>1 photo of the closed gate</li>
                          <li>1 photo of the community sign</li>
                          <li>1 photo of the adjacent street scene to the right</li>
                          <li>1 photo of the adjacent street scene to the left</li>
                          <li>1 photo of the street sign on the adjacent street</li>
                          <li>Two additional community images (guard house, landscape, etc.)</li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <ul className="list-disc ml-5 text-xs text-slate-600 space-y-1.5 mb-4">
                  <li>Kindly provide a payout and the <strong>specific</strong> requirements for your order. Please refrain from vague phrases such as &quot;a typical exterior set&quot; or &quot;several photos.&quot;</li>
                  <li>We will not permit a field agent to access any occupied property without obtaining consent from the resident.</li>
                  <li>We will not allow a field agent to enter properties that are unsecured (unlocked), infested with rodents, damaged by fire, or that pose respiratory or safety risks.</li>
                  <li>We will not allow a field agent to enter crawl spaces, access roofs, or operate circuit breakers in electrical panel boxes.</li>
                  <li>We understand the distinction between a reasonable rate and one that might offend our field agent. We reserve the right to reject any rate we consider unsuitable.</li>
                </ul>

                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Price</label>
                <div className="flex items-center gap-2 mb-1">
                  <button onClick={()=>setCustomPrice(p=>Math.max(CUSTOM_MIN, r2(p-1)))} className="w-9 h-9 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-50"><Minus className="w-4 h-4"/></button>
                  <div className="relative w-32">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                    <input type="number" min={CUSTOM_MIN} step="0.25" value={customPrice}
                      onChange={e=>setCustomPrice(Number(e.target.value))}
                      onBlur={()=>setCustomPrice(p=>Math.max(CUSTOM_MIN, r2(p)))}
                      className="w-full pl-8 pr-2 py-2 border border-slate-300 rounded-lg text-sm font-bold text-[#0f1f3d] focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
                  </div>
                  <button onClick={()=>setCustomPrice(p=>r2(p+1))} className="w-9 h-9 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-50"><PlusIcon className="w-4 h-4"/></button>
                  <span className="text-xs text-slate-400">(Minimum of ${CUSTOM_MIN.toFixed(2)})</span>
                </div>

                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-800 mb-3">
                  <strong>Important:</strong> Is it necessary for the field agent to reach out to the property owner or occupant to schedule a date/time for entry? If so, kindly provide their name and phone number in the duties box below.
                </div>
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <span className="font-semibold text-slate-700">Appointment Required?</span>
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" checked={customAppt==="yes"} onChange={()=>setCustomAppt("yes")} className="accent-[#c8991a]"/>Yes</label>
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" checked={customAppt==="no"} onChange={()=>setCustomAppt("no")} className="accent-[#c8991a]"/>No</label>
                </div>

                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Duties</label>
                <textarea value={customDuties} onChange={e=>setCustomDuties(e.target.value)} rows={6}
                  placeholder="Specify the exact duties you want performed for this order. Include any lockbox codes or access / contact details."
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
              </>
            )}

            <div className="flex justify-end mt-6">
              <button onClick={next} className="bg-[#0f1f3d] hover:bg-[#1a3260] text-[#c8991a] font-extrabold text-sm px-6 py-3 rounded-xl flex items-center gap-2">Next Step <ChevronRight className="w-4 h-4"/></button>
            </div>
          </div>
        )}

        {/* ── STEP 2: ADDRESS ── */}
        {step===1&&(
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
            <h1 className="text-lg font-extrabold text-[#0f1f3d] mb-4">2. Enter the Address</h1>
            <div className="grid sm:grid-cols-[1fr_120px] gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Street</label>
                <input value={street} onChange={e=>{setStreet(e.target.value);setAddressValid(null);}} placeholder="132 Mabeline Rd"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Unit #</label>
                <input value={unit} onChange={e=>setUnit(e.target.value)} placeholder=""
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
              </div>
            </div>
            <div className="grid sm:grid-cols-[1fr_110px_130px] gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">City</label>
                <input value={city} onChange={e=>{setCity(e.target.value);setAddressValid(null);}} placeholder="Saint George"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">State</label>
                <select value={stateAbbr} onChange={e=>{setStateAbbr(e.target.value);setAddressValid(null);}}
                  className="w-full px-2 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c8991a]">
                  <option value="">—</option>
                  {STATES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">ZIP</label>
                <input value={zip} onChange={e=>{setZip(e.target.value.replace(/\D/g,"").slice(0,5));setAddressValid(null);}} placeholder="29477"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
              </div>
            </div>

            <button onClick={checkAddress} disabled={checking}
              className="mt-4 bg-[#0f1f3d] hover:bg-[#1a3260] disabled:opacity-50 text-white font-bold text-sm px-5 py-2.5 rounded-xl flex items-center gap-2">
              {checking?<span className="w-4 h-4 border-2 border-[#c8991a] border-t-transparent rounded-full animate-spin"/>:<MapPin className="w-4 h-4 text-[#c8991a]"/>}Check Address
            </button>

            {addressValid===true&&(
              <div className="mt-3 space-y-2">
                <p className="flex items-center gap-1.5 text-sm text-green-700 font-semibold"><CheckCircle className="w-4 h-4"/>OK. We located the property</p>
                <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                  {addressSuggestion&&<p><span className="font-semibold text-slate-600">We found:</span> {addressSuggestion}</p>}
                  <p className="mt-0.5"><span className="font-semibold text-slate-600">Your input address:</span> {composedAddress}</p>
                </div>
              </div>
            )}
            {addressValid===false&&(
              <p className="mt-3 flex items-center gap-1.5 text-sm text-red-600"><AlertCircle className="w-4 h-4"/>We could not locate that address — check spelling and ZIP. You can still continue if you&apos;re sure it&apos;s correct.</p>
            )}
            {coverageStatus&&(
              <div className={`mt-3 flex items-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-xl ${coverageStatus.covered?"bg-green-50 text-green-700 border border-green-200":"bg-amber-50 text-amber-700 border border-amber-200"}`}>
                {coverageStatus.covered ? <><CheckCircle className="w-4 h-4"/>We have located {coverageStatus.agentCount} field agent{coverageStatus.agentCount!==1?"s":""} covering this ZIP</>
                : <><AlertTriangle className="w-4 h-4"/>No agents in this ZIP yet — your order will be queued until one is available</>}
              </div>
            )}

            {/* Incentive payment */}
            <div className="mt-5 border-t border-slate-100 pt-4">
              <button onClick={()=>setShowIncentive(!showIncentive)} className="text-sm font-bold text-[#0f1f3d] flex items-center gap-1.5 hover:text-[#c8991a]">
                <PlusIcon className="w-4 h-4"/>Incentive Payment {incentive>0&&<span className="text-[#c8991a]">(${incentive.toFixed(2)})</span>}
              </button>
              {showIncentive&&(
                <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Mileage/Toll Incentive Payment</p>
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={()=>setIncentive(v=>Math.max(0,r2(v-1.25)))} className="w-9 h-9 rounded-lg border border-slate-300 bg-white flex items-center justify-center hover:bg-slate-50"><Minus className="w-4 h-4"/></button>
                    <div className="relative w-28">
                      <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                      <input type="number" min="0" step="0.25" value={incentive}
                        onChange={e=>setIncentive(Math.max(0,Number(e.target.value)))}
                        className="w-full pl-8 pr-2 py-2 border border-slate-300 rounded-lg text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
                    </div>
                    <button onClick={()=>setIncentive(v=>r2(v+1.25))} className="w-9 h-9 rounded-lg border border-slate-300 bg-white flex items-center justify-center hover:bg-slate-50"><PlusIcon className="w-4 h-4"/></button>
                    <span className="text-xs text-slate-500">Optional — added to the field agent&apos;s payout</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">Field agents typically accept requests within 7 miles of their location. If the nearest agent is further out, an incentive of <strong>$1.25 per mile over 7</strong> greatly increases the likelihood of your order being accepted quickly — e.g., an address 10 miles from the nearest agent → a $3.75 incentive. Rural or low-coverage ZIPs may be declined without one.</p>
                </div>
              )}
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={()=>goTo(0)} className="text-slate-500 font-semibold text-sm px-4 py-3 hover:text-[#0f1f3d]">← Back</button>
              <button onClick={next} className="bg-[#0f1f3d] hover:bg-[#1a3260] text-[#c8991a] font-extrabold text-sm px-6 py-3 rounded-xl flex items-center gap-2">Next Step <ChevronRight className="w-4 h-4"/></button>
            </div>
          </div>
        )}

        {/* ── STEP 3: DELIVERY ── */}
        {step===2&&(
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
            <h1 className="text-lg font-extrabold text-[#0f1f3d] mb-1">3. Delivery — how soon do you need it?</h1>
            <p className="text-xs text-slate-500 mb-4 flex items-center gap-1"><Info className="w-3.5 h-3.5"/>{cutoffMsg} Rush options are available for an additional fee. Specific times of day are not guaranteed.</p>
            {isCustom ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600">
                Custom orders run on <strong>standard delivery</strong> (next business day when accepted before 10 AM local). Mention any timing needs in your duties — agents see them before accepting.
              </div>
            ) : (
              <div className="grid sm:grid-cols-3 gap-3">
                {Object.entries(TIER_LABELS).map(([k,label])=>{
                  const p = r2((selectedSvc?.basePrice ?? 0)*(TIER_MULS[k]??1) + incentive);
                  return (
                    <button key={k} type="button" onClick={()=>setTier(k)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${tier===k?"border-[#c8991a] bg-amber-50/60":"border-slate-200 bg-white hover:border-slate-300"}`}>
                      <div className="text-sm font-bold text-slate-800">{label}</div>
                      <div className="text-xl font-extrabold text-[#0f1f3d] mt-1">${p.toFixed(2)}</div>
                      {k==="rush_6hr"&&<div className="text-[10px] text-slate-400 mt-0.5">Weekday daylight completion</div>}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex justify-between mt-6">
              <button onClick={()=>goTo(1)} className="text-slate-500 font-semibold text-sm px-4 py-3 hover:text-[#0f1f3d]">← Back</button>
              <button onClick={next} className="bg-[#0f1f3d] hover:bg-[#1a3260] text-[#c8991a] font-extrabold text-sm px-6 py-3 rounded-xl flex items-center gap-2">Next Step <ChevronRight className="w-4 h-4"/></button>
            </div>
          </div>
        )}

        {/* ── STEP 4: PHOTO SIZE & STAMP ── */}
        {step===3&&(
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
            <h1 className="text-lg font-extrabold text-[#0f1f3d] mb-4">4. Photo Size &amp; Stamp</h1>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Photo size</label>
            <div className="grid sm:grid-cols-2 gap-3 mb-5">
              {[{v:"standard",label:"Standard",desc:"Optimized ~1024px — ideal for BPO forms and reports"},{v:"large",label:"Large — Full Resolution",desc:"Original full-resolution files as captured"}].map(o=>(
                <button key={o.v} onClick={()=>setPhotoSize(o.v as "standard"|"large")}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${photoSize===o.v?"border-[#c8991a] bg-amber-50/60":"border-slate-200 bg-white hover:border-slate-300"}`}>
                  <div className="text-sm font-bold text-slate-800">{o.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{o.desc}</div>
                </button>
              ))}
            </div>
            <label className="flex items-center gap-3 cursor-pointer p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 w-full sm:w-96">
              <input type="checkbox" checked={dateStamp} onChange={e=>setDateStamp(e.target.checked)} className="w-4 h-4 rounded border-slate-300 accent-[#c8991a]"/>
              <div>
                <p className="text-sm font-semibold text-slate-700">Add a date stamp to every photo</p>
                <p className="text-xs text-slate-400">The capture date is burned into each image</p>
              </div>
            </label>
            <div className="flex justify-between mt-6">
              <button onClick={()=>goTo(2)} className="text-slate-500 font-semibold text-sm px-4 py-3 hover:text-[#0f1f3d]">← Back</button>
              <button onClick={next} className="bg-[#0f1f3d] hover:bg-[#1a3260] text-[#c8991a] font-extrabold text-sm px-6 py-3 rounded-xl flex items-center gap-2">Next Step <ChevronRight className="w-4 h-4"/></button>
            </div>
          </div>
        )}

        {/* ── STEP 5: COMMENTS / FILES ── */}
        {step===4&&(
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
            <h1 className="text-lg font-extrabold text-[#0f1f3d] mb-1">5. Comments / Files</h1>
            <p className="text-xs text-slate-500 mb-4">Gate codes, lockbox codes, dog on property, parking notes — anything the field agent should know. <strong>Reminder:</strong> comments cannot add photo requirements to a predefined order.</p>
            <div className="grid sm:grid-cols-2 gap-4 mb-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400"/>Access contact {selectedSvc?.requiresAppointment||customAppt==="yes"?<span className="text-red-500 font-bold">*</span>:<span className="text-slate-400">(optional)</span>}</label>
                <input value={accessContact} onChange={e=>setAccessContact(e.target.value)} placeholder="Name & phone — e.g. John (Tenant) 555-0123"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Comments (optional)</label>
                <textarea value={comments} onChange={e=>setComments(e.target.value)} rows={3} placeholder="Gate code 4471, beware of dog in rear yard…"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1"><FileText className="w-3 h-3"/>File attachments are coming soon — for now include any document details in the comments.</p>
            <div className="flex justify-between mt-6">
              <button onClick={()=>goTo(3)} className="text-slate-500 font-semibold text-sm px-4 py-3 hover:text-[#0f1f3d]">← Back</button>
              <button onClick={()=>{ if((selectedSvc?.requiresAppointment||customAppt==="yes")&&!accessContact.trim()){setFormError("An access contact (name & phone) is required for appointment services");return;} setFormError(""); goTo(5); }}
                className="bg-[#0f1f3d] hover:bg-[#1a3260] text-[#c8991a] font-extrabold text-sm px-6 py-3 rounded-xl flex items-center gap-2">Next Step <ChevronRight className="w-4 h-4"/></button>
            </div>
          </div>
        )}

        {/* ── STEP 6: REVIEW & SUBMIT ── */}
        {step===5&&(
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-5 sm:p-6">
              <h1 className="text-lg font-extrabold text-[#0f1f3d] mb-4">6. Review &amp; Submit Order</h1>
              <div className="divide-y divide-slate-100 text-sm">
                {[
                  ["Service", isCustom ? `Customized Order — ${customAppt==="yes"?"appointment required":"no appointment"}` : selectedSvc?.name ?? "—"],
                  ["Property", composedAddress],
                  ["Delivery", isCustom ? "Standard (next business day)" : TIER_LABELS[tier]],
                  ["Photo size", photoSize==="large" ? "Large — full resolution" : "Standard"],
                  ["Date stamp", dateStamp ? "Yes" : "No"],
                  ...(accessContact.trim()?[["Access contact",accessContact.trim()]]:[]),
                  ...(incentive>0?[["Mileage/toll incentive",`$${incentive.toFixed(2)}`]]:[]),
                  ...(isCustom?[["Duties",customDuties||"—"]]:[]),
                  ...(comments.trim()?[["Comments",comments.trim()]]:[]),
                ].map(([k,v])=>(
                  <div key={k as string} className="py-2.5 grid grid-cols-[140px_1fr] gap-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-0.5">{k}</span>
                    <span className="text-slate-700">{v}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">By submitting you acknowledge: once a field agent accepts this order it cannot be modified or cancelled; predefined work orders are executed exactly as stated; all exterior photography is taken from public property.</p>
            </div>
            <div className="px-5 sm:px-6 py-4 bg-[#0f1f3d] flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-slate-400 text-xs">Total due now</p>
                <p className="text-3xl font-extrabold text-[#c8991a]">${(isCustom?r2(Math.max(customPrice,CUSTOM_MIN)+incentive):total).toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={()=>goTo(4)} className="text-slate-300 font-semibold text-sm px-3 py-3 hover:text-white">← Back</button>
                <button onClick={submitOrder} disabled={submitting}
                  className="bg-[#c8991a] hover:bg-[#f0b429] disabled:opacity-50 text-[#0f1f3d] font-extrabold px-6 py-3.5 rounded-xl flex items-center gap-2 transition-colors">
                  {submitting ? "Submitting…" : isCustom
                    ? <><FileText className="w-4 h-4"/>Submit Custom Order</>
                    : <><CreditCard className="w-4 h-4"/>Pay &amp; Submit Order</>}
                </button>
              </div>
            </div>
          </div>
        )}
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
