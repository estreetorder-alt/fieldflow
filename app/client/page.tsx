"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  LogOut, Plus, Camera, Clock, CheckCircle, RefreshCw, XCircle, MapPin,
  DollarSign, FileText, X, Wifi, WifiOff, ChevronRight, Zap, Package,
  List, Trash2, Mail, Download, Image, Square, CheckSquare, Gavel, User,
  Search, AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp,
  CreditCard, Star, Shield, Users, Car, Megaphone, Home as HomeIcon, Headset,
} from "lucide-react";

interface Photo { id: string; filename: string; url: string; description: string; selectedByClient: boolean; }
interface Bid { id: string; agentId: string; agentName: string; agentRating: number | null; amount: number; message: string; placedAt: string; status: string; placedByAdmin?: boolean; }
interface Order {
  id: string; address: string; status: string; totalPrice: number; compensationAmount: number;
  serviceType: string; turnaroundTier: string; notes: string; customizeNotes: string;
  photos: Photo[]; photoExpiresAt: string | null; createdAt: string; invoicePaid: boolean;
  offerAcceptedAt?: string | null;
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

  // Velocity-style dashboard state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(10);
  const [navMenu, setNavMenu] = useState<"orders"|"settings"|null>(null);
  const [announcement, setAnnouncement] = useState<{id:number;message:string}|null>(null);
  const [quickView, setQuickView] = useState<string|null>(null);

  useEffect(() => {
    fetch("/api/announcements").then(r=>r.json()).then(d=>{ if(d.announcement) setAnnouncement(d.announcement); }).catch(()=>{});
  }, []);

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

    // Try Whop checkout if configured
    if (!selectedSvc.isCustom) {
      const whopRes = await fetch("/api/whop", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ orderData, totalPrice: price, description: `${selectedSvc.name} — ${address}` }),
      });
      const whopData = await whopRes.json();
      if (whopData.url) {
        window.location.href = whopData.url;
        return;
      }
      // skip=true means Whop not configured, fall through
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

  // ── Velocity-style ledger derivations ──
  const filteredOrders = orders.filter(o => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (search.trim() && !o.address.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });
  const visibleOrders = filteredOrders.slice(0, visibleCount);

  // Completed orders per month, last 12 months (for the trend chart)
  const chartMonths: { label: string; count: number }[] = (() => {
    const now = new Date();
    const months: { key: string; label: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString("en-US", { month: "short" }), count: 0 });
    }
    for (const o of orders) {
      if (o.status !== "completed") continue;
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const m = months.find(mm => mm.key === key);
      if (m) m.count++;
    }
    return months;
  })();
  const chartMax = Math.max(4, ...chartMonths.map(m => m.count));

  // Split "123 Main St, Fayetteville NC 28301" → address line + city/state
  function splitAddress(full: string): { line: string; area: string } {
    const idx = full.indexOf(",");
    if (idx === -1) return { line: full, area: "" };
    return { line: full.slice(0, idx), area: full.slice(idx + 1).replace(/\b\d{5}(-\d{4})?\b/, "").trim() };
  }

  function reorder(o: Order) {
    setAddress(o.address);
    setBulkMode(false);
    setShowNewOrder(true);
  }

  return (
    <div className="min-h-screen bg-[#eef1f6]">
      {/* ── Top nav — navy bar with dropdown menus (Velocity structure) ── */}
      <header className="bg-[#0f1f3d] sticky top-0 z-30 shadow-md" onMouseLeave={()=>setNavMenu(null)}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <img src="/snapect-logo.png" alt="Snapect" className="h-8 w-auto object-contain" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
            <span className="font-extrabold text-white tracking-tight hidden sm:inline">Snapect</span>
            <span className="text-[10px] bg-[#c8991a] text-[#0f1f3d] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Client Portal</span>
          </div>

          <nav className="flex items-center gap-0.5 text-sm">
            <button onClick={()=>{setTab("orders");window.scrollTo({top:0,behavior:"smooth"});}}
              className="flex items-center gap-1.5 text-slate-200 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg font-medium transition-colors">
              <HomeIcon className="w-4 h-4"/><span className="hidden md:inline">Home</span>
            </button>

            {/* Orders dropdown */}
            <div className="relative">
              <button onClick={()=>setNavMenu(navMenu==="orders"?null:"orders")} onMouseEnter={()=>setNavMenu("orders")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-colors ${navMenu==="orders"?"bg-white/10 text-white":"text-slate-200 hover:text-white hover:bg-white/10"}`}>
                <List className="w-4 h-4"/><span className="hidden md:inline">Orders</span><ChevronDown className="w-3.5 h-3.5"/>
              </button>
              {navMenu==="orders"&&(
                <div className="absolute left-0 top-full mt-1 w-56 bg-[#16294f] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1">
                  {[
                    {label:"Place An Order", icon:<Plus className="w-4 h-4"/>, act:()=>{setBulkMode(false);setShowNewOrder(true);setNavMenu(null);}},
                    {label:"Place Multi Orders", icon:<Package className="w-4 h-4"/>, act:()=>{setBulkMode(true);setShowNewOrder(true);setNavMenu(null);}},
                    {label:"View Orders", icon:<List className="w-4 h-4"/>, act:()=>{setTab("orders");setNavMenu(null);document.getElementById("order-ledger")?.scrollIntoView({behavior:"smooth"});}},
                  ].map(item=>(
                    <button key={item.label} onClick={item.act} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/10 hover:text-white text-left">
                      {item.icon}{item.label}
                    </button>
                  ))}
                  <Link href="/coverage" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/10 hover:text-white"><MapPin className="w-4 h-4"/>View Coverage Map</Link>
                  <Link href="/contact" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/10 hover:text-white"><DollarSign className="w-4 h-4"/>Request a Quote</Link>
                </div>
              )}
            </div>

            {/* Settings dropdown */}
            <div className="relative">
              <button onClick={()=>setNavMenu(navMenu==="settings"?null:"settings")} onMouseEnter={()=>setNavMenu("settings")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-colors ${navMenu==="settings"?"bg-white/10 text-white":"text-slate-200 hover:text-white hover:bg-white/10"}`}>
                <Users className="w-4 h-4"/><span className="hidden md:inline">Settings</span><ChevronDown className="w-3.5 h-3.5"/>
              </button>
              {navMenu==="settings"&&(
                <div className="absolute left-0 top-full mt-1 w-56 bg-[#16294f] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1">
                  <button onClick={()=>{setTab("subaccounts");setNavMenu(null);}} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/10 hover:text-white text-left">
                    <Users className="w-4 h-4"/>Manage Employees
                  </button>
                  <Link href="/client/wallet" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/10 hover:text-white"><CreditCard className="w-4 h-4"/>Wallet &amp; Billing</Link>
                  <Link href="/refund-policy" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/10 hover:text-white"><Shield className="w-4 h-4"/>Refund Policy</Link>
                </div>
              )}
            </div>

            <Link href="/client/wallet" className="flex items-center gap-1.5 text-slate-200 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg font-medium transition-colors">
              <DollarSign className="w-4 h-4"/><span className="hidden md:inline">Wallet</span>
            </Link>
            <Link href="/contact" className="flex items-center gap-1.5 text-slate-200 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg font-medium transition-colors">
              <Info className="w-4 h-4"/><span className="hidden md:inline">FAQ</span>
            </Link>
            <button onClick={logout} className="flex items-center gap-1.5 text-slate-300 hover:text-red-300 hover:bg-white/10 px-3 py-2 rounded-lg font-medium transition-colors">
              <LogOut className="w-4 h-4"/><span className="hidden md:inline">Logout</span>
            </button>
          </nav>

          <div className={`hidden lg:flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border flex-shrink-0 ${liveConnected?"border-emerald-400/40 text-emerald-300":"border-white/20 text-slate-400"}`}>
            {liveConnected?<Wifi className="w-3 h-3"/>:<WifiOff className="w-3 h-3"/>}{liveConnected?"Live":"Connecting…"}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Client name + account number */}
        <div className="flex items-baseline gap-3 mb-4 flex-wrap">
          <h1 className="text-2xl font-extrabold text-[#0f1f3d]">{userName}</h1>
          <span className="text-xs text-slate-400 font-medium">Account # {userId ? userId.replace(/\D/g,"").slice(0,6).padStart(6,"1") : "——"}</span>
        </div>

        {/* IMPORTANT MESSAGE banner (admin-managed) */}
        {announcement&&(
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1.5">
              <Megaphone className="w-4 h-4 text-[#c8991a]"/>
              <span className="text-xs font-bold text-[#0f1f3d] uppercase tracking-[0.25em]">Important Message</span>
            </div>
            <div className="bg-amber-50 border border-[#c8991a]/50 rounded-xl px-4 py-3 text-sm text-[#7a5c0e] leading-relaxed">
              {announcement.message}
            </div>
          </div>
        )}

        {/* Payment success banner */}
        {paymentSuccess && (
          <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600"/>
            <div>
              <p className="font-semibold text-green-800">Payment Successful!</p>
              <p className="text-sm text-green-700">Your order has been confirmed and an agent will be assigned shortly.</p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-[270px_1fr] gap-6 items-start">
          {/* ── Left rail ── */}
          <aside className="space-y-4">
            {/* Brand panel */}
            <div className="bg-[#0f1f3d] rounded-2xl p-5 text-center shadow-lg overflow-hidden relative">
              <div className="absolute inset-x-0 top-0 h-1 bg-[#c8991a]"/>
              <img src="/snapect-logo.png" alt="Snapect" className="h-12 w-auto object-contain mx-auto mb-3" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
              <p className="text-white font-extrabold text-lg leading-tight">Nationwide Field Photos</p>
              <p className="text-[#c8991a] text-[11px] font-bold uppercase tracking-[0.25em] mt-1.5">Verified Agents · 35 States</p>
            </div>

            {/* Primary actions */}
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={()=>{setBulkMode(false);setShowNewOrder(true);}}
                className="flex items-center justify-center gap-1.5 bg-[#c8991a] hover:bg-[#f0b429] text-[#0f1f3d] font-bold text-sm py-2.5 rounded-xl transition-colors shadow-sm">
                <Plus className="w-4 h-4"/>New Order
              </button>
              <button onClick={()=>{setBulkMode(true);setShowNewOrder(true);}}
                className="flex items-center justify-center gap-1.5 bg-white border-2 border-[#c8991a] text-[#0f1f3d] hover:bg-[#c8991a]/10 font-bold text-sm py-2.5 rounded-xl transition-colors">
                <Package className="w-4 h-4"/>Multi Orders
              </button>
            </div>

            {/* Cutoff notice */}
            <div className={`p-3 rounded-xl flex items-start gap-2 text-xs leading-relaxed ${localHour<10?"bg-green-50 border border-green-200 text-green-800":"bg-amber-50 border border-amber-200 text-amber-800"}`}>
              <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"/>
              <span>{cutoffMsg}</span>
            </div>

            {/* Customer support card */}
            <a href="mailto:support@snapect.com" className="block bg-[#16294f] rounded-2xl p-4 hover:bg-[#1a3260] transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-[#c8991a] rounded-full flex items-center justify-center flex-shrink-0">
                  <Headset className="w-5 h-5 text-[#0f1f3d]"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm">Customer Support</p>
                  <p className="text-slate-400 text-[11px] truncate">support@snapect.com</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#c8991a] group-hover:translate-x-0.5 transition-transform"/>
              </div>
            </a>

            {/* Secondary actions */}
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={()=>{setTab("orders");setStatusFilter("all");setSearch("");setVisibleCount(1000);document.getElementById("order-ledger")?.scrollIntoView({behavior:"smooth"});}}
                className="flex items-center justify-center gap-1.5 bg-[#0f1f3d] hover:bg-[#1a3260] text-white font-semibold text-xs py-2.5 rounded-xl transition-colors">
                <List className="w-3.5 h-3.5"/>Orders Broad View
              </button>
              <Link href="/coverage" className="flex items-center justify-center gap-1.5 bg-[#0f1f3d] hover:bg-[#1a3260] text-white font-semibold text-xs py-2.5 rounded-xl transition-colors">
                <MapPin className="w-3.5 h-3.5"/>Coverage Map
              </Link>
            </div>

            {/* Mini stats */}
            <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
              {[{label:"Total Orders",val:stats.total,color:"text-[#0f1f3d]"},{label:"Pending",val:stats.pending,color:"text-amber-600"},{label:"In Progress",val:stats.inProgress,color:"text-blue-600"},{label:"Completed",val:stats.completed,color:"text-green-600"}].map(s=>(
                <div key={s.label} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-slate-500">{s.label}</span>
                  <span className={`text-sm font-extrabold ${s.color}`}>{s.val}</span>
                </div>
              ))}
            </div>
          </aside>

          {/* ── Main column ── */}
          <main className="space-y-5 min-w-0">
            {tab==="subaccounts" ? (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div><h2 className="font-semibold text-slate-900">Employee Sub-Accounts</h2><p className="text-xs text-slate-400 mt-0.5">Each employee can log in and place orders billed to your account</p></div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>setTab("orders")} className="text-xs text-slate-500 hover:text-[#0f1f3d] font-medium px-3 py-2">← Back to orders</button>
                    <button onClick={()=>setShowAddSub(!showAddSub)} className="flex items-center gap-1.5 bg-[#c8991a] hover:bg-[#f0b429] text-[#0f1f3d] text-sm font-bold px-3 py-2 rounded-xl"><Plus className="w-4 h-4"/>Add Employee</button>
                  </div>
                </div>
                {showAddSub&&(
                  <div className="p-5 bg-amber-50/50 border-b border-slate-100">
                    {subError&&<p className="text-sm text-red-600 mb-3">{subError}</p>}
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {[{label:"Name",key:"name",ph:"Jane Smith"},{label:"Email",key:"email",ph:"jane@company.com"},{label:"Password",key:"password",ph:"Set password"}].map(f=>(
                        <div key={f.key}>
                          <label className="text-xs font-medium text-slate-600 block mb-1">{f.label}</label>
                          <input type={f.key==="password"?"password":"text"} value={subForm[f.key as keyof typeof subForm]} onChange={e=>setSubForm(s=>({...s,[f.key]:e.target.value}))} placeholder={f.ph}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
                        </div>
                      ))}
                    </div>
                    <button onClick={addSubAccount} disabled={addingSub} className="bg-[#c8991a] hover:bg-[#f0b429] disabled:opacity-50 text-[#0f1f3d] text-sm font-bold px-4 py-2 rounded-xl">{addingSub?"Adding…":"Add Employee"}</button>
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
                {/* Completed Orders trend chart */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-extrabold text-[#0f1f3d] uppercase tracking-[0.3em]">Completed Orders</h2>
                    <span className="text-xs text-slate-400">Last 12 months</span>
                  </div>
                  <svg viewBox="0 0 720 180" className="w-full h-40" role="img" aria-label="Completed orders per month">
                    {/* gridlines */}
                    {[0,1,2,3].map(i=>(
                      <line key={i} x1="36" x2="712" y1={20+i*40} y2={20+i*40} stroke="#e8ecf3" strokeWidth="1"/>
                    ))}
                    {[0,1,2,3].map(i=>(
                      <text key={i} x="30" y={24+i*40} textAnchor="end" fontSize="10" fill="#94a3b8">{Math.round(chartMax*(3-i)/3)}</text>
                    ))}
                    {/* line */}
                    <polyline fill="none" stroke="#c8991a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
                      points={chartMonths.map((m,i)=>`${48+i*(656/11)},${140-(m.count/chartMax)*120}`).join(" ")}/>
                    {/* dots + month labels */}
                    {chartMonths.map((m,i)=>{
                      const x = 48+i*(656/11), y = 140-(m.count/chartMax)*120;
                      return (
                        <g key={i}>
                          <circle cx={x} cy={y} r="4" fill="#fff" stroke="#c8991a" strokeWidth="2"/>
                          <text x={x} y="164" textAnchor="middle" fontSize="10" fill="#64748b">{m.label}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Order ledger */}
                <div id="order-ledger" className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                      <Search className="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2"/>
                      <input value={search} onChange={e=>{setSearch(e.target.value);setVisibleCount(10);}} placeholder="Search for an address"
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">Filters</span>
                      <select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setVisibleCount(10);}}
                        className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#c8991a] bg-white">
                        <option value="all">All Orders (by ordered date)</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <button onClick={()=>{setBulkMode(false);setShowNewOrder(true);}} className="flex items-center gap-1.5 bg-[#c8991a] hover:bg-[#f0b429] text-[#0f1f3d] text-sm font-bold px-3.5 py-2 rounded-xl whitespace-nowrap"><Plus className="w-4 h-4"/>New Order</button>
                    </div>
                  </div>

                  {loading ? <div className="text-center py-20 text-slate-400 text-sm">Connecting…</div>
                  : filteredOrders.length===0 ? (
                    <div className="p-12 text-center"><Camera className="w-10 h-10 text-slate-300 mx-auto mb-3"/><p className="text-slate-500 font-medium">{orders.length===0?"No orders yet — place your first order to get started":"No orders match your search"}</p></div>
                  ) : (
                    <div>
                      {visibleOrders.map((order,rowIdx)=>{
                        const showBids = bidsFor===order.id;
                        const orderBids = bidsData[order.id]??[];
                        const pendingBids = orderBids.filter(b=>b.status==="pending");
                        const photosExpanded = expandedPhotos===order.id;
                        const selSet = selectedPhotos[order.id]??new Set();
                        const addr = splitAddress(order.address);
                        const isQuick = quickView===order.id;
                        const acceptedTime = order.offerAcceptedAt ? new Date(order.offerAcceptedAt).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}) : null;

                        return (
                          <div key={order.id} className={`border-b border-slate-100 last:border-0 ${rowIdx%2?"bg-slate-50/60":"bg-white"}`}>
                            {/* Ledger row */}
                            <div className="px-5 py-3 grid grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[90px_1fr_150px_170px] gap-x-3 gap-y-1 items-center">
                              <span className="text-xs text-slate-400 whitespace-nowrap" suppressHydrationWarning>{new Date(order.createdAt).toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"})}</span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Link href={`/client/orders/${order.id}`} className="font-bold text-[#0f1f3d] hover:text-[#c8991a] transition-colors truncate text-sm uppercase">{addr.line}</Link>
                                  <button onClick={()=>setQuickView(isQuick?null:order.id)} className="text-[11px] text-[#c8991a] hover:underline font-medium whitespace-nowrap">({isQuick?"Close":"Quick View"})</button>
                                </div>
                                <p className="text-[11px] text-slate-500 truncate">{order.serviceType} · {order.photos.length>0?`${order.photos.length} photos`:TIER_LABELS[order.turnaroundTier]}{order.agent?` · ${order.agent.name}`:""} · <span className="font-semibold text-slate-600">${order.totalPrice}</span></p>
                              </div>
                              <span className="text-xs text-slate-500 text-right hidden sm:block truncate">{addr.area||"—"}</span>
                              <div className="flex items-center justify-end gap-1.5 text-right">
                                {order.status==="completed" ? (
                                  <div className="flex flex-col items-end">
                                    <span className="flex items-center gap-1.5 text-green-600 text-xs italic font-semibold"><CheckCircle className="w-4 h-4"/>Completed.</span>
                                    <button onClick={()=>reorder(order)} className="text-[11px] text-[#c8991a] hover:underline font-medium">Reorder</button>
                                  </div>
                                ) : order.status==="cancelled" ? (
                                  <span className="flex items-center gap-1.5 text-red-500 text-xs italic"><XCircle className="w-4 h-4"/>Cancelled.</span>
                                ) : order.agent||order.status==="in_progress" ? (
                                  <span className="flex items-center gap-1.5 text-slate-600 text-xs italic"><Car className="w-4 h-4 text-[#c8991a]"/>Accepted{acceptedTime?` ${acceptedTime}`:""}</span>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-amber-600 text-xs italic"><User className="w-4 h-4"/>Rep notified.</span>
                                )}
                              </div>
                            </div>

                            {/* Quick View expansion */}
                            {isQuick&&(
                              <div className="px-5 pb-4 pt-1 bg-[#f8fafc] border-t border-slate-100">
                                <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 mb-3 pt-3">
                                  <span className={`inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}>{STATUS_ICONS[order.status]}{order.status.replace("_"," ")}</span>
                                  <span>{TIER_LABELS[order.turnaroundTier]}</span>
                                  {order.invoicePaid&&<span className="text-green-600 font-medium">✓ Paid</span>}
                                  {order.status==="completed" && order.photoExpiresAt && (() => {
                                    const days = getPhotoExpiryDays(order.photoExpiresAt);
                                    if (days === null) return null;
                                    if (days === 0) return <span className="text-red-600 font-semibold">Photos expired</span>;
                                    if (days <= 7) return <span className="text-red-500 font-semibold">⚠️ Photos expire in {days}d</span>;
                                    return <span className="text-amber-600">Photos expire in {days}d</span>;
                                  })()}
                                  <Link href={`/client/orders/${order.id}`} className="ml-auto text-[#c8991a] font-semibold hover:underline">Full order details →</Link>
                                </div>

                                {/* Bids panel */}
                                {order.status==="pending"&&!order.acceptedBidId&&(
                                  <div className="mb-3">
                                    <button onClick={e=>{e.preventDefault();if(!showBids)fetchBids(order.id);setBidsFor(showBids?null:order.id);}}
                                      className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#c8991a]">
                                      <Gavel className="w-4 h-4"/>View Bids
                                      {pendingBids.length>0&&<span className="bg-[#c8991a] text-[#0f1f3d] text-xs font-bold px-1.5 py-0.5 rounded-full">{pendingBids.length}</span>}
                                    </button>
                                    {showBids&&(
                                      <div className="mt-3 space-y-2">
                                        {orderBids.length===0 ? <p className="text-xs text-slate-400">No bids yet.</p>
                                        : orderBids.map(bid=>(
                                          <div key={bid.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${bid.status==="accepted"?"bg-green-50 border-green-200":bid.status==="rejected"?"bg-red-50 border-red-200 opacity-60":"bg-white border-slate-200"}`}>
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
                                  <div>
                                    <div className="flex items-center justify-between mb-3">
                                      <button onClick={()=>setExpandedPhotos(photosExpanded?null:order.id)} className="flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-[#c8991a]">
                                        <Image className="w-4 h-4"/>{photosExpanded?"Hide":"View"} Photos ({order.photos.length})
                                      </button>
                                      <div className="flex items-center gap-2">
                                        {selSet.size>0&&(
                                          <button onClick={()=>emailPhotos(order.id)} disabled={emailingOrder===order.id}
                                            className="flex items-center gap-1.5 text-xs bg-amber-50 hover:bg-amber-100 text-[#7a5c0e] font-medium px-3 py-1.5 rounded-lg">
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
                                              className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${isSel?"border-[#c8991a]":"border-slate-200 hover:border-slate-300"}`}>
                                              {ph.url?.startsWith("data:") ? <img src={ph.url} alt={ph.description} className="w-full h-full object-cover"/>
                                              : <div className="w-full h-full bg-slate-100 flex items-center justify-center"><Camera className="w-5 h-5 text-slate-400"/></div>}
                                              <div className={`absolute top-1.5 right-1.5 ${isSel?"text-[#c8991a]":"text-white/70"}`}>
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
                            )}
                          </div>
                        );
                      })}

                      {/* Load more */}
                      {filteredOrders.length>visibleCount&&(
                        <div className="px-5 py-4 text-right border-t border-slate-100">
                          <button onClick={()=>setVisibleCount(c=>c+10)}
                            className="text-sm font-semibold text-[#0f1f3d] border border-slate-300 hover:border-[#c8991a] hover:text-[#c8991a] px-4 py-2 rounded-xl transition-colors">
                            Load More Orders…
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </main>
        </div>
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
              <div><h2 className="text-xl font-bold text-slate-900">Request Inspection</h2><p className="text-sm text-slate-400 mt-0.5">45+ services available · Secure payment via Whop at checkout</p></div>
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
                        <p className="text-xs text-blue-500 mt-0.5 flex items-center gap-1"><CreditCard className="w-3 h-3"/>Paid securely via Whop at checkout</p>
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
