"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  MapPin, CheckCircle, Plus, Trash2, Package, ArrowLeft, Camera,
} from "lucide-react";

interface ServiceItem { id: string; name: string; description: string; basePrice: number; isCustom?: boolean; }
interface ServiceCategory { id: string; label: string; services: ServiceItem[]; }
interface PaymentLink { id: string; label: string; url: string; amount?: number; description: string; active: boolean; }

const TIER_MULS: Record<string,number> = { standard:1, rush_24hr:1.25, rush_6hr:1.75 };
const MAX_ROWS = 50;

export default function MultiOrderPage() {
  const [catalog, setCatalog] = useState<ServiceCategory[]>([]);
  const [rows, setRows] = useState([{address:"",serviceId:"re_main6",tier:"standard"}]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [done, setDone] = useState(false);
  const [placedCount, setPlacedCount] = useState(0);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);

  useEffect(() => {
    fetch("/api/services").then(r=>r.json()).then(d=>{ if(d.catalog) setCatalog(d.catalog); });
    fetch("/api/payment-links").then(r=>r.json()).then(d=>{ setPaymentLinks(d.links?.filter((l: PaymentLink) => l.active) ?? []); });
  }, []);

  const services = catalog.flatMap(c=>c.services).filter(s=>!s.isCustom);
  const validRows = rows.filter(r=>r.address.trim());
  const total = validRows.reduce((sum,r)=>{
    const svc = services.find(s=>s.id===r.serviceId);
    return sum + (svc ? Math.round(svc.basePrice*(TIER_MULS[r.tier]??1)) : 0);
  }, 0);

  function setRow(i: number, patch: Partial<{address:string;serviceId:string;tier:string}>) {
    setRows(rs=>rs.map((r,j)=>j===i?{...r,...patch}:r));
  }

  async function submitBulk() {
    if (!validRows.length) { setFormError("Add at least one address"); return; }
    setSubmitting(true); setFormError("");
    const r = await fetch("/api/orders", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ orders: validRows.map(row=>({ address:row.address, serviceId:row.serviceId, turnaroundTier:row.tier })) }),
    });
    if (!r.ok) { const d=await r.json(); setFormError(d.error??"Failed to submit"); setSubmitting(false); return; }
    setPlacedCount(validRows.length);
    setSubmitting(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#eef1f6]">
        <div className="max-w-xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="bg-[#0f1f3d] p-7 text-center">
              <div className="w-14 h-14 bg-[#c8991a] rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-7 h-7 text-[#0f1f3d]"/>
              </div>
              <h1 className="text-xl font-bold text-white mb-1">{placedCount} Order{placedCount!==1?"s":""} Submitted!</h1>
              <p className="text-slate-300 text-sm">Complete payment to activate them — agents dispatch the moment payment is confirmed.</p>
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
                <p className="text-sm text-slate-600 text-center">Your orders are pending payment confirmation. We&apos;ll email you as each one activates.</p>
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
      <header className="bg-[#0f1f3d] sticky top-0 z-20 shadow-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/client" className="flex items-center gap-2 text-slate-200 hover:text-white text-sm font-medium">
            <ArrowLeft className="w-4 h-4"/>Back to Dashboard
          </Link>
          <span className="text-white font-extrabold tracking-tight flex items-center gap-2"><Package className="w-4 h-4 text-[#c8991a]"/>Place Multi Orders</span>
          <Link href="/client/order" className="flex items-center gap-1.5 text-[#c8991a] hover:text-[#f0b429] text-sm font-semibold">
            <Camera className="w-4 h-4"/>Single Order
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="font-extrabold text-[#0f1f3d]">Bulk order entry</h1>
              <p className="text-xs text-slate-400 mt-0.5">Up to {MAX_ROWS} properties at once — one address, service, and turnaround per row</p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">{rows.length}/{MAX_ROWS} rows</span>
          </div>

          {formError&&<div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{formError}</div>}

          <div className="p-5 space-y-3">
            {rows.map((row,i)=>(
              <div key={i} className="flex gap-2 items-start p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-400 w-6 pt-2.5 text-right flex-shrink-0">{i+1}.</span>
                <div className="flex-1 grid sm:grid-cols-[1fr_220px_150px] gap-2">
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/>
                    <input value={row.address} onChange={e=>setRow(i,{address:e.target.value})}
                      placeholder={`Property address ${i+1}`}
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
                  </div>
                  <select value={row.serviceId} onChange={e=>setRow(i,{serviceId:e.target.value})}
                    className="px-2 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#c8991a]">
                    {services.map(s=><option key={s.id} value={s.id}>{s.basePrice.toFixed(2)} — {s.name}</option>)}
                  </select>
                  <select value={row.tier} onChange={e=>setRow(i,{tier:e.target.value})}
                    className="px-2 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#c8991a]">
                    <option value="standard">Next Business Day</option>
                    <option value="rush_24hr">24-Hour Rush (+25%)</option>
                    <option value="rush_6hr">6-Hour Rush (+75%)</option>
                  </select>
                </div>
                {rows.length>1&&<button onClick={()=>setRows(rs=>rs.filter((_,j)=>j!==i))} className="p-1.5 text-slate-400 hover:text-red-500 mt-1"><Trash2 className="w-4 h-4"/></button>}
              </div>
            ))}

            <button onClick={()=>setRows(rs=>[...rs,{address:"",serviceId:"re_main6",tier:"standard"}])} disabled={rows.length>=MAX_ROWS}
              className="flex items-center gap-1.5 text-sm text-[#0f1f3d] font-semibold disabled:opacity-40 hover:text-[#c8991a]">
              <Plus className="w-4 h-4"/>Add another property ({rows.length}/{MAX_ROWS})
            </button>
          </div>

          <div className="px-5 py-4 bg-[#0f1f3d] flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-white font-bold text-sm">{validRows.length} order{validRows.length!==1?"s":""} ready</p>
              <p className="text-slate-400 text-xs">Estimated total</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-extrabold text-[#c8991a]">${total.toFixed(2)}</span>
              <button onClick={submitBulk} disabled={submitting||validRows.length===0}
                className="bg-[#c8991a] hover:bg-[#f0b429] disabled:opacity-50 text-[#0f1f3d] font-extrabold px-5 py-3 rounded-xl flex items-center gap-2 transition-colors">
                {submitting?"Submitting…":<><Package className="w-4 h-4"/>Submit {validRows.length} Order{validRows.length!==1?"s":""}</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
