"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut, Users, DollarSign, ClipboardList, RefreshCw, Save, Camera,
  CheckCircle, Clock, XCircle, Wifi, WifiOff, Star, ToggleLeft, ToggleRight,
  Mail, MapPin, Car, Download, Package, Gavel, UserPlus, Eye, EyeOff, X,
  ShieldCheck, CreditCard, AlertCircle, ZapIcon, ChevronDown, ChevronUp, Link as LinkIcon, Plus as PlusIcon, Trash as TrashIcon,
} from "lucide-react";

interface Order { id: string; address: string; status: string; clientId: string; assignedAgentId: string | null; totalPrice: number; compensationAmount: number; serviceType: string; turnaroundTier: string; notes: string; createdAt: string; client?: { name: string; email: string } | null; agent?: { name: string; rating?: number } | null; bids?: Bid[]; acceptedBidId?: string | null; }
interface Bid { id: string; agentId: string; agentName: string; agentRating: number | null; amount: number; message: string; placedAt: string; status: string; placedByAdmin?: boolean; }
interface Agent { id: string; name: string; email: string; phone: string; coverageZone: string; vehicle: string; available: boolean; rating: number; totalEarnings: number; pendingPayout: number; completedJobs: number; grade?: number; approved?: boolean; }
interface AUser { id: string; name: string; email: string; role: string; phone: string; company?: string; createdAt?: string; }
interface PricingConfig { id: string; serviceType: string; name: string; basePrice: number; compensation: number; urgencyMultiplier: number; active: boolean; category: string; description: string; photoCount?: number; isCustom?: boolean; requiresInterior?: boolean; }
interface CatalogCategory { id: string; label: string; services: PricingConfig[]; }
interface EmailEntry { timestamp: string; type: string; to: string; subject: string; body: string; }
interface Msg { id: number; fromId: string; toId: string; body: string; createdAt: string; fromName: string; toName: string; }
interface Sample { id: string; agentId: string; agentName: string; agentEmail: string; status: string; photos: string[]; notes: string; createdAt: string; }
interface Payout { id: number; agent_id: string; amount: number; paypal_email: string; status: string; created_at: string; users?: { name: string; email: string }; }

const STATUS_COLORS: Record<string,string> = { pending:"bg-amber-100 text-amber-700", in_progress:"bg-blue-100 text-blue-700", completed:"bg-green-100 text-green-700", cancelled:"bg-red-100 text-red-700" };
const STATUS_ICONS: Record<string,React.ReactNode> = { pending:<Clock className="w-3.5 h-3.5"/>, in_progress:<RefreshCw className="w-3.5 h-3.5"/>, completed:<CheckCircle className="w-3.5 h-3.5"/>, cancelled:<XCircle className="w-3.5 h-3.5"/> };
const TIER_BADGES: Record<string,string> = { standard:"bg-slate-50 text-slate-500", rush_24hr:"bg-amber-50 text-amber-700", rush_6hr:"bg-red-50 text-red-700" };

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"orders"|"agents"|"users"|"samples"|"payouts"|"payment-links"|"pricing"|"emails">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [allUsers, setAllUsers] = useState<AUser[]>([]);
  const [pricing, setPricing] = useState<PricingConfig[]>([]);
  const [pricingCatalog, setPricingCatalog] = useState<CatalogCategory[]>([]);
  const [expandedPricingCat, setExpandedPricingCat] = useState<string>("bpo_exterior");
  const [emails, setEmails] = useState<EmailEntry[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [editingPrice, setEditingPrice] = useState<Record<string,Partial<PricingConfig>>>({});
  const [ratingEdit, setRatingEdit] = useState<Record<string,number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string|null>(null);
  const [userName, setUserName] = useState("Admin");
  const [adminId, setAdminId] = useState("");
  const [liveConnected, setLiveConnected] = useState(false);
  const esRef = useRef<EventSource|null>(null);

  // Bid modal
  const [bidModal, setBidModal] = useState<{orderId:string;orderAddr:string}|null>(null);
  const [bidAgentId, setBidAgentId] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [bidMessage, setBidMessage] = useState("");
  const [submittingBid, setSubmittingBid] = useState(false);
  const [bidError, setBidError] = useState("");
  const [bidsFor, setBidsFor] = useState<string|null>(null);
  const [bidsData, setBidsData] = useState<Record<string,Bid[]>>({});
  const [actingBid, setActingBid] = useState<string|null>(null);

  // Add user
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({name:"",email:"",password:"",phone:"",role:"agent",company:""});
  const [addingUser, setAddingUser] = useState(false);
  const [addUserError, setAddUserError] = useState("");
  const [addUserSuccess, setAddUserSuccess] = useState("");
  const [showPass, setShowPass] = useState(false);


  // Payment Links
  const [paymentLinks, setPaymentLinks] = useState<{id:string;label:string;url:string;amount?:number;description:string;active:boolean}[]>([]);
  const [newLink, setNewLink] = useState({label:"",url:"",amount:"",description:""});
  const [addingLink, setAddingLink] = useState(false);
  const [linkError, setLinkError] = useState("");

  // Payouts
  const [payoutModal, setPayoutModal] = useState<{agentId:string;agentName:string;pendingPayout:number}|null>(null);
  const [paypalEmail, setPaypalEmail] = useState("");
  const [processingPayout, setProcessingPayout] = useState(false);

  const fetchAll = useCallback(async () => {
    const [agentsRes, pricingRes, meRes, emailsRes] = await Promise.all([
      fetch("/api/agents?all=1"), fetch("/api/pricing"), fetch("/api/auth/me"), fetch("/api/email-log"),
    ]);
    const [agentsData, pricingData, meData, emailsData] = await Promise.all([
      agentsRes.json(), pricingRes.json(), meRes.json(), emailsRes.json(),
    ]);
    setAgents(agentsData.agents ?? []);
    setPricing(pricingData.pricing ?? []);
    setPricingCatalog(pricingData.catalog ?? []);
    setEmails(emailsData.emails ?? []);
    setAllUsers(agentsData.allUsers ?? []);
    if (meData.user) { setUserName(meData.user.name); setAdminId(meData.user.id); }
  }, []);

  const fetchSamples = useCallback(async () => {
    const r = await fetch("/api/samples");
    const d = await r.json();
    setSamples(d.samples ?? []);
  }, []);


  const fetchPaymentLinks = useCallback(async () => {
    const r = await fetch("/api/payment-links");
    const d = await r.json();
    setPaymentLinks(d.links ?? []);
  }, []);

  const fetchPayouts = useCallback(async () => {
    const r = await fetch("/api/payouts");
    const d = await r.json();
    setPayouts(d.payouts ?? []);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
    const es = new EventSource("/api/events");
    esRef.current = es;
    es.addEventListener("connected", () => setLiveConnected(true));
    es.addEventListener("orders", (e) => { setOrders(JSON.parse(e.data) as Order[]); setLoading(false); });
    es.onerror = () => setLiveConnected(false);
    return () => { es.close(); };
  }, [fetchAll]);

  useEffect(() => { if (tab === "samples") fetchSamples(); }, [tab, fetchSamples]);

  useEffect(() => { if (tab === "payouts") fetchPayouts(); }, [tab, fetchPayouts]);
  useEffect(() => { if (tab === "payment-links") fetchPaymentLinks(); }, [tab, fetchPaymentLinks]);

  async function handleLogout() { await fetch("/api/auth/logout", { method:"POST" }); router.push("/"); }

  async function assignAgent(orderId: string, agentId: string|null, status?: string) {
    const body: Record<string,unknown> = { assignedAgentId: agentId };
    if (status) body.status = status;
    await fetch(`/api/orders/${orderId}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
  }

  async function updateStatus(orderId: string, status: string) {
    await fetch(`/api/orders/${orderId}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ status }) });
  }

  async function savePricing(id: string) {
    setSaving(id);
    const updates = editingPrice[id];
    if (!updates) { setSaving(null); return; }
    await fetch("/api/pricing", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id, ...updates }) });
    setSaving(null);
    setEditingPrice(prev => { const n={...prev}; delete n[id]; return n; });
    fetchAll();
  }

  async function toggleAgentAvailability(agent: Agent) {
    await fetch(`/api/agents/${agent.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ available:!agent.available }) });
    setAgents(prev => prev.map(a => a.id===agent.id ? {...a,available:!a.available} : a));
  }

  async function saveAgentRating(agentId: string) {
    const rating = ratingEdit[agentId];
    if (rating==null) return;
    setSaving(`rating-${agentId}`);
    await fetch(`/api/agents/${agentId}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ rating }) });
    setAgents(prev => prev.map(a => a.id===agentId ? {...a,rating} : a));
    setRatingEdit(prev => { const n={...prev}; delete n[agentId]; return n; });
    setSaving(null);
  }

  async function submitAdminBid() {
    if (!bidModal||!bidAgentId||!bidAmount) { setBidError("Select an agent and enter an amount"); return; }
    setSubmittingBid(true); setBidError("");
    const r = await fetch(`/api/orders/${bidModal.orderId}/bids`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ actingAsAgentId:bidAgentId, amount:Number(bidAmount), message:bidMessage }) });
    const d = await r.json();
    if (!r.ok) { setBidError(d.error??"Failed"); setSubmittingBid(false); return; }
    setBidModal(null); setBidAgentId(""); setBidAmount(""); setBidMessage(""); setSubmittingBid(false);
  }

  async function fetchBids(orderId: string) {
    const r = await fetch(`/api/orders/${orderId}/bids`);
    const d = await r.json();
    setBidsData(prev => ({...prev,[orderId]:d.bids??[]}));
  }

  async function respondToBid(orderId: string, bidId: string, action: "accept"|"reject") {
    setActingBid(bidId);
    await fetch(`/api/orders/${orderId}/bids`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ bidId, action }) });
    await fetchBids(orderId);
    setActingBid(null);
  }

  async function addUser() {
    if (!newUser.name||!newUser.email||!newUser.password) { setAddUserError("Name, email, and password are required"); return; }
    setAddingUser(true); setAddUserError(""); setAddUserSuccess("");
    const r = await fetch("/api/auth/register", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({...newUser,adminCreate:true}) });
    const d = await r.json();
    if (!r.ok) { setAddUserError(d.error??"Failed"); setAddingUser(false); return; }
    setAddUserSuccess(`✓ ${d.user.name} (${d.user.role}) created — ${newUser.email} / ${newUser.password}`);
    setNewUser({name:"",email:"",password:"",phone:"",role:"agent",company:""});
    setAddingUser(false); fetchAll();
  }

  async function reviewSample(sampleId: string, decision: "approved"|"rejected") {
    await fetch(`/api/samples/${sampleId}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ decision }) });
    fetchSamples();
    // Refresh agents list for approval status
    fetchAll();
  }

  async function addPaymentLink() {
    if (!newLink.label || !newLink.url) { setLinkError("Label and URL required"); return; }
    setAddingLink(true); setLinkError("");
    await fetch("/api/payment-links", {
      method: "POST", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ label: newLink.label, url: newLink.url, amount: newLink.amount ? Number(newLink.amount) : undefined, description: newLink.description }),
    });
    setNewLink({label:"",url:"",amount:"",description:""});
    setAddingLink(false); fetchPaymentLinks();
  }

  async function deleteLink(id: string) {
    await fetch(`/api/payment-links/${id}`, { method: "DELETE" });
    fetchPaymentLinks();
  }

  async function toggleLink(id: string, active: boolean) {
    await fetch(`/api/payment-links/${id}`, {
      method: "PATCH", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ active: !active }),
    });
    fetchPaymentLinks();
  }

  async function processPayout() {
    if (!payoutModal||!paypalEmail) return;
    setProcessingPayout(true);
    await fetch("/api/payouts", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ agentId:payoutModal.agentId, amount:payoutModal.pendingPayout, paypalEmail }) });
    setPayoutModal(null); setPaypalEmail(""); setProcessingPayout(false);
    fetchAll(); fetchPayouts();
  }

  const TABS = [
    ["orders","Orders",<ClipboardList key="o" className="w-4 h-4"/>],
    ["agents","Agents",<Users key="a" className="w-4 h-4"/>],
    ["users","Add Users",<UserPlus key="u" className="w-4 h-4"/>],
    ["samples","Samples",<ShieldCheck key="s" className="w-4 h-4"/>],
    ["payouts","Payouts",<CreditCard key="pay" className="w-4 h-4"/>],
    ["pricing","Pricing",<DollarSign key="p" className="w-4 h-4"/>],
    ["payment-links","Payment Links",<DollarSign key="pl" className="w-4 h-4 text-emerald-600"/>],
    ["emails","Email Log",<Mail key="e" className="w-4 h-4"/>],
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-700 rounded-lg flex items-center justify-center"><Camera className="w-4 h-4 text-white"/></div>
            <span className="font-bold text-slate-900">FieldFlow</span>
            <span className="text-xs bg-purple-100 text-purple-700 font-medium px-2 py-0.5 rounded-full">Admin Studio</span>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${liveConnected?"bg-green-50 text-green-700":"bg-slate-100 text-slate-500"}`}>
              {liveConnected?<Wifi className="w-3.5 h-3.5"/>:<WifiOff className="w-3.5 h-3.5"/>}{liveConnected?"Live":"Offline"}
            </div>
            <span className="text-sm text-slate-500">Welcome, <span className="font-medium text-slate-700">{userName}</span></span>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600"><LogOut className="w-4 h-4"/>Logout</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          {[
            {label:"Total Orders",value:orders.length,color:"text-blue-600 bg-blue-50",icon:<ClipboardList className="w-4 h-4"/>},
            {label:"Pending",value:orders.filter(o=>o.status==="pending").length,color:"text-amber-600 bg-amber-50",icon:<Clock className="w-4 h-4"/>},
            {label:"In Progress",value:orders.filter(o=>o.status==="in_progress").length,color:"text-blue-600 bg-blue-50",icon:<RefreshCw className="w-4 h-4"/>},
            {label:"Completed",value:orders.filter(o=>o.status==="completed").length,color:"text-green-600 bg-green-50",icon:<CheckCircle className="w-4 h-4"/>},
            {label:"Active Agents",value:agents.filter(a=>a.available).length,color:"text-purple-600 bg-purple-50",icon:<Users className="w-4 h-4"/>},
          ].map(card=>(
            <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${card.color}`}>{card.icon}</div>
              <div className="text-2xl font-bold text-slate-900">{card.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 flex-wrap">
          {TABS.map(([t,label,icon])=>(
            <button key={t} onClick={()=>setTab(t as typeof tab)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${tab===t?"bg-white text-slate-900 shadow-sm":"text-slate-500 hover:text-slate-700"}`}>
              {icon}{label}
              {t==="samples"&&samples.length>0&&<span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{samples.length}</span>}
            </button>
          ))}
        </div>

        {loading ? <div className="text-center py-16 text-slate-400">Loading…</div>

        : tab==="orders" ? (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">All Orders ({orders.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Order / Address</th>
                    <th className="text-left px-4 py-3">Client</th>
                    <th className="text-left px-4 py-3">Service</th>
                    <th className="text-left px-4 py-3">Price</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Assign Agent</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map(order=>{
                    const orderBids = bidsData[order.id]??[];
                    const showingBids = bidsFor===order.id;
                    return (
                      <>
                        <tr key={order.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="font-mono text-xs text-slate-400 mb-0.5">{order.id}</div>
                            <div className="text-xs font-medium text-slate-700 max-w-[160px] truncate">{order.address}</div>
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded mt-1 inline-block ${TIER_BADGES[order.turnaroundTier]}`}>{order.turnaroundTier.replace(/_/g," ")}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">{order.client?.name??order.clientId}</td>
                          <td className="px-4 py-3 text-xs font-medium text-slate-700 capitalize">{order.serviceType.replace(/_/g," ")}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">${order.totalPrice}</div>
                            <div className="text-xs text-green-600">Agent: ${order.compensationAmount}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
                              {STATUS_ICONS[order.status]}{order.status.replace("_"," ")}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {order.acceptedBidId ? (
                              <span className="text-xs text-green-700 font-medium">✓ {order.agent?.name??"Assigned"}</span>
                            ) : (
                              <select value={order.assignedAgentId??""} onChange={e=>assignAgent(order.id,e.target.value||null,e.target.value?"in_progress":"pending")}
                                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                                <option value="">Unassigned</option>
                                {agents.map(a=><option key={a.id} value={a.id}>{a.name}{a.available?" ✓":""}</option>)}
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <select value={order.status} onChange={e=>updateStatus(order.id,e.target.value)}
                                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                              {order.status==="pending"&&!order.acceptedBidId&&(
                                <>
                                  <button onClick={()=>{setBidModal({orderId:order.id,orderAddr:order.address});setBidAmount(String(order.compensationAmount));}}
                                    className="flex items-center gap-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium px-2 py-1.5 rounded-lg border border-blue-200">
                                    <Gavel className="w-3 h-3"/>Bid
                                  </button>
                                  <button onClick={()=>{if(showingBids){setBidsFor(null);}else{fetchBids(order.id);setBidsFor(order.id);}}}
                                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1.5 rounded-lg">
                                    Bids{(order.bids?.length??0)>0&&` (${order.bids!.length})`}
                                  </button>
                                </>
                              )}
                              {/* Confirm payment button for under-review orders */}
                              {(order as unknown as Record<string,unknown>).payment_status === "pending" && (
                                <button onClick={async()=>{
                                  await fetch(`/api/orders/${order.id}`, {method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({confirmPayment:true})});
                                }} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1.5 rounded-lg whitespace-nowrap">
                                  ✓ Confirm Pay
                                </button>
                              )}
                              <button onClick={()=>window.open(`/api/orders/${order.id}/invoice`,"_blank")}
                                className="p-1.5 text-slate-400 hover:text-blue-600 border border-slate-200 rounded-lg">
                                <Download className="w-3.5 h-3.5"/>
                              </button>
                            </div>
                          </td>
                        </tr>
                        {showingBids&&(
                          <tr key={`${order.id}-bids`}>
                            <td colSpan={7} className="px-6 py-3 bg-blue-50/50">
                              <p className="text-xs font-semibold text-slate-600 mb-2">Bids on this order</p>
                              {orderBids.length===0 ? <p className="text-xs text-slate-400">No bids yet.</p>
                              : orderBids.map(bid=>(
                                <div key={bid.id} className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border mb-2 ${bid.status==="accepted"?"bg-green-50 border-green-200":bid.status==="rejected"?"bg-red-50 border-red-200 opacity-60":"bg-white border-slate-200"}`}>
                                  <div>
                                    <span className="text-sm font-semibold text-slate-800">{bid.agentName}</span>
                                    {bid.agentRating&&<span className="ml-2 text-xs text-amber-600">★ {bid.agentRating.toFixed(1)}</span>}
                                    {bid.placedByAdmin&&<span className="ml-2 text-xs text-slate-400">(admin)</span>}
                                    {bid.message&&<p className="text-xs text-slate-500 mt-0.5">"{bid.message}"</p>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-green-700">${bid.amount}</span>
                                    {bid.status==="pending"&&(
                                      <>
                                        <button onClick={()=>respondToBid(order.id,bid.id,"accept")} disabled={actingBid===bid.id}
                                          className="text-xs bg-green-600 hover:bg-green-700 text-white font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50">
                                          {actingBid===bid.id?"…":"Accept"}
                                        </button>
                                        <button onClick={()=>respondToBid(order.id,bid.id,"reject")} disabled={actingBid===bid.id}
                                          className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50">Reject</button>
                                      </>
                                    )}
                                    {bid.status==="accepted"&&<span className="text-xs text-green-700 font-semibold">✓ Accepted</span>}
                                    {bid.status==="rejected"&&<span className="text-xs text-red-600">Rejected</span>}
                                  </div>
                                </div>
                              ))}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                  {orders.length===0&&<tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">No orders yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

        ) : tab==="agents" ? (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Field Agents</h2>
              <span className="text-xs text-slate-400">{agents.filter(a=>a.available).length}/{agents.length} available</span>
            </div>
            <div className="divide-y divide-slate-100">
              {agents.map(agent=>{
                const editedRating = ratingEdit[agent.id];
                const displayRating = editedRating??agent.rating;
                return (
                  <div key={agent.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-semibold text-slate-900">{agent.name}</span>
                          {agent.approved===false&&<span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Pending Approval</span>}
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${agent.available?"bg-green-50 text-green-700 border-green-200":"bg-slate-50 text-slate-500 border-slate-200"}`}>
                            {agent.available?"Available":"Unavailable"}
                          </span>
                          <button onClick={()=>toggleAgentAvailability(agent)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600">
                            {agent.available?<ToggleRight className="w-4 h-4 text-green-500"/>:<ToggleLeft className="w-4 h-4"/>}Toggle
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3"/>{agent.email}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{agent.coverageZone||"—"}</span>
                          <span className="flex items-center gap-1"><Car className="w-3 h-3"/>{agent.vehicle||"—"}</span>
                          {agent.grade!=null&&<span className="flex items-center gap-1"><ZapIcon className="w-3 h-3 text-purple-500"/>Grade: {agent.grade}/5</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(n=>(
                            <button key={n} onClick={()=>setRatingEdit(prev=>({...prev,[agent.id]:n}))}
                              className={`w-5 h-5 ${n<=displayRating?"text-amber-400":"text-slate-200 hover:text-amber-300"}`}>
                              <Star className="w-full h-full fill-current"/>
                            </button>
                          ))}
                          <span className="text-sm font-bold text-slate-600 ml-1">{displayRating?.toFixed(1)}</span>
                          {editedRating!=null&&(
                            <button onClick={()=>saveAgentRating(agent.id)} disabled={saving===`rating-${agent.id}`}
                              className="ml-1 text-xs bg-blue-600 text-white px-2 py-1 rounded-lg">{saving===`rating-${agent.id}`?"…":"Save"}</button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                      <div className="flex-1 grid grid-cols-3 gap-3 text-center">
                        <div><div className="text-sm font-bold text-green-700">${agent.totalEarnings}</div><div className="text-xs text-slate-400">Total Earned</div></div>
                        <div><div className={`text-sm font-bold ${agent.pendingPayout>0?"text-purple-700":"text-slate-400"}`}>${agent.pendingPayout}</div><div className="text-xs text-slate-400">Pending</div></div>
                        <div><div className="text-sm font-bold text-slate-700">{agent.completedJobs}</div><div className="text-xs text-slate-400">Jobs</div></div>
                      </div>
                      {agent.pendingPayout>0&&(
                        <button onClick={()=>setPayoutModal({agentId:agent.id,agentName:agent.name,pendingPayout:agent.pendingPayout})}
                          className="flex items-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold px-3 py-2 rounded-lg">
                          <CreditCard className="w-3.5 h-3.5"/>Pay ${agent.pendingPayout}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {agents.length===0&&<div className="text-center py-12 text-slate-400"><Users className="w-8 h-8 mx-auto mb-2 text-slate-300"/><p>No agents yet</p></div>}
            </div>
          </div>

        ) : tab==="users" ? (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><UserPlus className="w-5 h-5 text-purple-600"/>Add New User</h2>
              {addUserError&&<div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{addUserError}</div>}
              {addUserSuccess&&<div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl font-mono">{addUserSuccess}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {label:"Role *",type:"select",key:"role",opts:["agent","client"]},
                  {label:"Full Name *",type:"text",key:"name",ph:"Jane Smith"},
                  {label:"Email *",type:"email",key:"email",ph:"jane@example.com"},
                  {label:"Phone",type:"text",key:"phone",ph:"555-0101"},
                ].map(f=>(
                  <div key={f.key}>
                    <label className="text-xs font-medium text-slate-600 block mb-1">{f.label}</label>
                    {f.type==="select" ? (
                      <select value={newUser[f.key as keyof typeof newUser]} onChange={e=>setNewUser(u=>({...u,[f.key]:e.target.value}))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                        {f.opts!.map(o=><option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
                      </select>
                    ) : (
                      <input type={f.type} value={newUser[f.key as keyof typeof newUser]} onChange={e=>setNewUser(u=>({...u,[f.key]:e.target.value}))}
                        placeholder={f.ph}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
                    )}
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Password *</label>
                  <div className="relative">
                    <input type={showPass?"text":"password"} value={newUser.password} onChange={e=>setNewUser(u=>({...u,password:e.target.value}))}
                      placeholder="Set their login password"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
                    <button type="button" onClick={()=>setShowPass(p=>!p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPass?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                    </button>
                  </div>
                </div>
                {newUser.role==="client"&&(
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Company</label>
                    <input value={newUser.company} onChange={e=>setNewUser(u=>({...u,company:e.target.value}))} placeholder="Acme Realty LLC"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
                  </div>
                )}
              </div>
              <button onClick={addUser} disabled={addingUser}
                className="mt-4 flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl">
                <UserPlus className="w-4 h-4"/>{addingUser?"Creating…":`Create ${newUser.role==="agent"?"Agent":"Client"}`}
              </button>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-900">All Users ({allUsers.length})</h2></div>
              <div className="divide-y divide-slate-100">
                {allUsers.map(u=>(
                  <div key={u.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">{u.name}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.role==="admin"?"bg-purple-100 text-purple-700":u.role==="agent"?"bg-green-100 text-green-700":"bg-blue-100 text-blue-700"}`}>{u.role}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{u.email}{u.phone&&` · ${u.phone}`}{u.company&&` · ${u.company}`}</div>
                    </div>
                    <div className="text-xs text-slate-400" suppressHydrationWarning>{u.createdAt?new Date(u.createdAt).toLocaleDateString():""}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        ) : tab==="samples" ? (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Agent Sample Reviews</h2>
              <p className="text-xs text-slate-400 mt-0.5">Review agent sample submissions before approving them to take orders</p>
            </div>
            {samples.length===0 ? (
              <div className="text-center py-12 text-slate-400"><ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-300"/><p>No pending samples</p></div>
            ) : samples.map(s=>(
              <div key={s.id} className="p-6 border-b border-slate-100 last:border-0">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-semibold text-slate-900">{s.agentName}</span>
                    <span className="ml-2 text-xs text-slate-500">{s.agentEmail}</span>
                    <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Pending Review</span>
                  </div>
                  <span className="text-xs text-slate-400" suppressHydrationWarning>{new Date(s.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-4">
                  {(s.photos??[]).map((src,i)=>(
                    <div key={i} className="aspect-video rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                      {src.startsWith("data:") ? (
                        <img src={src} alt={`sample ${i+1}`} className="w-full h-full object-cover"/>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Photo {i+1}</div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>reviewSample(s.id,"approved")}
                    className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl">
                    <CheckCircle className="w-4 h-4"/>Approve — Activate Agent
                  </button>
                  <button onClick={()=>reviewSample(s.id,"rejected")}
                    className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold px-4 py-2 rounded-xl border border-red-200">
                    <XCircle className="w-4 h-4"/>Reject — Request Resubmission
                  </button>
                </div>
              </div>
            ))}
          </div>) : tab==="payouts" ? (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">Agent Payouts</h2>
                <p className="text-xs text-slate-400 mt-0.5">Agents with pending balance ≥ $40 are eligible for weekly payout</p>
              </div>
              <div className="divide-y divide-slate-100">
                {agents.filter(a=>a.pendingPayout>0).map(a=>(
                  <div key={a.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div>
                      <span className="font-medium text-slate-800">{a.name}</span>
                      <span className="ml-2 text-xs text-slate-500">{a.email}</span>
                      <div className="text-xs text-slate-500 mt-0.5">Total earned: ${a.totalEarnings} · Jobs: {a.completedJobs}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-purple-700">${a.pendingPayout}</span>
                      <button onClick={()=>setPayoutModal({agentId:a.id,agentName:a.name,pendingPayout:a.pendingPayout})}
                        className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-3 py-2 rounded-xl">
                        <CreditCard className="w-4 h-4"/>Process Payout
                      </button>
                    </div>
                  </div>
                ))}
                {agents.filter(a=>a.pendingPayout>0).length===0&&(
                  <div className="text-center py-12 text-slate-400"><CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300"/><p>No pending payouts</p></div>
                )}
              </div>
            </div>
            {payouts.length>0&&(
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-900">Payout History</h2></div>
                <div className="divide-y divide-slate-100">
                  {payouts.map((p,i)=>(
                    <div key={i} className="px-6 py-4 flex items-center justify-between gap-4">
                      <div>
                        <span className="font-medium text-slate-800">{(p.users as {name:string}|undefined)?.name??p.agent_id}</span>
                        <span className="ml-2 text-xs text-slate-500">{p.paypal_email}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-700">${p.amount}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.status==="paid"?"bg-green-100 text-green-700":"bg-amber-100 text-amber-700"}`}>{p.status}</span>
                        <span className="text-xs text-slate-400" suppressHydrationWarning>{new Date(p.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        ) : tab==="pricing" ? (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h2 className="font-semibold text-slate-900 mb-1">Service Catalog &amp; Pricing</h2>
              <p className="text-xs text-slate-500">Edit base price (standard tier) and agent compensation for all 45+ services. Rush prices are calculated: 24hr = base + $15, 6hr = base + $35.</p>
            </div>
            {(pricingCatalog.length > 0 ? pricingCatalog : [{id:"loading",label:"Loading…",services:[]}]).map(cat=>(
              <div key={cat.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                {/* Category header */}
                <button onClick={()=>setExpandedPricingCat(expandedPricingCat===cat.id?"":cat.id)}
                  className="w-full flex items-center justify-between px-6 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-slate-900">{cat.label}</h3>
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{cat.services.length} services</span>
                    <span className="text-xs text-green-600">{cat.services.filter(s=>s.active!==false).length} active</span>
                  </div>
                  {expandedPricingCat===cat.id ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
                </button>

                {expandedPricingCat===cat.id&&(
                  <div className="divide-y divide-slate-100">
                    {/* Column headers */}
                    <div className="grid grid-cols-12 gap-2 px-6 py-2 bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wide">
                      <div className="col-span-4">Service</div>
                      <div className="col-span-2 text-center">Standard $</div>
                      <div className="col-span-2 text-center">Rush 24hr $</div>
                      <div className="col-span-2 text-center">Rush 6hr $</div>
                      <div className="col-span-1 text-center">Agent $</div>
                      <div className="col-span-1 text-center">Active</div>
                    </div>

                    {cat.services.map(svc=>{
                      const edits = editingPrice[svc.id] ?? {};
                      const basePrice = edits.basePrice ?? svc.basePrice;
                      const compensation = edits.compensation ?? svc.compensation;
                      const active = edits.active ?? svc.active;
                      const rush24 = Math.round(Number(basePrice) + 15);
                      const rush6  = Math.round(Number(basePrice) + 35);
                      const isDirty = Object.keys(edits).length > 0;

                      return (
                        <div key={svc.id} className={`grid grid-cols-12 gap-2 px-6 py-3 items-center ${!active?"opacity-50":""}`}>
                          {/* Service name + description */}
                          <div className="col-span-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-medium text-slate-800">{svc.name}</span>
                              {svc.photoCount&&<span className="text-xs text-slate-400">{svc.photoCount}ph</span>}
                              {svc.requiresInterior&&<span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">Interior</span>}
                              {svc.isCustom&&<span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">Custom</span>}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 truncate">{svc.description}</p>
                          </div>

                          {/* Standard price — editable */}
                          <div className="col-span-2">
                            {svc.isCustom ? (
                              <span className="text-xs text-slate-400 text-center block">Client sets</span>
                            ) : (
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                <input type="number" min="0" value={basePrice}
                                  onChange={e=>setEditingPrice(prev=>({...prev,[svc.id]:{...prev[svc.id],basePrice:Number(e.target.value)}}))}
                                  className="w-full pl-5 pr-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-400"/>
                              </div>
                            )}
                          </div>

                          {/* Rush 24hr — auto calculated */}
                          <div className="col-span-2 text-center">
                            {svc.isCustom ? <span className="text-xs text-slate-300">—</span>
                            : <span className="text-sm font-medium text-amber-600">${rush24}</span>}
                          </div>

                          {/* Rush 6hr — auto calculated */}
                          <div className="col-span-2 text-center">
                            {svc.isCustom ? <span className="text-xs text-slate-300">—</span>
                            : <span className="text-sm font-medium text-red-500">${rush6}</span>}
                          </div>

                          {/* Agent compensation — editable */}
                          <div className="col-span-1">
                            {svc.isCustom ? (
                              <span className="text-xs text-slate-400 text-center block">65%</span>
                            ) : (
                              <div className="relative">
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                <input type="number" min="0" value={compensation}
                                  onChange={e=>setEditingPrice(prev=>({...prev,[svc.id]:{...prev[svc.id],compensation:Number(e.target.value)}}))}
                                  className="w-full pl-4 pr-1 py-1.5 border border-slate-200 rounded-lg text-xs text-center focus:outline-none focus:ring-2 focus:ring-green-400"/>
                              </div>
                            )}
                          </div>

                          {/* Active toggle + save */}
                          <div className="col-span-1 flex items-center justify-center gap-1.5">
                            <button onClick={()=>setEditingPrice(prev=>({...prev,[svc.id]:{...prev[svc.id],active:!active}}))}
                              className={`w-9 h-5 rounded-full relative transition-colors flex-shrink-0 ${active?"bg-green-500":"bg-slate-300"}`}>
                              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${active?"translate-x-4":"translate-x-0.5"}`}/>
                            </button>
                            {isDirty&&(
                              <button onClick={()=>savePricing(svc.id)} disabled={saving===svc.id}
                                className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-2 py-1 rounded-lg disabled:opacity-50 whitespace-nowrap">
                                {saving===svc.id?"…":"Save"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Email Log</h2>
              <p className="text-xs text-slate-400">Stub emails — no real delivery</p>
            </div>
            {emails.length===0 ? (
              <div className="text-center py-12 text-slate-400"><Mail className="w-8 h-8 mx-auto mb-2 text-slate-300"/><p>No emails logged yet</p></div>
            ) : (
              <div className="divide-y divide-slate-100">
                {emails.map((e,i)=>(
                  <div key={i} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${e.type.includes("bid")?"bg-purple-50 text-purple-700":e.type.includes("complete")?"bg-green-50 text-green-700":"bg-slate-50 text-slate-600"}`}>{e.type.replace(/_/g," ")}</span>
                          <span className="text-xs text-slate-400">To: {e.to}</span>
                        </div>
                        <p className="font-medium text-slate-800 text-sm">{e.subject}</p>
                        {e.body&&<p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{e.body}</p>}
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap" suppressHydrationWarning>{new Date(e.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bid Modal */}
      {bidModal&&(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Place Bid on Behalf of Agent</h3>
              <button onClick={()=>setBidModal(null)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"><X className="w-5 h-5"/></button>
            </div>
            <p className="text-xs text-slate-500 mb-4 bg-slate-50 rounded-lg px-3 py-2">{bidModal.orderAddr}</p>
            {bidError&&<div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{bidError}</div>}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Agent *</label>
                <select value={bidAgentId} onChange={e=>setBidAgentId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">Select agent…</option>
                  {agents.map(a=><option key={a.id} value={a.id}>{a.name}{a.available?" (available)":""}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Amount ($) *</label>
                <input type="number" min="1" value={bidAmount} onChange={e=>setBidAmount(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Message</label>
                <input value={bidMessage} onChange={e=>setBidMessage(e.target.value)} placeholder="Optional message from agent"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={submitAdminBid} disabled={submittingBid}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl">
                <Gavel className="w-4 h-4"/>{submittingBid?"Placing…":"Place Bid"}
              </button>
              <button onClick={()=>setBidModal(null)} className="px-4 text-slate-500 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Payout Modal */}
      {payoutModal&&(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Process Payout — {payoutModal.agentName}</h3>
              <button onClick={()=>setPayoutModal(null)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"><X className="w-5 h-5"/></button>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 mb-4 text-center">
              <div className="text-3xl font-bold text-purple-700">${payoutModal.pendingPayout}</div>
              <div className="text-xs text-purple-500 mt-1">Pending balance</div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Agent PayPal Email *</label>
              <input type="email" value={paypalEmail} onChange={e=>setPaypalEmail(e.target.value)} placeholder="agent@paypal.com"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={processPayout} disabled={processingPayout||!paypalEmail}
                className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl">
                <CreditCard className="w-4 h-4"/>{processingPayout?"Processing…":"Process Payout"}
              </button>
              <button onClick={()=>setPayoutModal(null)} className="px-4 text-slate-500 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
