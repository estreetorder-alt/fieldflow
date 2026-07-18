"use client";
import { etDate, etDateTime, etTime } from "@/lib/est";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  LogOut, Plus, Camera, Clock, CheckCircle, RefreshCw, XCircle, MapPin,
  DollarSign, FileText, X, Wifi, WifiOff, ChevronRight, Zap, Package,
  List, Trash2, Mail, Download, Image, Square, CheckSquare, Gavel, User,
  Search, AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp,
  CreditCard, Star, Shield, Users, Car, Megaphone, Home as HomeIcon, Headset, Bell,
} from "lucide-react";

interface Photo { id: string; filename: string; url: string; description: string; selectedByClient: boolean; }
interface Bid { id: string; agentId: string; agentName: string; agentRating: number | null; amount: number; message: string; placedAt: string; status: string; placedByAdmin?: boolean; }
interface Order {
  id: string; address: string; status: string; totalPrice: number; compensationAmount: number;
  serviceType: string; turnaroundTier: string; notes: string; customizeNotes: string;
  photos: Photo[]; photoExpiresAt: string | null; createdAt: string; invoicePaid: boolean;
  offerAcceptedAt?: string | null; clientId?: string;
  statusHistory?: { status: string; timestamp: string; note: string }[];
  agent?: { name: string } | null; bids?: Bid[]; acceptedBidId?: string | null;
}
interface ServiceItem { id: string; name: string; description: string; basePrice: number; compensation: number; category: string; photoCount?: number; shotList?: string[]; isCustom?: boolean; requiresInterior?: boolean; }
interface ServiceCategory { id: string; label: string; services: ServiceItem[]; }
interface SubAccount { id: string; name: string; email: string; createdAt: string; }
interface PaymentLink { id: string; label: string; url: string; amount?: number; description: string; active: boolean; }

const STATUS_COLORS: Record<string,string> = { under_review:"bg-purple-100 text-purple-700 border-purple-200", pending:"bg-amber-100 text-amber-700 border-amber-200", in_progress:"bg-blue-100 text-blue-700 border-blue-200", completed:"bg-green-100 text-green-700 border-green-200", cancelled:"bg-red-100 text-red-700 border-red-200" };
const STATUS_ICONS: Record<string,React.ReactNode> = { under_review:<Clock className="w-3.5 h-3.5"/>, pending:<Clock className="w-3.5 h-3.5"/>, in_progress:<RefreshCw className="w-3.5 h-3.5"/>, completed:<CheckCircle className="w-3.5 h-3.5"/>, cancelled:<XCircle className="w-3.5 h-3.5"/> };
const STATUS_LABELS: Record<string,string> = { under_review:"Under Review", pending:"Order In Queue", in_progress:"In Progress", completed:"Completed", cancelled:"Cancelled" };
// Anonymized display for a bidding agent — vendors never see the agent's real name until a bid is accepted
function anonBidder(agentId: string) { return `User ${agentId.replace(/\D/g,"").slice(-7) || "0000000"}`; }
const TIER_LABELS: Record<string,string> = { standard:"Next Business Day", rush_24hr:"24-Hour Rush", rush_6hr:"6-Hour Rush" };
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
  const [userName, setUserName] = useState("Vendor");
  const [userId, setUserId] = useState("");
  const [liveConnected, setLiveConnected] = useState(false);
  const esRef = useRef<EventSource|null>(null);
  const [tab, setTab] = useState<"orders"|"subaccounts">("orders");

  // Service catalog
  const [catalog, setCatalog] = useState<ServiceCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("re_main6");
  const [expandedCategory, setExpandedCategory] = useState<string|null>("real_estate");

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
  const [bulkRows, setBulkRows] = useState([{address:"",serviceId:"re_main6",tier:"standard"}]);

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<{id:number;message:string}|null>(null);
  const [quickView, setQuickView] = useState<string|null>(null);

  // ── My Profile (vendor) ──
  const [clientProfileOpen, setClientProfileOpen] = useState(false);
  const [clientProfile, setClientProfile] = useState({ name:"", email:"", phone:"", company:"", currentPassword:"", newPassword:"" });
  const [clientProfileSaving, setClientProfileSaving] = useState(false);
  const [clientProfileMsg, setClientProfileMsg] = useState<{ok:boolean;text:string}|null>(null);

  async function openClientProfile() {
    const r = await fetch("/api/profile").then(x=>x.json()).catch(()=>null);
    if (r?.profile) setClientProfile({ name:r.profile.name??"", email:r.profile.email??"", phone:r.profile.phone??"", company:r.profile.company??"", currentPassword:"", newPassword:"" });
    setClientProfileMsg(null);
    setClientProfileOpen(true);
  }
  async function saveClientProfile() {
    setClientProfileSaving(true); setClientProfileMsg(null);
    const body: Record<string,string> = { name: clientProfile.name, phone: clientProfile.phone, company: clientProfile.company };
    if (clientProfile.newPassword) { body.newPassword = clientProfile.newPassword; body.currentPassword = clientProfile.currentPassword; }
    const r = await fetch("/api/profile", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
    const d = await r.json().catch(()=>({} as {error?:string}));
    setClientProfileSaving(false);
    if (!r.ok) { setClientProfileMsg({ok:false, text:d.error ?? "Failed to save"}); return; }
    setClientProfileMsg({ok:true, text:"Profile saved ✓"});
    setClientProfile(f=>({...f, currentPassword:"", newPassword:""}));
  }

  useEffect(() => {
    fetch("/api/announcements").then(r=>r.json()).then(d=>{ if(d.announcement) setAnnouncement(d.announcement); }).catch(()=>{});
  }, []);

  // ── Notification bell ──
  const [bellOpen, setBellOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [seenNotifs, setSeenNotifs] = useState<Set<string>>(new Set());
  const [placedBanner, setPlacedBanner] = useState(false);
  useEffect(()=>{ try{ const raw = localStorage.getItem("snapect_seen_notifs"); if(raw) setSeenNotifs(new Set(JSON.parse(raw))); }catch{} },[]);
  useEffect(()=>{ if(searchParams.get("placed")==="1"){ setPlacedBanner(true); const t=setTimeout(()=>setPlacedBanner(false),8000); return ()=>clearTimeout(t); } },[searchParams]);
  const notifications = orders.flatMap(o=>{
    const items: {key:string;orderId:string;title:string;detail:string;ts:string}[] = [];
    const pend = (o.bids??[]).filter(b=>b.status==="pending");
    if (o.status==="pending" && !o.acceptedBidId && pend.length>0) {
      const latest = pend.reduce((a,b)=>new Date(a.placedAt)>new Date(b.placedAt)?a:b);
      items.push({ key:`bid-${o.id}-${pend.length}`, orderId:o.id, title:`${pend.length} new offer${pend.length!==1?"s":""} received`, detail:o.address, ts:latest.placedAt });
    }
    (o.statusHistory??[]).forEach((ev,i)=>{
      if (ev.note && Date.now()-new Date(ev.timestamp).getTime() < 48*3600000)
        items.push({ key:`ev-${o.id}-${i}`, orderId:o.id, title:ev.note, detail:o.address, ts:ev.timestamp });
    });
    return items;
  }).sort((a,b)=>new Date(b.ts).getTime()-new Date(a.ts).getTime()).slice(0,15);
  const unreadCount = notifications.filter(n=>!seenNotifs.has(n.key)).length;
  function markAllSeen() {
    const next = new Set(notifications.map(n=>n.key));
    setSeenNotifs(next);
    try{ localStorage.setItem("snapect_seen_notifs", JSON.stringify([...next])); }catch{}
  }

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
    fetch("/api/wallet").then(r=>r.json()).then(d=>{ if(typeof d.balance==="number") setWalletBalance(d.balance); }).catch(()=>{});
    fetch("/api/payment-links").then(r=>r.json()).then(d=>{ setPaymentLinks(d.links?.filter((l: PaymentLink) => l.active) ?? []); });
    const es = new EventSource("/api/events");
    esRef.current = es;
    es.addEventListener("connected",()=>setLiveConnected(true));
    es.addEventListener("orders",(e)=>{ setOrders(JSON.parse(e.data) as Order[]); setLoading(false); });
    es.onerror=()=>setLiveConnected(false);
    return ()=>{ es.close(); };
  }, []);

  useEffect(() => { if(tab==="subaccounts") fetchSubAccounts(); }, [tab, fetchSubAccounts]);
  useEffect(() => { fetchSubAccounts(); }, [fetchSubAccounts]);

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

  async function respondToBid(orderId: string, bidId: string, action: "accept"|"reject", amount?: number) {
    if (action === "accept" && typeof amount === "number") {
      const bal = walletBalance ?? 0;
      if (bal < amount) {
        if (confirm(`This offer is $${amount.toFixed(2)} but your wallet balance is $${bal.toFixed(2)}.\n\nGo to your wallet to add funds now?`)) router.push("/client/wallet");
        return;
      }
      if (!confirm(`Accept this offer for $${amount.toFixed(2)}?\n\nYour wallet balance: $${bal.toFixed(2)}\nAfter acceptance: $${(bal - amount).toFixed(2)}\n\nThe amount is deducted immediately and the order is assigned to this agent.`)) return;
    }
    setActingBid(bidId);
    const r = await fetch(`/api/orders/${orderId}/bids`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({bidId,action}) });
    if (!r.ok) {
      const d = await r.json().catch(()=>({}));
      if (d.error === "insufficient_funds") {
        setActingBid(null);
        if (confirm(`${d.message ?? "Insufficient wallet balance."}\n\nGo to your wallet to add funds now?`)) router.push("/client/wallet");
        return;
      }
      alert(d.message ?? d.error ?? "Failed to update bid");
    }
    if (action === "accept" && r.ok) {
      fetch("/api/wallet").then(res=>res.json()).then(d=>{ if(typeof d.balance==="number") setWalletBalance(d.balance); }).catch(()=>{});
    }
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

  // Latest Order Comments (last two days) — Velocity-style panel
  const [dismissedComments, setDismissedComments] = useState<Set<string>>(new Set());
  const latestComments = orders
    .flatMap(o => (o.statusHistory ?? []).map((ev, i) => ({
      key: `${o.id}-${i}`, orderId: o.id, address: o.address,
      serviceType: o.serviceType, photoCount: o.photos.length,
      note: ev.note, timestamp: ev.timestamp,
    })))
    .filter(c => c.note && Date.now() - new Date(c.timestamp).getTime() < 48 * 3600000)
    .filter(c => !dismissedComments.has(c.key))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  function reorder(o: Order) {
    router.push(`/client/order?address=${encodeURIComponent(o.address)}`);
  }

  return (
    <div className="min-h-screen flex bg-[#F4F5F8]">
      {/* ================= Sidebar ================= */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 bg-[#0B0F1A] text-slate-300 sticky top-0 h-screen">
        <div className="px-5 pt-6 pb-5 flex items-center gap-2.5 border-b border-white/5">
          <img src="/snapect-logo.png" alt="Snapect" className="h-8 w-auto object-contain" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
          <div className="leading-tight">
            <p className="text-white font-extrabold text-sm tracking-tight">Snapect</p>
            <p className="text-[9px] text-[#FF7A33] font-bold uppercase tracking-[0.2em]">Vendor Portal</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 text-sm">
          <button onClick={()=>{setTab("orders");window.scrollTo({top:0,behavior:"smooth"});}}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-semibold transition-colors ${tab==="orders"?"bg-gradient-to-r from-[#FF6A1A] to-[#FF3D00] text-white shadow-lg shadow-orange-900/30":"text-slate-400 hover:bg-white/5 hover:text-white"}`}>
            <HomeIcon className="w-4 h-4"/>Dashboard
          </button>
          <Link href="/client/order" className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            <Plus className="w-4 h-4"/>New Order
          </Link>
          <button onClick={()=>{setTab("orders");setStatusFilter("all");setSearch("");setVisibleCount(1000);document.getElementById("order-ledger")?.scrollIntoView({behavior:"smooth"});}}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors text-left">
            <List className="w-4 h-4"/>Orders
            {stats.total>0 && <span className="ml-auto text-[10px] bg-white/10 text-slate-300 font-bold px-1.5 py-0.5 rounded-md">{stats.total}</span>}
          </button>
          <Link href="/client/multi-order" className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            <Package className="w-4 h-4"/>Multi Orders
          </Link>
          <Link href="/client/wallet" className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            <CreditCard className="w-4 h-4"/>Wallet &amp; Invoices
          </Link>
          <Link href="/coverage" className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            <MapPin className="w-4 h-4"/>Coverage Map
          </Link>
          <button onClick={()=>setTab("subaccounts")}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-semibold transition-colors text-left ${tab==="subaccounts"?"bg-gradient-to-r from-[#FF6A1A] to-[#FF3D00] text-white shadow-lg shadow-orange-900/30":"text-slate-400 hover:bg-white/5 hover:text-white"}`}>
            <Users className="w-4 h-4"/>Team
          </button>

          <div className="pt-3 mt-3 border-t border-white/5 space-y-1">
            <a href="mailto:info@snapect.com" className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
              <Headset className="w-4 h-4"/>Support
            </a>
            <Link href="/faq" className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
              <Info className="w-4 h-4"/>Resources
            </Link>
            <button onClick={openClientProfile} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors text-left">
              <User className="w-4 h-4"/>Settings
            </button>
          </div>
        </nav>

        <div className="p-3">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Wallet Balance</p>
            <p className="text-xl font-extrabold text-white mb-2">{walletBalance!==null?`$${walletBalance.toFixed(2)}`:"—"}</p>
            <Link href="/client/wallet" className="block text-center bg-gradient-to-r from-[#FF6A1A] to-[#FF3D00] hover:opacity-90 text-white text-xs font-bold py-2 rounded-lg transition-opacity">Add Funds</Link>
          </div>
          <button onClick={logout} className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-medium text-slate-500 hover:bg-white/5 hover:text-red-400 transition-colors text-sm">
            <LogOut className="w-4 h-4"/>Log Out
          </button>
        </div>
      </aside>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setMobileNavOpen(false)}/>
          <div className="relative w-72 bg-[#0B0F1A] text-slate-300 h-full flex flex-col">
            <div className="px-5 pt-6 pb-5 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <img src="/snapect-logo.png" alt="Snapect" className="h-8 w-auto object-contain" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
                <p className="text-white font-extrabold text-sm">Snapect</p>
              </div>
              <button onClick={()=>setMobileNavOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 text-sm">
              <button onClick={()=>{setTab("orders");setMobileNavOpen(false);}} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-white/5 hover:text-white text-left"><HomeIcon className="w-4 h-4"/>Dashboard</button>
              <Link href="/client/order" onClick={()=>setMobileNavOpen(false)} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-white/5 hover:text-white"><Plus className="w-4 h-4"/>New Order</Link>
              <Link href="/client/multi-order" onClick={()=>setMobileNavOpen(false)} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-white/5 hover:text-white"><Package className="w-4 h-4"/>Multi Orders</Link>
              <Link href="/client/wallet" onClick={()=>setMobileNavOpen(false)} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-white/5 hover:text-white"><CreditCard className="w-4 h-4"/>Wallet &amp; Invoices</Link>
              <Link href="/coverage" onClick={()=>setMobileNavOpen(false)} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-white/5 hover:text-white"><MapPin className="w-4 h-4"/>Coverage Map</Link>
              <button onClick={()=>{setTab("subaccounts");setMobileNavOpen(false);}} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-white/5 hover:text-white text-left"><Users className="w-4 h-4"/>Team</button>
              <a href="mailto:info@snapect.com" className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-white/5 hover:text-white"><Headset className="w-4 h-4"/>Support</a>
              <Link href="/faq" onClick={()=>setMobileNavOpen(false)} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-white/5 hover:text-white"><Info className="w-4 h-4"/>Resources</Link>
              <button onClick={()=>{logout();}} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-red-400 hover:bg-white/5 text-left mt-2"><LogOut className="w-4 h-4"/>Log Out</button>
            </nav>
          </div>
        </div>
      )}

      {/* ================= Right column ================= */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="h-16 px-4 sm:px-6 flex items-center gap-3">
            <button onClick={()=>setMobileNavOpen(true)} className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100">
              <List className="w-5 h-5"/>
            </button>
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"/>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter"){ setTab("orders"); setVisibleCount(1000); document.getElementById("order-ledger")?.scrollIntoView({behavior:"smooth"}); } }}
                placeholder="Search your orders by address…"
                className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-transparent rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A1A] focus:bg-white transition-colors"/>
            </div>

            <div className="flex items-center gap-2 ml-auto flex-shrink-0">
              <div className={`hidden md:flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border ${liveConnected?"border-emerald-300 text-emerald-600 bg-emerald-50":"border-slate-200 text-slate-400"}`}>
                {liveConnected?<Wifi className="w-3 h-3"/>:<WifiOff className="w-3 h-3"/>}{liveConnected?"Live":"Connecting…"}
              </div>

              <div className="relative">
                <button onClick={()=>{ setBellOpen(!bellOpen); if(!bellOpen) markAllSeen(); }}
                  className="relative p-2 rounded-lg text-slate-500 hover:text-[#0f1f3d] hover:bg-slate-100 transition-colors" title="Notifications">
                  <Bell className="w-5 h-5"/>
                  {unreadCount>0&&(
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-[#FF3D00] text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white">{unreadCount>9?"9+":unreadCount}</span>
                  )}
                </button>
                {bellOpen&&(
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-40">
                    <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-sm font-bold text-[#0f1f3d]">Notifications</span>
                      <button onClick={()=>setBellOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4"/></button>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                      {notifications.length===0 ? (
                        <p className="px-4 py-8 text-center text-xs text-slate-400">No new notifications</p>
                      ) : notifications.map(n=>(
                        <Link key={n.key} href={`/client/orders/${n.orderId}`} onClick={()=>setBellOpen(false)}
                          className="block px-4 py-3 hover:bg-slate-50">
                          <p className="text-xs font-semibold text-[#0f1f3d]">{n.title}</p>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{n.detail}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5" suppressHydrationWarning>{etDateTime(n.ts)}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <a href="mailto:info@snapect.com" className="hidden sm:flex p-2 rounded-lg text-slate-500 hover:text-[#0f1f3d] hover:bg-slate-100 transition-colors" title="Contact support">
                <Headset className="w-5 h-5"/>
              </a>

              <div className="relative">
                <button onClick={()=>setNavMenu(navMenu==="settings"?null:"settings")} onMouseEnter={()=>setNavMenu("settings")}
                  className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full hover:bg-slate-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6A1A] to-[#FF3D00] text-white text-xs font-extrabold flex items-center justify-center flex-shrink-0">
                    {userName.slice(0,2).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left leading-tight">
                    <p className="text-xs font-bold text-[#0f1f3d] truncate max-w-[110px]">{userName}</p>
                    <p className="text-[10px] text-slate-400">Account #{userId ? userId.replace(/\D/g,"").slice(0,6).padStart(6,"1") : "——"}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block"/>
                </button>
                {navMenu==="settings"&&(
                  <div onMouseLeave={()=>setNavMenu(null)} className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden py-1 z-40">
                    <button onClick={()=>{openClientProfile();setNavMenu(null);}} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 hover:text-[#0f1f3d] text-left">
                      <User className="w-4 h-4"/>My Profile
                    </button>
                    <Link href="/client/wallet" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 hover:text-[#0f1f3d]"><CreditCard className="w-4 h-4"/>Wallet &amp; Billing</Link>
                    <Link href="/refund-policy" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 hover:text-[#0f1f3d]"><Shield className="w-4 h-4"/>Refund Policy</Link>
                    <button onClick={logout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left border-t border-slate-100 mt-1">
                      <LogOut className="w-4 h-4"/>Log Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Vendor name + account number */}
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

        {/* Order placed banner */}
        {placedBanner && (walletBalance!==null && walletBalance<=0 ? (
          <div className="mb-5 p-4 bg-red-50 border border-red-300 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0"/>
            <div className="flex-1">
              <p className="font-semibold text-red-800">Order placed — but not processed yet</p>
              <p className="text-sm text-red-700">Your wallet balance is $0. Add funds to your wallet so your order can be processed.</p>
            </div>
            <Link href="/client/wallet" className="bg-[#c8991a] hover:bg-[#f0b429] text-[#0f1f3d] text-sm font-bold px-4 py-2 rounded-xl whitespace-nowrap">Add Funds</Link>
          </div>
        ) : (
          <div className="mb-5 p-4 bg-amber-50 border border-[#c8991a]/50 rounded-xl flex items-center gap-3">
            <span className="relative flex w-4 h-4 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c8991a] opacity-50"/>
              <span className="relative inline-flex rounded-full h-4 w-4 border-2 border-[#c8991a] border-t-transparent animate-spin"/>
            </span>
            <div>
              <p className="font-semibold text-[#0f1f3d]">Order placed — waiting for offers!</p>
              <p className="text-sm text-slate-600">Field agents are being notified. You&apos;ll see offers appear on your order shortly.</p>
            </div>
          </div>
        ))}

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


        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            {label:"Total Orders", val:stats.total, icon:<List className="w-5 h-5"/>, bg:"bg-[#FF6A1A]/10", fg:"text-[#FF6A1A]"},
            {label:"In Progress", val:stats.inProgress, icon:<RefreshCw className="w-5 h-5"/>, bg:"bg-blue-50", fg:"text-blue-600"},
            {label:"Completed", val:stats.completed, icon:<CheckCircle className="w-5 h-5"/>, bg:"bg-emerald-50", fg:"text-emerald-600"},
            {label:"Wallet Balance", val: walletBalance!==null?`$${walletBalance.toFixed(2)}`:"—", icon:<DollarSign className="w-5 h-5"/>, bg:"bg-violet-50", fg:"text-violet-600"},
          ].map(s=>(
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.fg} flex items-center justify-center mb-3`}>{s.icon}</div>
              <p className="text-2xl font-extrabold text-[#0f1f3d]">{s.val}</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Link href="/client/order" className="bg-gradient-to-br from-[#FF6A1A] to-[#FF3D00] rounded-2xl p-4 text-white hover:opacity-90 transition-opacity flex flex-col">
            <Plus className="w-5 h-5 mb-6"/>
            <p className="font-bold text-sm">New Order</p>
            <p className="text-[11px] text-white/80">Place a new inspection</p>
          </Link>
          <Link href="/client/multi-order" className="bg-[#0f1f3d] rounded-2xl p-4 text-white hover:bg-[#1a3260] transition-colors flex flex-col">
            <Package className="w-5 h-5 mb-6"/>
            <p className="font-bold text-sm">Multi Orders</p>
            <p className="text-[11px] text-white/70">Place several at once</p>
          </Link>
          <Link href="/coverage" className="bg-white border border-slate-200 rounded-2xl p-4 hover:bg-slate-50 transition-colors flex flex-col">
            <MapPin className="w-5 h-5 mb-6 text-[#FF6A1A]"/>
            <p className="font-bold text-sm text-[#0f1f3d]">Coverage Map</p>
            <p className="text-[11px] text-slate-400">Check agent coverage</p>
          </Link>
          <a href="mailto:info@snapect.com" className="bg-white border border-slate-200 rounded-2xl p-4 hover:bg-slate-50 transition-colors flex flex-col">
            <Headset className="w-5 h-5 mb-6 text-[#FF6A1A]"/>
            <p className="font-bold text-sm text-[#0f1f3d]">Live Support</p>
            <p className="text-[11px] text-slate-400">info@snapect.com</p>
          </a>
        </div>

        {/* Cutoff notice */}
        <div className={`mb-6 p-3 rounded-xl flex items-start gap-2 text-xs leading-relaxed ${localHour<10?"bg-green-50 border border-green-200 text-green-800":"bg-amber-50 border border-amber-200 text-amber-800"}`}>
          <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"/>
          <span>{cutoffMsg}</span>
        </div>

        <div className="space-y-5">
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
                  <div className="text-center py-12 text-slate-400"><Users className="w-8 h-8 mx-auto mb-2 text-slate-600"/><p>No employee accounts yet</p></div>
                ) : subAccounts.map(s=>(
                  <div key={s.id} className="px-6 py-4 border-b border-slate-100 last:border-0 flex items-center justify-between">
                    <div><p className="font-medium text-[#2A2320]">{s.name}</p><p className="text-xs text-slate-500">{s.email}</p></div>
                    <span className="text-xs text-slate-400" suppressHydrationWarning>{etDate(s.createdAt)}</span>
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

                {/* Latest Order Comments (last two days) */}
                {latestComments.length>0&&(
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100">
                      <h2 className="text-sm font-extrabold text-[#0f1f3d]">Latest Order Comments <span className="font-medium text-slate-400">(last two days)</span></h2>
                    </div>
                    <div className="max-h-56 overflow-y-auto divide-y divide-[#F0E4D3]">
                      {latestComments.map(c=>(
                        <div key={c.key} className="px-4 py-2.5 flex items-start gap-3">
                          <button onClick={()=>setDismissedComments(prev=>new Set(prev).add(c.key))}
                            className="w-6 h-6 rounded bg-white text-white text-xs font-bold flex items-center justify-center flex-shrink-0 hover:bg-red-500 transition-colors" title="Dismiss">×</button>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] text-slate-400" suppressHydrationWarning>{etDate(c.timestamp,{month:"2-digit",day:"2-digit",year:"numeric"})} · {c.serviceType}{c.photoCount>0?` (${c.photoCount} photos)`:""}</p>
                            <Link href={`/client/orders/${c.orderId}`} className="text-xs font-bold text-[#0f1f3d] hover:text-[#c8991a] uppercase truncate block">{c.address}</Link>
                            <p className="text-xs text-slate-600 mt-0.5">{c.note}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Order ledger */}
                <div id="order-ledger" className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                      <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2"/>
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
                      <Link href="/client/order" className="flex items-center gap-1.5 bg-[#c8991a] hover:bg-[#f0b429] text-[#0f1f3d] text-sm font-bold px-3.5 py-2 rounded-xl whitespace-nowrap"><Plus className="w-4 h-4"/>New Order</Link>
                    </div>
                  </div>

                  {loading ? <div className="text-center py-20 text-slate-400 text-sm">Connecting…</div>
                  : filteredOrders.length===0 ? (
                    <div className="p-12 text-center"><Camera className="w-10 h-10 text-slate-600 mx-auto mb-3"/><p className="text-slate-500 font-medium">{orders.length===0?"No orders yet — place your first order to get started":"No orders match your search"}</p></div>
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
                        const placedByEmployee = order.clientId && userId && order.clientId !== userId ? subAccounts.find(s=>s.id===order.clientId) : null;
                        const acceptedTime = order.offerAcceptedAt ? etTime(order.offerAcceptedAt,{hour:"numeric",minute:"2-digit"}) : null;
                        const pendingBidCount = (order.bids ?? []).filter(b=>b.status==="pending").length;
                        const awaitingOffers = order.status==="pending" && !order.acceptedBidId;

                        return (
                          <div key={order.id} className={`border-b border-slate-100 last:border-0 ${awaitingOffers&&pendingBidCount>0?"bg-amber-50/70 border-l-4 border-l-[#c8991a]":rowIdx%2?"bg-slate-50/60":"bg-white"}`}>
                            {/* Ledger row */}
                            <div className="px-5 py-3 grid grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[90px_1fr_150px_170px] gap-x-3 gap-y-1 items-center">
                              <span className="text-xs text-slate-400 whitespace-nowrap" suppressHydrationWarning>{etDate(order.createdAt,{month:"2-digit",day:"2-digit",year:"numeric"})}</span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Link href={`/client/orders/${order.id}`} className="font-bold text-[#0f1f3d] hover:text-[#c8991a] transition-colors truncate text-sm uppercase">{addr.line}</Link>
                                  <button onClick={()=>setQuickView(isQuick?null:order.id)} className="text-[11px] text-[#c8991a] hover:underline font-medium whitespace-nowrap">({isQuick?"Close":"Quick View"})</button>
                                </div>
                                <p className="text-[11px] text-slate-500 truncate">{order.serviceType} · {order.photos.length>0?`${order.photos.length} photos`:TIER_LABELS[order.turnaroundTier]}{order.agent?` · ${order.agent.name}`:""}{placedByEmployee?` · Placed by ${placedByEmployee.name}`:""}{order.acceptedBidId?<> · <span className="font-semibold text-slate-600">${order.compensationAmount}</span></>:null}</p>
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
                                ) : walletBalance!==null && walletBalance<=0 ? (
                                  <Link href="/client/wallet"
                                    className="flex items-center gap-1.5 text-red-600 text-xs font-bold bg-red-50 border border-red-200 px-2.5 py-1 rounded-full hover:bg-red-100 transition-colors">
                                    <AlertTriangle className="w-3.5 h-3.5"/>Order not processed — add funds to your wallet
                                  </Link>
                                ) : pendingBidCount>0 ? (
                                  <button onClick={e=>{e.preventDefault();setQuickView(order.id);fetchBids(order.id);setBidsFor(order.id);}}
                                    className="flex items-center gap-1.5 text-[#0f1f3d] text-xs font-bold bg-[#c8991a]/15 border border-[#c8991a] px-2.5 py-1 rounded-full hover:bg-[#c8991a]/25 transition-colors">
                                    <Gavel className="w-3.5 h-3.5 text-[#c8991a]"/>{pendingBidCount} Offer{pendingBidCount!==1?"s":""} received
                                    <span className="w-2 h-2 rounded-full bg-[#c8991a] animate-pulse"/>
                                  </button>
                                ) : (
                                  <span className="flex items-center gap-2 text-amber-600 text-xs italic">
                                    <span className="relative flex w-3.5 h-3.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60"/>
                                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-amber-500 border-t-transparent animate-spin"/>
                                    </span>
                                    Waiting for offers…
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Quick View expansion */}
                            {isQuick&&(
                              <div className="px-5 pb-4 pt-1 bg-[#f8fafc] border-t border-slate-100">
                                <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 mb-3 pt-3">
                                  <span className={`inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}>{STATUS_ICONS[order.status]}{STATUS_LABELS[order.status] ?? order.status.replace("_"," ")}</span>
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
                                        {walletBalance!==null&&(
                                          <p className="text-[11px] font-semibold text-slate-500">Your wallet balance: <span className={walletBalance>0?"text-green-700":"text-red-600"}>${walletBalance.toFixed(2)}</span> — accepting an offer deducts it instantly</p>
                                        )}
                                        {orderBids.length===0 ? <p className="text-xs text-slate-400">No bids yet.</p>
                                        : orderBids.map(bid=>(
                                          <div key={bid.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${bid.status==="accepted"?"bg-green-50 border-green-200":bid.status==="rejected"?"bg-red-50 border-red-200 opacity-60":"bg-white border-slate-200"}`}>
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2">
                                                <User className="w-3.5 h-3.5 text-slate-400"/>
                                                <span className="text-sm font-semibold text-[#2A2320]">Bid placed by {anonBidder(bid.agentId)}</span>
                                                {bid.agentRating&&<span className="text-xs text-amber-600">★ {bid.agentRating.toFixed(1)}</span>}
                                              </div>
                                              {bid.message&&<p className="text-xs text-slate-500 mt-0.5">"{bid.message}"</p>}
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                              <span className="font-bold text-green-700">${bid.amount}</span>
                                              {bid.status==="pending"&&(
                                                <>
                                                  <button onClick={()=>respondToBid(order.id,bid.id,"accept",bid.amount)} disabled={actingBid===bid.id}
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
                                              className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${isSel?"border-[#c8991a]":"border-slate-200 hover:border-[#D8C4AC]"}`}>
                                              {ph.url?.startsWith("data:") ? <img src={ph.url} alt={ph.description} className="w-full h-full object-cover"/>
                                              : <div className="w-full h-full bg-slate-100 flex items-center justify-center"><Camera className="w-5 h-5 text-slate-400"/></div>}
                                              <div className={`absolute top-1.5 right-1.5 ${isSel?"text-[#c8991a]":"text-[#0f1f3d]/70"}`}>
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
                            className="text-sm font-semibold text-[#0f1f3d] border border-[#D8C4AC] hover:border-[#c8991a] hover:text-[#c8991a] px-4 py-2 rounded-xl transition-colors">
                            Load More Orders…
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
                </div>
              </div>
            </main>
          </div>

      {/* ── My Profile modal (vendor) ── */}
      {clientProfileOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setClientProfileOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#0f1f3d] flex items-center gap-2"><User className="w-5 h-5 text-[#c8991a]"/>My Profile</h3>
              <button onClick={()=>setClientProfileOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            {clientProfileMsg && (
              <div className={`mb-3 px-3 py-2 rounded-xl text-sm ${clientProfileMsg.ok?"bg-green-50 border border-green-200 text-green-700":"bg-red-50 border border-red-200 text-red-700"}`}>{clientProfileMsg.text}</div>
            )}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Name</label>
                <input value={clientProfile.name} onChange={e=>setClientProfile(f=>({...f,name:e.target.value}))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Email <span className="text-slate-400">(contact support to change)</span></label>
                <input value={clientProfile.email} disabled className="w-full border border-slate-100 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-400"/>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Phone</label>
                  <input value={clientProfile.phone} onChange={e=>setClientProfile(f=>({...f,phone:e.target.value}))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Company</label>
                  <input value={clientProfile.company} onChange={e=>setClientProfile(f=>({...f,company:e.target.value}))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-bold text-slate-700 mb-2">Change Password <span className="font-normal text-slate-400">(optional)</span></p>
                <div className="space-y-2">
                  <input type="password" placeholder="Current password" value={clientProfile.currentPassword} onChange={e=>setClientProfile(f=>({...f,currentPassword:e.target.value}))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
                  <input type="password" placeholder="New password (min 6 characters)" value={clientProfile.newPassword} onChange={e=>setClientProfile(f=>({...f,newPassword:e.target.value}))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
                </div>
              </div>
              <button onClick={saveClientProfile} disabled={clientProfileSaving}
                className="w-full bg-[#c8991a] hover:bg-[#f0b429] disabled:opacity-50 text-[#0f1f3d] font-bold py-2.5 rounded-xl text-sm">
                {clientProfileSaving?"Saving…":"Save Profile"}
              </button>
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
