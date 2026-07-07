"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  LogOut, Plus, Camera, Clock, CheckCircle, RefreshCw, XCircle, MapPin,
  DollarSign, FileText, X, Wifi, WifiOff, ChevronRight, Zap, Package,
  List, Trash2, Mail, Download, Image, Square, CheckSquare, Gavel, User,
  Search, AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp,
  CreditCard, Star, Shield, Users,
} from "lucide-react";

interface Photo { id: string; filename: string; url: string; description: string; selectedByClient: boolean; }
interface Bid { id: string; agentId: string; agentName: string; agentRating: number | null; amount: number; message: string; placedAt: string; status: string; placedByAdmin?: boolean; }
interface Order {
  id: string; address: string; status: string; totalPrice: number; compensationAmount: number;
  serviceType: string; turnaroundTier: string; notes: string; customizeNotes: string;
  photos: Photo[]; photoExpiresAt: string | null; createdAt: string; invoicePaid: boolean;
  agent?: { name: string } | null; bids?: Bid[]; acceptedBidId?: string | null;
}
interface ServiceItem { id: string; name: string; description: string; basePrice: number; compensation: number; category: string; photoCount?: number; shotList?: string[]; isCustom?: boolean; requiresInterior?: boolean; }
interface ServiceCategory { id: string; label: string; services: ServiceItem[]; }
interface SubAccount { id: string; name: string; email: string; createdAt: string; }
interface PaymentLink { id: string; label: string; url: string; amount?: number; description: string; active: boolean; }

const STATUS_COLORS: Record<string,string> = { under_review:"bg-purple-100 text-purple-700 border-purple-200", pending:"bg-amber-100 text-amber-700 border-amber-200", in_progress:"bg-blue-100 text-blue-700 border-blue-200", completed:"bg-green-100 text-green-700 border-green-200", cancelled:"bg-red-100 text-red-700 border-red-200" };
const STATUS_ICONS: Record<string,React.ReactNode> = { under_review:<Clock className="w-3.5 h-3.5"/>, pending:<Clock className="w-3.5 h-3.5"/>, in_progress:<RefreshCw className="w-3.5 h-3.5"/>, completed:<CheckCircle className="w-3.5 h-3.5"/>, cancelled:<XCircle className="w-3.5 h-3.5"/> };
const TIER_LABELS: Record<string,string> = { standard:"Next Business Day", rush_24hr:"24-Hour Rush (+25%)", rush_6hr:"6-Hour Rush (+75%)" };
const TIER_MULS: Record<string,number> = { standard:1, rush_24hr:1.25, rush_6hr:1.75 };

function getPhotoExpiryDays(photoExpiresAt: string | null): number | null {
  if (!photoExpiresAt) return null;
  const diff = new Date(photoExpiresAt).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86400000);
}

function calcPrice(svc: ServiceItem | undefined, tier: string, customPrice?: number): number {
  if (!svc) return 0;
  if (svc.isCustom) return customPrice ?? 0;
  return Math.round(svc.basePrice * (TIER_MULS[tier] ?? 1));
}

function ClientPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [userName, setUserName] = useState("Client");
  const [userId, setUserId] = useState("");
  const [liveConnected, setLiveConnected] = useState(false);
  const esRef = useRef<EventSource|null>(null);
  const [tab, setTab] = useState<"orders"|"subaccounts">("orders");

  // Service catalog
  const [catalog, setCatalog] = useState<ServiceCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("ext_7");
  const [expandedCategory, setExpandedCategory] = useState<string|null>("bpo_exterior");

  // Order form
  const [address, setAddress] = useState("");
  const [tier, setTier] = useState("standard");
  const [notes, setNotes] = useState("");
  const [dateStamp, setDateStamp] = useState(false);
  const [customShotList, setCustomShotList] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [repeatOrder, setRepeatOrder] = useState<Order | null>(null);
  const [formError, setFormError] = useState("");

  // Address validation
  const [validatingAddress, setValidatingAddress] = useState(false);
  const [addressValid, setAddressValid] = useState<boolean|null>(null);
  const [addressSuggestion, setAddressSuggestion] = useState("");
  const [addrLat, setAddrLat] = useState<number|null>(null);
  const [addrLng, setAddrLng] = useState<number|null>(null);
  const [coverageStatus, setCoverageStatus] = useState<{covered:boolean;agentCount:number}|null>(null);

  // Cutoff info
  const [cutoffMsg, setCutoffMsg] = useState("");
  const [localHour, setLocalHour] = useState(0);

  // Bulk mode
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkRows, setBulkRows] = useState([{address:"",serviceId:"ext_7",tier:"standard"}]);

  // Photo / bids
  const [expandedPhotos, setExpandedPhotos] = useState<string|null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Record<string,Set<string>>>({});
  const [emailingOrder, setEmailingOrder] = useState<string|null>(null);
  const [bidsFor, setBidsFor] = useState<string|null>(null);
  const [bidsData, setBidsData] = useState<Record<string,Bid[]>>({});
  const [actingBid, setActingBid] = useState<string|null>(null);

  // Payment links
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [showPaymentLinks, setShowPaymentLinks] = useState<string | null>(null);

  // Sub-accounts
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [showAddSub, setShowAddSub] = useState(false);
  const [subForm, setSubForm] = useState({name:"",email:"",password:""});
  const [addingSub, setAddingSub] = useState(false);
  const [subError, setSubError] = useState("");

  // Payment success banner
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const selectedSvc = catalog.flatMap(c=>c.services).find(s=>s.id===selectedServiceId);
  const price = calcPrice(selectedSvc, tier, selectedSvc?.isCustom ? Number(customPrice) : undefined);

  // Load catalog
  useEffect(() => {
    fetch("/api/services").then(r=>r.json()).then(d=>{ if(d.catalog) setCatalog(d.catalog); });
  }, []);

  // Cutoff rule
  useEffect(() => {
    const h = new Date().getHours();
    setLocalHour(h);
    setCutoffMsg(h < 10
      ? "Before 10 AM — standard orders complete next business day"
      : "After 10 AM — standard orders complete in 2 business days"
    );
  }, []);

  // Check payment success param
  useEffect(() => {
    if (searchParams.get("payment") === "success") {
      setPaymentSuccess(true);
      setTimeout(() => setPaymentSuccess(false), 6000);
    }
  }, [searchParams]);

  const fetchBids = useCallback(async (orderId: string) => {
    const r = await fetch(`/api/orders/${orderId}/bids`);
    const d = await r.json();
    setBidsData(prev=>({...prev,[orderId]:d.bids??[]}));
  }, []);

  const fetchSubAccounts = useCallback(async () => {
    const r = await fetch("/api/sub-accounts");
    const d = await r.json();
    setSubAccounts(d.subAccounts??[]);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me").then(r=>r.json()).then(d=>{ if(d.user){ setUserName(d.user.name); setUserId(d.user.id); } });
    fetch("/api/payment-links").then(r=>r.json()).then(d=>{ setPaymentLinks(d.links?.filter((l: PaymentLink) => l.active) ?? []); });
    const es = new EventSource("/api/events");
    esRef.current = es;
    es.addEventListener("connected",()=>setLiveConnected(true));
    es.addEventListener("orders",(e)=>{ setOrders(JSON.parse(e.data) as Order[]); setLoading(false); });
    es.onerror=()=>setLiveConnected(false);
    return ()=>{ es.close(); };
  }, []);

  useEffect(() => { if(tab==="subaccounts") fetchSubAccounts(); }, [tab, fetchSubAccounts]);

  // Address validation + coverage check
  async function validateAddress(addr: string) {
    if (!addr.trim() || addr.length < 10) return;
    setValidatingAddress(true); setAddressValid(null); setCoverageStatus(null);
    try {
      const r = await fetch("/api/validate-address", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({address:addr}) });
      const d = await r.json();
      setAddressValid(d.valid);
      if (d.suggestion) setAddressSuggestion(d.suggestion);
      if (d.lat) setAddrLat(d.lat);
      if (d.lng) setAddrLng(d.lng);

      // Coverage check
      const zipMatch = addr.match(/\b(\d{5})\b/);
      if (zipMatch) {
        const cr = await fetch("/api/coverage-check", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({zip:zipMatch[1]}) });
        const cd = await cr.json();
        setCoverageStatus({covered:cd.covered, agentCount:cd.agentCount});
      }
    } finally { setValidatingAddress(false); }
  }

  async function submitOrder() {
    if (!address.trim()) { setFormError("Address is required"); return; }
    if (!selectedSvc) { setFormError("Select a service"); return; }
    if (selectedSvc.isCustom && !customPrice) { setFormError("Enter your offered price for this custom order"); return; }
    setFormError(""); setSubmitting(true);

    const orderData = {
      address, serviceId: selectedServiceId, turnaroundTier: tier,
      notes, dateStamp,
      ...(selectedSvc.isCustom ? { customShotList, customClientPrice: Number(customPrice) } : {}),
      lat: addrLat, lng: addrLng,
    };

    // Try Stripe if configured
    if (!selectedSvc.isCustom) {
      const stripeRes = await fetch("/api/stripe", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ orderData, totalPrice: price, description: `${selectedSvc.name} — ${address}` }),
      });
      const stripeData = await stripeRes.json();
      if (stripeData.url) {
        window.location.href = stripeData.url;
        return;
      }
      // skip=true means Stripe not configured, fall through
    }

    const r = await fetch("/api/orders", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(orderData),
    });
    const d = await r.json();
    if (!r.ok) { setFormError(d.error ?? "Failed to submit"); setSubmitting(false); return; }
    setShowNewOrder(false); resetForm(); setSubmitting(false);
    // Show payment links modal if any active
    if (paymentLinks.length > 0) {
      setShowPaymentLinks(d.order?.id ?? "new");
    }
  }

  async function submitBulk() {
    const valid = bulkRows.filter(r=>r.address.trim());
    if (!valid.length) { setFormError("Add at least one address"); return; }
    setSubmitting(true); setFormError("");
    const r = await fetch("/api/orders", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ orders: valid.map(row=>({ address:row.address, serviceId:row.serviceId, turnaroundTier:row.tier })) }),
    });
    if (!r.ok) { const d=await r.json(); setFormError(d.error??"Failed"); setSubmitting(false); return; }
    setShowNewOrder(false); resetForm(); setSubmitting(false);
  }

  function resetForm() {
    setAddress(""); setTier("standard"); setNotes(""); setDateStamp(false);
    setCustomShotList(""); setCustomPrice(""); setAddressValid(null);
    setAddressSuggestion(""); setCoverageStatus(null); setBulkMode(false);
    setBulkRows([{address:"",serviceId:"ext_7",tier:"standard"}]);
    setSelectedServiceId("ext_7"); setExpandedCategory("bpo_exterior");
  }

  async function respondToBid(orderId: string, bidId: string, action: "accept"|"reject") {
    setActingBid(bidId);
    await fetch(`/api/orders/${orderId}/bids`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({bidId,action}) });
    await fetchBids(orderId); setActingBid(null);
  }

  async function togglePhotoSel(orderId: string, photoId: string) {
    const set = new Set(selectedPhotos[orderId]??[]);
    if (set.has(photoId)) set.delete(photoId); else set.add(photoId);
    setSelectedPhotos(prev=>({...prev,[orderId]:set}));
    await fetch(`/api/orders/${orderId}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({selectedPhotos:[...set]}) });
  }

  async function emailPhotos(orderId: string) {
    setEmailingOrder(orderId);
    await fetch("/api/email-log", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({orderId,photoIds:[...(selectedPhotos[orderId]??[])]}) });
    setTimeout(()=>{ setEmailingOrder(null); alert("Photos emailed! (Check Email Log in admin)"); }, 800);
  }

  async function addSubAccount() {
    if (!subForm.name||!subForm.email||!subForm.password){setSubError("All fields required");return;}
    setAddingSub(true); setSubError("");
    const r = await fetch("/api/sub-accounts", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(subForm) });
    const d = await r.json();
    if (!r.ok){setSubError(d.error??"Failed");setAddingSub(false);return;}
    setSubForm({name:"",email:"",password:""}); setShowAddSub(false); setAddingSub(false); fetchSubAccounts();
  }

  async function logout() { await fetch("/api/auth/logout",{method:"POST"}); router.push("/"); }

  const stats = { total:orders.length, pending:orders.filter(o=>o.status==="pending").length, inProgress:orders.filter(o=>o.status==="in_progress").length, completed:orders.filter(o=>o.status==="completed").length };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold">📷</span>
          <span className="font-bold text-slate-900">Snapect</span>
          <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2 py-0.5 font-medium">Client Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${liveConnected?"bg-green-50 text-green-600 border-green-200":"bg-slate-50 text-slate-400 border-slate-200"}`}>
            {liveConnected?<Wifi className="w-3 h-3"/>:<WifiOff className="w-3 h-3"/>}{liveConnected?"Live":"Connecting…"}
          </div>
          <Link href="/client/wallet" className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors text-sm font-bold px-3 py-1.5 rounded-lg">
            <DollarSign className="w-3.5 h-3.5"/>Wallet
          </Link>
          <span className="text-sm text-slate-600">Welcome, <span className="font-semibold text-slate-900">{userName}</span></span>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600"><LogOut className="w-4 h-4"/>Logout</button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Payment success banner */}
        {paymentSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600"/>
            <div>
              <p className="font-semibold text-green-800">Payment Successful!</p>
              <p className="text-sm text-green-700">Your order has been confirmed and an agent will be assigned shortly.</p>
            </div>
          </div>
        )}

        {/* Cutoff info */}
        <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-sm ${localHour<10?"bg-green-50 border border-green-200 text-green-800":"bg-amber-50 border border-amber-200 text-amber-800"}`}>
          <Clock className="w-4 h-4 flex-shrink-0"/>
          <span>{cutoffMsg}</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[{label:"Total",val:stats.total,color:"text-slate-700"},{label:"Pending",val:stats.pending,color:"text-amber-600"},{label:"In Progress",val:stats.inProgress,color:"text-blue-600"},{label:"Completed",val:stats.completed,color:"text-green-600"}].map(({label,val,color})=>(
            <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 text-center">
              <div className={`text-3xl font-bold ${color}`}>{val}</div>
              <div className="text-xs text-slate-400 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-5 w-fit">
          {([["orders","My Orders"],["subaccounts","Employee Accounts"]] as const).map(([t,label])=>(
            <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab===t?"bg-white text-slate-900 shadow-sm":"text-slate-500 hover:text-slate-700"}`}>{label}</button>
          ))}
        </div>

        {tab==="subaccounts" ? (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div><h2 className="font-semibold text-slate-900">Employee Sub-Accounts</h2><p className="text-xs text-slate-400 mt-0.5">Each employee can log in and place orders billed to your account</p></div>
              <button onClick={()=>setShowAddSub(!showAddSub)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2 rounded-xl"><Plus className="w-4 h-4"/>Add Employee</button>
            </div>
            {showAddSub&&(
              <div className="p-5 bg-blue-50/50 border-b border-slate-100">
                {subError&&<p className="text-sm text-red-600 mb-3">{subError}</p>}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {[{label:"Name",key:"name",ph:"Jane Smith"},{label:"Email",key:"email",ph:"jane@company.com"},{label:"Password",key:"password",ph:"Set password"}].map(f=>(
                    <div key={f.key}>
                      <label className="text-xs font-medium text-slate-600 block mb-1">{f.label}</label>
                      <input type={f.key==="password"?"password":"text"} value={subForm[f.key as keyof typeof subForm]} onChange={e=>setSubForm(s=>({...s,[f.key]:e.target.value}))} placeholder={f.ph}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
                    </div>
                  ))}
                </div>
                <button onClick={addSubAccount} disabled={addingSub} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl">{addingSub?"Adding…":"Add Employee"}</button>
              </div>
            )}
            {subAccounts.length===0 ? (
              <div className="text-center py-12 text-slate-400"><Users className="w-8 h-8 mx-auto mb-2 text-slate-300"/><p>No employee accounts yet</p></div>
            ) : subAccounts.map(s=>(
              <div key={s.id} className="px-6 py-4 border-b border-slate-100 last:border-0 flex items-center justify-between">
                <div><p className="font-medium text-slate-800">{s.name}</p><p className="text-xs text-slate-500">{s.email}</p></div>
                <span className="text-xs text-slate-400" suppressHydrationWarning>{new Date(s.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">My Orders</h2>
              <button onClick={()=>setShowNewOrder(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl"><Plus className="w-4 h-4"/>Request Inspection</button>
            </div>

            {loading ? <div className="text-center py-20 text-slate-400 text-sm">Connecting…</div>
            : orders.length===0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center"><Camera className="w-10 h-10 text-slate-300 mx-auto mb-3"/><p className="text-slate-500 font-medium">No orders yet</p></div>
            ) : (
              <div className="space-y-3">
                {orders.map(order=>{
                  const showBids = bidsFor===order.id;
                  const orderBids = bidsData[order.id]??[];
                  const pendingBids = orderBids.filter(b=>b.status==="pending");
                  const photosExpanded = expandedPhotos===order.id;
                  const selSet = selectedPhotos[order.id]??new Set();

                  return (
                    <div key={order.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                      <Link href={`/client/orders/${order.id}`} className="block p-5 hover:bg-blue-50/30 group">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}>
                                {STATUS_ICONS[order.status]}{order.status.replace("_"," ")}
                              </span>
                              <span className="text-xs text-slate-400">{TIER_LABELS[order.turnaroundTier]}</span>
                              {order.invoicePaid && <span className="text-xs text-green-600 font-medium">✓ Paid</span>}
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-700 font-medium"><MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/><span className="truncate">{order.address}</span></div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                              <span>{order.serviceType}</span>
                              <span suppressHydrationWarning>{new Date(order.createdAt).toLocaleDateString()}</span>
                              {order.agent&&<span>Agent: <span className="text-slate-700 font-medium">{order.agent.name}</span></span>}
                              {order.photos.length>0&&<span className="text-blue-600">{order.photos.length} photo(s)</span>}
                          {order.status==="completed" && order.photoExpiresAt && (() => {
                            const days = getPhotoExpiryDays(order.photoExpiresAt);
                            if (days === null) return null;
                            if (days === 0) return <span className="text-red-600 font-semibold text-xs">Photos expired</span>;
                            if (days <= 7) return <span className="text-red-500 font-semibold text-xs">⚠️ Photos expire in {days}d</span>;
                            return <span className="text-amber-600 text-xs">Photos expire in {days}d</span>;
                          })()}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="text-right"><div className="font-bold text-slate-900 text-lg">${order.totalPrice}</div></div>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400"/>
                          </div>
                        </div>
                      </Link>

                      {/* Bids panel */}
                      {order.status==="pending"&&!order.acceptedBidId&&(
                        <div className="border-t border-slate-100 px-5 py-3">
                          <button onClick={e=>{e.preventDefault();if(!showBids)fetchBids(order.id);setBidsFor(showBids?null:order.id);}}
                            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600">
                            <Gavel className="w-4 h-4"/>View Bids
                            {pendingBids.length>0&&<span className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{pendingBids.length}</span>}
                          </button>
                          {showBids&&(
                            <div className="mt-3 space-y-2">
                              {orderBids.length===0 ? <p className="text-xs text-slate-400">No bids yet.</p>
                              : orderBids.map(bid=>(
                                <div key={bid.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${bid.status==="accepted"?"bg-green-50 border-green-200":bid.status==="rejected"?"bg-red-50 border-red-200 opacity-60":"bg-slate-50 border-slate-200"}`}>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <User className="w-3.5 h-3.5 text-slate-400"/>
                                      <span className="text-sm font-semibold text-slate-800">{bid.agentName}</span>
                                      {bid.agentRating&&<span className="text-xs text-amber-600">★ {bid.agentRating.toFixed(1)}</span>}
                                      {bid.placedByAdmin&&<span className="text-xs text-slate-400">(admin)</span>}
                                    </div>
                                    {bid.message&&<p className="text-xs text-slate-500 mt-0.5">"{bid.message}"</p>}
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="font-bold text-green-700">${bid.amount}</span>
                                    {bid.status==="pending"&&(
                                      <>
                                        <button onClick={()=>respondToBid(order.id,bid.id,"accept")} disabled={actingBid===bid.id}
                                          className="text-xs bg-green-600 hover:bg-green-700 text-white font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50">{actingBid===bid.id?"…":"Accept"}</button>
                                        <button onClick={()=>respondToBid(order.id,bid.id,"reject")} disabled={actingBid===bid.id}
                                          className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50">Reject</button>
                                      </>
                                    )}
                                    {bid.status==="accepted"&&<span className="text-xs text-green-700 font-semibold">✓ Accepted</span>}
                                    {bid.status==="rejected"&&<span className="text-xs text-red-600">Rejected</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Photos panel */}
                      {order.status==="completed"&&order.photos.length>0&&(
                        <div className="border-t border-slate-100 px-5 pb-4 pt-3">
                          <div className="flex items-center justify-between mb-3">
                            <button onClick={()=>setExpandedPhotos(photosExpanded?null:order.id)} className="flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-blue-600">
                              <Image className="w-4 h-4"/>{photosExpanded?"Hide":"View"} Photos ({order.photos.length})
                            </button>
                            <div className="flex items-center gap-2">
                              {selSet.size>0&&(
                                <button onClick={()=>emailPhotos(order.id)} disabled={emailingOrder===order.id}
                                  className="flex items-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium px-3 py-1.5 rounded-lg">
                                  <Mail className="w-3.5 h-3.5"/>{emailingOrder===order.id?"Sending…":`Email ${selSet.size}`}
                                </button>
                              )}
                              <button onClick={()=>window.open(`/api/orders/${order.id}/invoice`,"_blank")}
                                className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg">
                                <Download className="w-3.5 h-3.5"/>Invoice
                              </button>
                            </div>
                          </div>
                          {photosExpanded&&(
                            <div className="grid grid-cols-3 gap-2">
                              {order.photos.map(ph=>{
                                const isSel = selSet.has(ph.id);
                                return (
                                  <button key={ph.id} onClick={()=>togglePhotoSel(order.id,ph.id)}
                                    className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${isSel?"border-blue-500":"border-slate-200 hover:border-slate-300"}`}>
                                    {ph.url?.startsWith("data:") ? <img src={ph.url} alt={ph.description} className="w-full h-full object-cover"/>
                                    : <div className="w-full h-full bg-slate-100 flex items-center justify-center"><Camera className="w-5 h-5 text-slate-400"/></div>}
                                    <div className={`absolute top-1.5 right-1.5 ${isSel?"text-blue-600":"text-white/70"}`}>
                                      {isSel?<CheckSquare className="w-4 h-4 drop-shadow"/>:<Square className="w-4 h-4 drop-shadow"/>}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Payment Links Modal — shown after order placed */}
      {showPaymentLinks && paymentLinks.length > 0 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="bg-[#0f1f3d] rounded-t-2xl p-6 text-white text-center">
              <div className="w-14 h-14 bg-[#c8991a] rounded-full flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-7 h-7 text-white"/>
              </div>
              <h2 className="text-xl font-bold mb-1">Order Submitted!</h2>
              <p className="text-slate-300 text-sm">Your order is being processed. Complete payment to activate it.</p>
            </div>
            <div className="p-6">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-800">
                <p className="font-bold mb-1">⏳ Order Under Review</p>
                <p>Your order has been placed and is being processed. Once we confirm your payment, your order will be activated and an agent will be dispatched.</p>
              </div>
              <p className="text-sm font-semibold text-slate-700 mb-3">Choose a payment method:</p>
              <div className="space-y-3">
                {paymentLinks.map(link => (
                  <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 p-4 border-2 border-[#c8991a] rounded-xl hover:bg-[#c8991a]/5 transition-colors group">
                    <div>
                      <p className="font-bold text-[#0f1f3d]">{link.label}</p>
                      {link.description && <p className="text-xs text-slate-500">{link.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {link.amount && <span className="font-bold text-[#c8991a]">${link.amount}</span>}
                      <span className="text-xs bg-[#c8991a] text-white font-bold px-3 py-1.5 rounded-lg group-hover:bg-[#f0b429] transition-colors">Pay Now →</span>
                    </div>
                  </a>
                ))}
              </div>
              <p className="text-xs text-slate-400 text-center mt-4">After paying, your order status will update to "Active" within a few hours once we verify your payment.</p>
              <button onClick={() => setShowPaymentLinks(null)}
                className="w-full mt-4 border border-slate-300 text-slate-600 font-medium py-2.5 rounded-xl hover:bg-slate-50 text-sm">
                I've completed payment — close this window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Order Modal */}
      {showNewOrder&&(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div><h2 className="text-xl font-bold text-slate-900">Request Inspection</h2><p className="text-sm text-slate-400 mt-0.5">45+ services available · Stripe payment at checkout</p></div>
              <button onClick={()=>{setShowNewOrder(false);resetForm();}} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><X className="w-5 h-5"/></button>
            </div>

            <div className="p-6 space-y-5">
              {formError&&<div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{formError}</div>}

              {/* Single / Bulk toggle */}
              <div className="flex gap-2">
                <button onClick={()=>setBulkMode(false)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border ${!bulkMode?"bg-blue-600 text-white border-blue-600":"bg-white text-slate-600 border-slate-200"}`}><FileText className="w-4 h-4"/>Single Order</button>
                <button onClick={()=>setBulkMode(true)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border ${bulkMode?"bg-blue-600 text-white border-blue-600":"bg-white text-slate-600 border-slate-200"}`}><List className="w-4 h-4"/>Bulk (up to 50)</button>
              </div>

              {!bulkMode ? (
                <>
                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Property Address *</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                      <input value={address} onChange={e=>{ setAddress(e.target.value); setAddressValid(null); setCoverageStatus(null); }}
                        onBlur={()=>validateAddress(address)}
                        placeholder="123 Main St, Chicago, IL 60601"
                        className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                      {validatingAddress&&<div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"/>}
                      {!validatingAddress&&addressValid===true&&<CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500"/>}
                      {!validatingAddress&&addressValid===false&&<AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500"/>}
                    </div>
                    {addressSuggestion&&addressValid&&<p className="text-xs text-green-600 mt-1">✓ Verified: {addressSuggestion}</p>}
                    {addressValid===false&&<p className="text-xs text-red-600 mt-1">Address not found — check spelling or add ZIP code</p>}
                    {coverageStatus&&(
                      <div className={`mt-2 flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg ${coverageStatus.covered?"bg-green-50 text-green-700":"bg-amber-50 text-amber-700"}`}>
                        {coverageStatus.covered ? <><CheckCircle className="w-3.5 h-3.5"/>Coverage available — {coverageStatus.agentCount} agent{coverageStatus.agentCount!==1?"s":""} in this area</>
                        : <><AlertTriangle className="w-3.5 h-3.5"/>No agents in this ZIP yet — your order will be queued</>}
                      </div>
                    )}
                  </div>

                  {/* Service catalog */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Service *</label>
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {catalog.map(cat=>(
                        <div key={cat.id}>
                          <button onClick={()=>setExpandedCategory(expandedCategory===cat.id?null:cat.id)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 text-sm font-semibold text-slate-700">
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
                                    className={`w-full flex items-start justify-between gap-3 px-4 py-3 text-left transition-colors ${isSelected?"bg-blue-50":"hover:bg-slate-50"}`}>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        {isSelected&&<div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0"/>}
                                        <span className="text-sm font-medium text-slate-800">{svc.name}</span>
                                        {svc.photoCount&&<span className="text-xs text-slate-400">{svc.photoCount} photos</span>}
                                        {svc.requiresInterior&&<span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">Interior access</span>}
                                        {svc.isCustom&&<span className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">Custom</span>}
                                      </div>
                                      <p className="text-xs text-slate-500 mt-0.5 ml-4">{svc.description}</p>
                                      {svc.shotList&&isSelected&&(
                                        <div className="mt-2 ml-4">
                                          <p className="text-xs font-medium text-slate-600 mb-1">Required shots:</p>
                                          <div className="flex flex-wrap gap-1">
                                            {svc.shotList.map((shot,i)=><span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{shot}</span>)}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-shrink-0 text-right">
                                      {svc.isCustom ? <span className="text-xs text-slate-400">You set price</span>
                                      : <span className="font-bold text-blue-700">${p}</span>}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Custom order fields */}
                  {selectedSvc?.isCustom&&(
                    <div className="space-y-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
                      <p className="text-sm font-semibold text-purple-800">Custom Order Details</p>
                      <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1">Shot List — describe exactly what you need</label>
                        <textarea value={customShotList} onChange={e=>setCustomShotList(e.target.value)} rows={4}
                          placeholder="E.g. Front of house, all 4 sides, interior living room, kitchen, master bedroom, basement, HVAC unit…"
                          className="w-full border border-purple-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"/>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1">Your Offered Price ($) *</label>
                        <div className="relative w-32">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                          <input type="number" min="1" value={customPrice} onChange={e=>setCustomPrice(e.target.value)} placeholder="150"
                            className="w-full pl-8 pr-3 py-2 border border-purple-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Turnaround */}
                  {!selectedSvc?.isCustom&&(
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Turnaround *</label>
                      <div className="grid grid-cols-3 gap-3">
                        {Object.entries(TIER_LABELS).map(([k,label])=>{
                          const p = selectedSvc ? Math.round(selectedSvc.basePrice*(TIER_MULS[k]??1)) : 0;
                          return (
                            <button key={k} type="button" onClick={()=>setTier(k)}
                              className={`p-3 rounded-xl border-2 text-left transition-all ${tier===k?"border-blue-500 bg-blue-50":"border-slate-200 bg-white hover:border-slate-300"}`}>
                              <div className="text-sm font-semibold text-slate-800">{label}</div>
                              <div className="text-lg font-bold text-blue-700 mt-1">${p}</div>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1"><Info className="w-3 h-3"/>{cutoffMsg}</p>
                    </div>
                  )}

                  {/* Notes + date stamp */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
                      <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any special instructions…"
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50 w-full">
                        <input type="checkbox" checked={dateStamp} onChange={e=>setDateStamp(e.target.checked)} className="w-4 h-4 rounded border-slate-300"/>
                        <div>
                          <p className="text-sm font-medium text-slate-700">Date Stamp</p>
                          <p className="text-xs text-slate-400">Burn date into photos</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Price summary */}
                  {!selectedSvc?.isCustom&&(
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-700">{selectedSvc?.name}</p>
                        <p className="text-xs text-blue-500 mt-0.5 flex items-center gap-1"><CreditCard className="w-3 h-3"/>Paid securely via Stripe at checkout</p>
                      </div>
                      <div className="text-3xl font-bold text-blue-700">${price}</div>
                    </div>
                  )}

                  <button onClick={submitOrder} disabled={submitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                    {submitting ? "…" : selectedSvc?.isCustom
                      ? <><FileText className="w-4 h-4"/>Submit Custom Order — ${customPrice||"0"}</>
                      : <><CreditCard className="w-4 h-4"/>Pay & Submit — ${price}</>}
                  </button>
                </>
              ) : (
                /* Bulk mode */
                <>
                  <div className="space-y-3">
                    {bulkRows.map((row,i)=>(
                      <div key={i} className="flex gap-2 items-start p-3 bg-slate-50 rounded-xl">
                        <div className="flex-1 space-y-2">
                          <input value={row.address} onChange={e=>setBulkRows(rows=>rows.map((r,j)=>j===i?{...r,address:e.target.value}:r))}
                            placeholder={`Address ${i+1}`} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                          <div className="flex gap-2">
                            <select value={row.serviceId} onChange={e=>setBulkRows(rows=>rows.map((r,j)=>j===i?{...r,serviceId:e.target.value}:r))}
                              className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs">
                              {catalog.flatMap(c=>c.services).filter(s=>!s.isCustom).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <select value={row.tier} onChange={e=>setBulkRows(rows=>rows.map((r,j)=>j===i?{...r,tier:e.target.value}:r))}
                              className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs">
                              <option value="standard">Standard</option>
                              <option value="rush_24hr">Rush 24hr</option>
                              <option value="rush_6hr">Rush 6hr</option>
                            </select>
                          </div>
                        </div>
                        {bulkRows.length>1&&<button onClick={()=>setBulkRows(rows=>rows.filter((_,j)=>j!==i))} className="p-1.5 text-slate-400 hover:text-red-500 mt-1"><Trash2 className="w-4 h-4"/></button>}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <button onClick={()=>setBulkRows(rows=>[...rows,{address:"",serviceId:"ext_7",tier:"standard"}])} disabled={bulkRows.length>=50}
                      className="flex items-center gap-1.5 text-sm text-blue-600 font-medium disabled:opacity-40"><Plus className="w-4 h-4"/>Add Address ({bulkRows.length}/50)</button>
                  </div>
                  <button onClick={submitBulk} disabled={submitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                    {submitting?"Submitting…":<><Package className="w-4 h-4"/>Submit {bulkRows.filter(r=>r.address).length} Orders</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { Suspense } from "react";
export default function ClientPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Loading…</div>}>
      <ClientPageInner />
    </Suspense>
  );
}
