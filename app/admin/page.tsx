"use client";
import { uploadImageFile } from "@/lib/uploadClient";
import { etDate, etDateTime, etTime } from "@/lib/est";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut, Users, DollarSign, ClipboardList, RefreshCw, Save, Camera,
  CheckCircle, Clock, XCircle, Wifi, WifiOff, Star, ToggleLeft, ToggleRight,
  Mail, MapPin, Car, Download, Package, Gavel, UserPlus, Eye, EyeOff, X,
  ShieldCheck, CreditCard, AlertCircle, ZapIcon, ChevronDown, ChevronUp, Link as LinkIcon, Plus as PlusIcon, Trash as TrashIcon,
  AlertTriangle, History, Camera as CameraIcon, Wallet as WalletIcon, Upload, BarChart3, User as UserIcon,
} from "lucide-react";

interface Order { id: string; address: string; status: string; clientId: string; assignedAgentId: string | null; totalPrice: number; compensationAmount: number; serviceType: string; turnaroundTier: string; notes: string; createdAt: string; client?: { name: string; email: string } | null; agent?: { name: string; rating?: number } | null; bids?: Bid[]; acceptedBidId?: string | null; photos?: { id: string; filename: string; url: string; description: string; approved?: boolean }[]; }
interface PhotoSub { id: string; agentId: string; agentName?: string; orderId: string | null; serviceName: string; photos: { label: string; filename: string; url: string }[]; status: string; createdAt: string; }
interface Bid { id: string; agentId: string; agentName: string; agentRating: number | null; amount: number; message: string; placedAt: string; status: string; placedByAdmin?: boolean; }
interface Agent { id: string; name: string; email: string; phone: string; coverageZone: string; vehicle: string; available: boolean; rating: number; totalEarnings: number; pendingPayout: number; completedJobs: number; grade?: number; approved?: boolean; state?: string; backgroundCheckStatus?: string; smsOptIn?: boolean; }
interface AUser { id: string; name: string; email: string; role: string; phone: string; company?: string; createdAt?: string; accountActive?: boolean; suspended?: boolean; }
interface AdminDispute { id: string; orderId: string; clientId: string; clientName?: string; clientEmail?: string; orderAddress?: string; reason: string; description: string; status: string; resolution?: string | null; resolutionAmount?: number; resolutionNotes?: string; createdAt: string; }
interface AuditEntry { id: number; actor_name: string; action: string; target_type: string; target_id: string; details: Record<string, unknown>; created_at: string; }
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
  const [tab, setTab] = useState<"orders"|"agents"|"users"|"wallet"|"samples"|"payouts"|"payment-links"|"pricing"|"emails"|"disputes"|"audit"|"photos">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  // Agents grouped by resolved state, states sorted alphabetically, agents sorted by name within each state
  const agentsByState = agents
    .map(a => ({ ...a, __state: a.state ?? "Unassigned" }))
    .sort((a, b) => a.__state.localeCompare(b.__state) || a.name.localeCompare(b.name));
  const [allUsers, setAllUsers] = useState<AUser[]>([]);
  const [pricing, setPricing] = useState<PricingConfig[]>([]);
  const [pricingCatalog, setPricingCatalog] = useState<CatalogCategory[]>([]);
  const [expandedPricingCat, setExpandedPricingCat] = useState<string>("real_estate");
  const [emails, setEmails] = useState<EmailEntry[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [pendingTopups, setPendingTopups] = useState<{id:string;userId:string;amount:number;description:string;createdAt:string;userName?:string;userEmail?:string}[]>([]);
  const [confirmingTopup, setConfirmingTopup] = useState<string|null>(null);
  const [walletPlans, setWalletPlans] = useState<{id:string;name:string;amountUsd:number;credits:number;description:string;active:boolean;sortOrder:number}[]>([]);
  const [newPlan, setNewPlan] = useState({ name: "", amount: "", description: "", sortOrder: "0" });
  const [editingPlan, setEditingPlan] = useState<{id:string;name:string;amount:string;description:string;sortOrder:string}|null>(null);
  const [planBusy, setPlanBusy] = useState<string|null>(null);
  const [planError, setPlanError] = useState("");
  const [planSuccess, setPlanSuccess] = useState("");
  const [whopPayments, setWhopPayments] = useState<{
    txId: string; userId: string; userName: string; userEmail: string; amount: number;
    purpose: string; status: string; description: string; planName: string | null;
    whopPaymentId: string | null; whopCheckoutId: string | null; failureMessage: string | null;
    confirmedAt: string | null; createdAt: string;
    webhookEventType: string | null; webhookEventId: string | null; webhookAt: string | null;
  }[]>([]);
  const [whopWebhooks, setWhopWebhooks] = useState<{
    eventId: string; eventType: string; paymentId: string | null; userId: string | null;
    userName: string | null; userEmail: string | null; purpose: string | null;
    processedAt: string; createdAt: string;
  }[]>([]);
  const [whopActivityLoading, setWhopActivityLoading] = useState(false);
  const [showWhopWebhooks, setShowWhopWebhooks] = useState(false);
  const [agentApplications, setAgentApplications] = useState<Record<string,unknown>[]>([]);
  const [editingPrice, setEditingPrice] = useState<Record<string,Partial<PricingConfig>>>({});
  const [ratingEdit, setRatingEdit] = useState<Record<string,number>>({});
  const [loading, setLoading] = useState(true);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [ntfyConfigured, setNtfyConfigured] = useState(true);
  const [emailConfigured, setEmailConfigured] = useState(true);
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
  const [editingLink, setEditingLink] = useState<{id:string;label:string;url:string;amount:string;description:string}|null>(null);
  const [addingLink, setAddingLink] = useState(false);
  const [linkError, setLinkError] = useState("");

  // Payouts
  const [payoutModal, setPayoutModal] = useState<{agentId:string;agentName:string;pendingPayout:number}|null>(null);
  const [annOpen, setAnnOpen] = useState(false);
  const [annMsg, setAnnMsg] = useState("");
  const [annAudience, setAnnAudience] = useState("all");
  const [annActive, setAnnActive] = useState<{id:number;message:string;audience:string}|null>(null);
  const [annSaving, setAnnSaving] = useState(false);

  const fetchAnnouncement = useCallback(async () => {
    const r = await fetch("/api/announcements?all=1");
    const d = await r.json();
    const active = (d.announcements ?? []).find((a: {active:boolean}) => a.active);
    setAnnActive(active ?? null);
  }, []);
  useEffect(() => { fetchAnnouncement(); }, [fetchAnnouncement]);

  async function publishAnnouncement() {
    if (!annMsg.trim()) return;
    setAnnSaving(true);
    await fetch("/api/announcements", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ message: annMsg, audience: annAudience }) });
    setAnnMsg(""); setAnnOpen(false); setAnnSaving(false); fetchAnnouncement();
  }

  async function clearAnnouncement() {
    if (!annActive) return;
    setAnnSaving(true);
    await fetch("/api/announcements", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id: annActive.id, active: false }) });
    setAnnSaving(false); fetchAnnouncement();
  }
  const [resolveDisputeModal, setResolveDisputeModal] = useState<{id:string;clientName:string}|null>(null);
  const [resolveChoice, setResolveChoice] = useState<"reshoot"|"wallet_credit"|"rejected"|"other">("reshoot");
  const [resolveAmount, setResolveAmount] = useState("");
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolvingDispute, setResolvingDispute] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState("");
  const [processingPayout, setProcessingPayout] = useState(false);

  const fetchAll = useCallback(async () => {
    const [agentsRes, pricingRes, meRes, emailsRes, linksRes] = await Promise.all([
      fetch("/api/agents?all=1"), fetch("/api/pricing"), fetch("/api/auth/me"), fetch("/api/email-log"), fetch("/api/payment-links"),
    ]);
    const [agentsData, pricingData, meData, emailsData, linksData] = await Promise.all([
      agentsRes.json(), pricingRes.json(), meRes.json(), emailsRes.json(), linksRes.json(),
    ]);
    setAgents(agentsData.agents ?? []);
    setPricing(pricingData.pricing ?? []);
    setPricingCatalog(pricingData.catalog ?? []);
    setEmails(emailsData.emails ?? []);
    setAllUsers(agentsData.allUsers ?? []);
    setPaymentLinks(linksData.links ?? []);
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

  const fetchWallet = useCallback(async () => {
    const r = await fetch("/api/wallet");
    const d = await r.json();
    setPendingTopups(d.pending ?? []);
  }, []);

  const fetchWalletPlans = useCallback(async () => {
    const r = await fetch("/api/wallet/plans?all=1");
    const d = await r.json();
    setWalletPlans(d.plans ?? []);
  }, []);

  const fetchWhopActivity = useCallback(async () => {
    setWhopActivityLoading(true);
    try {
      const r = await fetch("/api/wallet/whop-activity?limit=50");
      const d = await r.json();
      if (r.ok) {
        setWhopPayments(d.payments ?? []);
        setWhopWebhooks(d.webhooks ?? []);
      }
    } finally {
      setWhopActivityLoading(false);
    }
  }, []);

  const fetchApplications = useCallback(async () => {
    const r = await fetch("/api/applications");
    const d = await r.json();
    setAgentApplications(d.applications ?? []);
  }, []);

  const fetchPayouts = useCallback(async () => {
    const r = await fetch("/api/payouts");
    const d = await r.json();
    setPayouts(d.payouts ?? []);
  }, []);

  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [disputeFilter, setDisputeFilter] = useState<string>("open");
  const fetchDisputes = useCallback(async (status?: string) => {
    const r = await fetch(`/api/disputes${status && status !== "all" ? `?status=${status}` : ""}`);
    const d = await r.json();
    setDisputes(d.disputes ?? []);
  }, []);

  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const fetchAuditLog = useCallback(async () => {
    const r = await fetch("/api/audit-log");
    const d = await r.json();
    setAuditLog(d.log ?? []);
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
  useEffect(() => { if (tab === "disputes") fetchDisputes(disputeFilter); }, [tab, fetchDisputes, disputeFilter]);
  useEffect(() => { if (tab === "audit") fetchAuditLog(); }, [tab, fetchAuditLog]);
  useEffect(() => {
    if (tab === "wallet") {
      fetchWallet();
      fetchWalletPlans();
      fetchWhopActivity();
    }
  }, [tab, fetchWallet, fetchWalletPlans, fetchWhopActivity]);
  useEffect(() => { if (tab === "users") fetchApplications(); }, [tab, fetchApplications]);

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

  async function updateBackgroundCheck(agentId: string, status: string) {
    const prev = agents.find(a => a.id === agentId)?.backgroundCheckStatus;
    // Optimistic UI, but verified below
    setAgents(p => p.map(a => a.id===agentId ? {...a, backgroundCheckStatus: status} : a));
    const r = await fetch(`/api/agents/${agentId}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ backgroundCheckStatus: status }) })
      .catch(() => null);
    if (!r || !r.ok) {
      const d = r ? await r.json().catch(()=>({} as {error?:string})) : {} as {error?:string};
      alert(`Background check status did NOT save: ${d.error ?? "network error"}.\n\nIf this mentions a missing column, run supabase/migrations_v6.sql in the Supabase SQL editor.`);
      setAgents(p => p.map(a => a.id===agentId ? {...a, backgroundCheckStatus: prev} : a));
      return;
    }
    // Double-check it actually persisted
    const check = await fetch(`/api/agents/${agentId}`).then(x=>x.json()).catch(()=>null);
    if (check?.agent && check.agent.backgroundCheckStatus !== status) {
      alert("Background check status did not persist in the database. Run supabase/migrations_v6.sql to add the missing columns, then try again.");
      setAgents(p => p.map(a => a.id===agentId ? {...a, backgroundCheckStatus: check.agent.backgroundCheckStatus} : a));
    }
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

  async function deleteOrder(orderId: string, address: string) {
    if (!confirm(`Delete this order permanently?\n\n${address}\n\nAll bids, photos and history will be removed. Any held wallet funds are refunded to the vendor.`)) return;
    const r = await fetch(`/api/orders/${orderId}`, { method:"DELETE" });
    if (!r.ok) { const d = await r.json().catch(()=>({})); alert(d.error ?? "Failed to delete order"); }
  }

  async function deleteBid(orderId: string, bidId: string) {
    if (!confirm("Delete this bid permanently?")) return;
    const r = await fetch(`/api/orders/${orderId}/bids`, { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ bidId }) });
    if (!r.ok) { const d = await r.json().catch(()=>({})); alert(d.error ?? "Failed to delete bid"); return; }
    fetchBids(orderId);
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

  async function reviewSample(sampleId: string, decision: "approved"|"rejected", agentId: string) {
    await fetch(`/api/samples/${sampleId}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ decision, agentId }) });
    fetchSamples();
    fetchAll();
  }

  async function activateUser(userId: string, action: "activate"|"suspend"|"unsuspend") {
    setSaving(`user-${userId}`);
    await fetch(`/api/users/${userId}`, {
      method: "PATCH", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ action }),
    });
    setSaving(null);
    fetchAll();
  }

  async function confirmTopup(txId: string, action: "confirm"|"cancel") {
    setConfirmingTopup(txId);
    await fetch(`/api/wallet/${txId}`, {
      method: "PATCH", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ action }),
    });
    setConfirmingTopup(null);
    fetchWallet();
    fetchAll(); // refresh wallet balances on users
  }

  async function saveEditLink() {
    if (!editingLink) return;
    setSaving("edit-link");
    await fetch(`/api/payment-links/${editingLink.id}`, {
      method: "PATCH", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ label: editingLink.label, url: editingLink.url, amount: editingLink.amount ? Number(editingLink.amount) : undefined, description: editingLink.description }),
    });
    setSaving(null); setEditingLink(null); fetchPaymentLinks();
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

  async function submitDisputeResolution() {
    if (!resolveDisputeModal) return;
    if (resolveChoice === "wallet_credit" && (!resolveAmount || Number(resolveAmount) <= 0)) return;
    setResolvingDispute(true);
    await fetch(`/api/disputes/${resolveDisputeModal.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolution: resolveChoice, amount: resolveAmount ? Number(resolveAmount) : undefined, notes: resolveNotes }),
    });
    setResolvingDispute(false);
    setResolveDisputeModal(null); setResolveChoice("reshoot"); setResolveAmount(""); setResolveNotes("");
    fetchDisputes(disputeFilter);
  }

  // ── Photo Inbox ──
  const [submissions, setSubmissions] = useState<PhotoSub[]>([]);
  const [subSendTarget, setSubSendTarget] = useState<Record<string,string>>({});
  const [photoActing, setPhotoActing] = useState<string|null>(null);
  const fetchSubmissions = useCallback(async () => {
    const r = await fetch("/api/submissions");
    const d = await r.json();
    setSubmissions(d.submissions ?? []);
  }, []);
  useEffect(()=>{ fetchSubmissions(); }, [fetchSubmissions]);
  useEffect(()=>{ if(tab==="photos") fetchSubmissions(); }, [tab, fetchSubmissions]);

  async function releasePhoto(orderId: string, photoId: string) {
    setPhotoActing(photoId);
    await fetch(`/api/orders/${orderId}/photos`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ photoId, approved: true }) });
    setPhotoActing(null);
  }
  async function releaseAllPhotos(orderId: string) {
    setPhotoActing(orderId);
    await fetch(`/api/orders/${orderId}/photos`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ approveAll: true }) });
    setPhotoActing(null);
  }
  async function deletePhoto(orderId: string, photoId: string) {
    if (!confirm("Delete this photo?")) return;
    setPhotoActing(photoId);
    await fetch(`/api/orders/${orderId}/photos`, { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ photoId }) });
    setPhotoActing(null);
  }
  async function actOnSubmission(id: string, action: "send"|"dismiss", orderId?: string) {
    setPhotoActing(id);
    const r = await fetch("/api/submissions", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id, action, orderId }) });
    if (!r.ok) { const d = await r.json().catch(()=>({})); alert(d.error ?? "Failed"); }
    setPhotoActing(null);
    fetchSubmissions();
  }

  // ── Admin uploads photos on behalf of the assigned agent (vendor sees "User XXXXXXX uploaded") ──
  const [oboOrderId, setOboOrderId] = useState("");
  const [oboFiles, setOboFiles] = useState<{filename:string;url:string}[]>([]);
  const [oboRelease, setOboRelease] = useState(true);
  const [oboUploading, setOboUploading] = useState(false);
  const oboFileRef = useRef<HTMLInputElement>(null);

  function oboPickFiles(files: FileList | null) {
    if (!files || !oboOrderId) return;
    setOboUploading(true);
    // Direct-to-storage — any image type, any size, no file-count limit
    Promise.all(Array.from(files).map(f => uploadImageFile(f, `orders/${oboOrderId}`)))
      .then(newOnes => setOboFiles(prev => [...prev, ...newOnes]))
      .catch(() => alert("Some files failed to upload — please try again"))
      .finally(() => setOboUploading(false));
  }

  async function uploadOnBehalf() {
    if (!oboOrderId || oboFiles.length === 0) return;
    setOboUploading(true);
    const r = await fetch(`/api/orders/${oboOrderId}/photos`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photos: oboFiles.map(f => ({ filename: f.filename, url: f.url, description: f.filename })), release: oboRelease }),
    });
    setOboUploading(false);
    if (!r.ok) { const d = await r.json().catch(()=>({} as {error?:string})); alert(d.error ?? "Upload failed"); return; }
    setOboFiles([]); setOboOrderId("");
    alert(`✓ ${oboRelease ? "Uploaded and released to the vendor" : "Uploaded (held for review)"} — the vendor sees it as the agent's upload, not admin.`);
  }

  // ── Per-user order/bid stats (admin only) ──
  interface UserStats {
    role: string;
    ordersAccepted?: number; ordersPending?: number; ordersCompleted?: number; ordersCancelled?: number;
    bidsPlaced?: number; bidsAccepted?: number;
    bids?: { id:string; orderId:string; address:string; amount:number; status:string; placedByAdmin:boolean; placedAt:string }[];
    ordersPlaced?: number;
    recentOrders?: { id:string; address:string; status:string; createdAt:string }[];
  }
  const [statsOpenFor, setStatsOpenFor] = useState<string|null>(null);
  const [userStats, setUserStats] = useState<Record<string, UserStats>>({});
  const [statsLoading, setStatsLoading] = useState<string|null>(null);

  async function toggleUserStats(userId: string) {
    if (statsOpenFor === userId) { setStatsOpenFor(null); return; }
    setStatsOpenFor(userId);
    if (!userStats[userId]) {
      setStatsLoading(userId);
      const r = await fetch(`/api/users/${userId}/stats`).catch(()=>null);
      if (r?.ok) {
        const d = await r.json();
        setUserStats(prev => ({ ...prev, [userId]: d }));
      }
      setStatsLoading(null);
    }
  }

  // ── Admin profile management ──
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name:"", phone:"", currentPassword:"", newPassword:"" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ok:boolean;text:string}|null>(null);

  async function openProfile() {
    const r = await fetch("/api/profile").then(x=>x.json()).catch(()=>null);
    if (r?.profile) setProfileForm({ name:r.profile.name??"", phone:r.profile.phone??"", currentPassword:"", newPassword:"" });
    setProfileMsg(null);
    setProfileOpen(true);
  }
  async function saveOwnProfile() {
    setProfileSaving(true); setProfileMsg(null);
    const body: Record<string,string> = { name: profileForm.name, phone: profileForm.phone };
    if (profileForm.newPassword) { body.newPassword = profileForm.newPassword; body.currentPassword = profileForm.currentPassword; }
    const r = await fetch("/api/profile", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
    const d = await r.json().catch(()=>({} as {error?:string}));
    setProfileSaving(false);
    if (!r.ok) { setProfileMsg({ok:false, text:d.error ?? "Failed to save"}); return; }
    setProfileMsg({ok:true, text:"Profile saved"});
    setUserName(profileForm.name);
    setProfileForm(f=>({...f, currentPassword:"", newPassword:""}));
  }

  async function createWalletPlan() {
    setPlanError("");
    setPlanSuccess("");
    const amount = Number(newPlan.amount);
    if (!newPlan.name.trim()) { setPlanError("Plan name is required"); return; }
    if (!Number.isFinite(amount) || amount <= 0) { setPlanError("Enter a valid USD amount"); return; }
    setPlanBusy("create");
    const r = await fetch("/api/wallet/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newPlan.name.trim(),
        amountUsd: amount,
        description: newPlan.description.trim(),
        sortOrder: Number(newPlan.sortOrder) || 0,
      }),
    });
    const d = await r.json();
    setPlanBusy(null);
    if (!r.ok) { setPlanError(d.error ?? "Failed to create plan"); return; }
    setNewPlan({ name: "", amount: "", description: "", sortOrder: "0" });
    setPlanSuccess(`Created ${d.plan?.name ?? "plan"} — clients will see it in billing`);
    fetchWalletPlans();
  }

  async function saveWalletPlanEdit() {
    if (!editingPlan) return;
    setPlanError("");
    setPlanSuccess("");
    const amount = Number(editingPlan.amount);
    if (!editingPlan.name.trim() || !Number.isFinite(amount) || amount <= 0) {
      setPlanError("Name and a valid USD amount are required");
      return;
    }
    setPlanBusy(editingPlan.id);
    const r = await fetch(`/api/wallet/plans/${editingPlan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editingPlan.name.trim(),
        amountUsd: amount,
        description: editingPlan.description.trim(),
        sortOrder: Number(editingPlan.sortOrder) || 0,
      }),
    });
    const d = await r.json();
    setPlanBusy(null);
    if (!r.ok) { setPlanError(d.error ?? "Failed to update plan"); return; }
    setEditingPlan(null);
    setPlanSuccess("Plan updated");
    fetchWalletPlans();
  }

  async function toggleWalletPlan(id: string, active: boolean) {
    setPlanBusy(id);
    await fetch(`/api/wallet/plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    setPlanBusy(null);
    fetchWalletPlans();
  }

  async function deactivateWalletPlan(id: string) {
    if (!confirm("Deactivate this plan? Clients will no longer see it. Past purchases stay in history.")) return;
    setPlanBusy(id);
    await fetch(`/api/wallet/plans/${id}`, { method: "DELETE" });
    setPlanBusy(null);
    setPlanSuccess("Plan deactivated");
    fetchWalletPlans();
  }

  const TABS = [
    ["orders","Orders",<ClipboardList key="o" className="w-4 h-4"/>],
    ["agents","Agents",<Users key="a" className="w-4 h-4"/>],
    ["users","Users",<UserPlus key="u" className="w-4 h-4"/>],
    ["wallet","Wallet",<DollarSign key="w" className="w-4 h-4 text-emerald-600"/>],
    ["photos","Photo Inbox",<CameraIcon key="ph" className="w-4 h-4 text-blue-600"/>],
    ["disputes","Disputes",<AlertTriangle key="disp" className="w-4 h-4 text-red-500"/>],
    ["samples","Samples",<ShieldCheck key="s" className="w-4 h-4"/>],
    ["payouts","Payouts",<CreditCard key="pay" className="w-4 h-4"/>],
    ["pricing","Pricing",<DollarSign key="p" className="w-4 h-4"/>],
    ["payment-links","Payment Links",<DollarSign key="pl" className="w-4 h-4 text-emerald-600"/>],
    ["emails","Email Log",<Mail key="e" className="w-4 h-4"/>],
    ["audit","Audit Log",<History key="aud" className="w-4 h-4"/>],
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/snapect-logo.png" alt="Snapect" className="h-8 w-auto object-contain" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
            <span className="text-xs bg-purple-100 text-purple-700 font-medium px-2 py-0.5 rounded-full">Admin Studio</span>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${liveConnected?"bg-green-50 text-green-700":"bg-slate-100 text-slate-500"}`}>
              {liveConnected?<Wifi className="w-3.5 h-3.5"/>:<WifiOff className="w-3.5 h-3.5"/>}{liveConnected?"Live":"Offline"}
            </div>
            <button onClick={openProfile} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0f1f3d]" title="My profile">
              <UserIcon className="w-4 h-4"/>Welcome, <span className="font-medium text-slate-700 underline decoration-dotted">{userName}</span>
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600"><LogOut className="w-4 h-4"/>Logout</button>
          </div>
        </div>
      </header>

      {/* ── My Profile modal (admin) ── */}
      {profileOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setProfileOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><UserIcon className="w-5 h-5 text-purple-600"/>My Profile</h3>
              <button onClick={()=>setProfileOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            {profileMsg && (
              <div className={`mb-3 px-3 py-2 rounded-xl text-sm ${profileMsg.ok?"bg-green-50 border border-green-200 text-green-700":"bg-red-50 border border-red-200 text-red-700"}`}>{profileMsg.text}</div>
            )}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Name</label>
                <input value={profileForm.name} onChange={e=>setProfileForm(f=>({...f,name:e.target.value}))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Phone</label>
                <input value={profileForm.phone} onChange={e=>setProfileForm(f=>({...f,phone:e.target.value}))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-bold text-slate-700 mb-2">Change Password <span className="font-normal text-slate-400">(optional)</span></p>
                <div className="space-y-2">
                  <input type="password" placeholder="Current password" value={profileForm.currentPassword} onChange={e=>setProfileForm(f=>({...f,currentPassword:e.target.value}))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
                  <input type="password" placeholder="New password (min 6 characters)" value={profileForm.newPassword} onChange={e=>setProfileForm(f=>({...f,newPassword:e.target.value}))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
                </div>
              </div>
              <button onClick={saveOwnProfile} disabled={profileSaving}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm">
                {profileSaving?"Saving…":"Save Profile"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Site announcement banner control */}
        <div className="bg-white border border-slate-200 rounded-2xl mb-6 overflow-hidden">
          <button onClick={()=>setAnnOpen(!annOpen)} className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <AlertCircle className="w-4 h-4 text-amber-500"/>Dashboard Announcement
              {annActive
                ? <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">Active — {annActive.audience}</span>
                : <span className="text-xs bg-slate-100 text-slate-500 font-medium px-2 py-0.5 rounded-full">None active</span>}
            </span>
            {annOpen?<ChevronUp className="w-4 h-4 text-slate-400"/>:<ChevronDown className="w-4 h-4 text-slate-400"/>}
          </button>
          {annOpen&&(
            <div className="px-5 pb-5 pt-1 border-t border-slate-100">
              {annActive&&(
                <div className="flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-3">
                  <p className="text-xs text-amber-800 leading-relaxed flex-1">{annActive.message}</p>
                  <button onClick={clearAnnouncement} disabled={annSaving} className="text-xs text-red-600 font-semibold hover:underline flex-shrink-0">Clear</button>
                </div>
              )}
              <textarea value={annMsg} onChange={e=>setAnnMsg(e.target.value)} rows={2}
                placeholder="e.g. Our email server is backed up — completed order emails may be delayed. Photos are available on each order page."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 mb-2"/>
              <div className="flex items-center gap-2">
                <select value={annAudience} onChange={e=>setAnnAudience(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white">
                  <option value="all">Show to everyone</option>
                  <option value="client">Vendors only</option>
                  <option value="agent">Agents only</option>
                </select>
                <button onClick={publishAnnouncement} disabled={annSaving||!annMsg.trim()}
                  className="bg-slate-900 hover:bg-slate-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-xl">
                  {annSaving?"Publishing…":"Publish Banner"}
                </button>
                <span className="text-xs text-slate-400">Replaces any currently active banner for that audience</span>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          {[
            {label:"Total Orders",value:orders.length,color:"text-blue-600 bg-blue-50",icon:<ClipboardList className="w-4 h-4"/>},
            {label:"Awaiting Payment",value:orders.filter(o=>(o as unknown as Record<string,unknown>).payment_status==="pending").length,color:"text-amber-600 bg-amber-50",icon:<DollarSign className="w-4 h-4"/>},
            {label:"In Progress",value:orders.filter(o=>o.status==="in_progress").length,color:"text-blue-600 bg-blue-50",icon:<RefreshCw className="w-4 h-4"/>},
            {label:"Completed",value:orders.filter(o=>o.status==="completed").length,color:"text-green-600 bg-green-50",icon:<CheckCircle className="w-4 h-4"/>},
            {label:"Pending Users",value:allUsers.filter(u=>u.role!=="admin"&&!u.accountActive&&!u.suspended).length,color:"text-amber-600 bg-amber-50",icon:<Users className="w-4 h-4"/>},
          ].map(card=>(
            <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${card.color}`}>{card.icon}</div>
              <div className="text-2xl font-bold text-slate-900">{card.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{card.label}</div>
            </div>
          ))}
        </div>

        {/* System config warnings */}
        {(!process.env.NEXT_PUBLIC_SUPABASE_URL) && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0"/>
            <span><strong>Supabase not configured</strong> — Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY in environment variables.</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 flex-wrap">
          {TABS.map(([t,label,icon])=>(
            <button key={t} onClick={()=>setTab(t as typeof tab)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${tab===t?"bg-white text-slate-900 shadow-sm":"text-slate-500 hover:text-slate-700"}`}>
              {icon}{label}
              {t==="samples"&&samples.length>0&&<span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{samples.length}</span>}
              {t==="photos"&&(()=>{
                const n = orders.reduce((sum,o)=>sum+(o.photos??[]).filter(p=>p.approved===false).length,0) + submissions.filter(su=>su.status==="pending").length;
                return n>0?<span className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{n}</span>:null;
              })()}
            </button>
          ))}
        </div>

        {loading ? <div className="text-center py-16 text-slate-400">Loading…</div>

        : tab==="orders" ? (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {paymentLinks.length === 0 && (
              <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"/>
                <div>
                  <p className="font-bold text-amber-900 text-sm">⚠️ No Payment Links Configured</p>
                  <p className="text-amber-800 text-xs mt-1">Vendors cannot pay for orders until you add a payment link. <button onClick={()=>setTab("payment-links")} className="font-bold underline">Set up Payment Links now →</button></p>
                </div>
              </div>
            )}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
              <h2 className="font-semibold text-slate-900">All Orders ({orders.length})</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <input value={orderSearch} onChange={e=>setOrderSearch(e.target.value)}
                  placeholder="Search address or vendor…"
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a] w-52"/>
                <select value={orderStatusFilter} onChange={e=>setOrderStatusFilter(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c8991a]">
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="under_review">Under Review</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Order / Address</th>
                    <th className="text-left px-4 py-3">Vendor</th>
                    <th className="text-left px-4 py-3">Service</th>
                    <th className="text-left px-4 py-3">Price</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Assign Agent</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.filter(o => {
                  const matchSearch = !orderSearch || o.address.toLowerCase().includes(orderSearch.toLowerCase()) || (o.client?.name ?? "").toLowerCase().includes(orderSearch.toLowerCase());
                  const matchStatus = orderStatusFilter === "all" || o.status === orderStatusFilter;
                  return matchSearch && matchStatus;
                }).map(order=>{
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
                                {agentsByState.map(a=><option key={a.id} value={a.id}>{a.name} — {a.__state}{a.available?" ✓":""}</option>)}
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
                              <button onClick={()=>deleteOrder(order.id, order.address)} title="Delete order"
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:border-red-300 border border-slate-200 rounded-lg">
                                <TrashIcon className="w-3.5 h-3.5"/>
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
                                    {bid.status!=="accepted"&&(
                                      <button onClick={()=>deleteBid(order.id,bid.id)} title="Delete bid"
                                        className="p-1.5 text-slate-400 hover:text-red-600 border border-slate-200 rounded-lg">
                                        <TrashIcon className="w-3.5 h-3.5"/>
                                      </button>
                                    )}
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

        ) : tab==="photos" ? (
          <div className="space-y-6">
            {/* ── Upload on behalf of an agent ── */}
            <div className="bg-white border-2 border-blue-200 rounded-2xl p-6">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2"><Upload className="w-5 h-5 text-blue-600"/>Upload Photos on Behalf of an Agent</h2>
              <p className="text-xs text-slate-400 mt-0.5 mb-4">Pick an order with an assigned agent. The vendor will see the photos as uploaded by the agent (e.g. &quot;User 1234567 uploaded 3 photos&quot;) — never as admin.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <select value={oboOrderId} onChange={e=>setOboOrderId(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">Choose an order (must have an assigned agent)…</option>
                  {orders.filter(o=>o.assignedAgentId).map(o=>(
                    <option key={o.id} value={o.id}>{o.address} — Agent: {o.agent?.name ?? o.assignedAgentId}</option>
                  ))}
                </select>
                <div className="flex items-center gap-3">
                  <input ref={oboFileRef} type="file" accept="image/*" multiple className="hidden" onChange={e=>{oboPickFiles(e.target.files); if(oboFileRef.current) oboFileRef.current.value="";}}/>
                  <button onClick={()=>oboFileRef.current?.click()} disabled={!oboOrderId}
                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-xl">
                    <CameraIcon className="w-4 h-4"/>Choose Photos ({oboFiles.length})
                  </button>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                    <input type="checkbox" checked={oboRelease} onChange={e=>setOboRelease(e.target.checked)} className="rounded"/>
                    Release to vendor immediately
                  </label>
                </div>
              </div>
              {oboFiles.length>0&&(
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-3">
                  {oboFiles.map((f,i)=>(
                    <div key={i} className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 border border-slate-200 group">
                      <img src={f.url} alt={f.filename} className="w-full h-full object-cover"/>
                      <button onClick={()=>setOboFiles(prev=>prev.filter((_,j)=>j!==i))}
                        className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full w-4 h-4 text-[10px] leading-none opacity-0 group-hover:opacity-100">✕</button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={uploadOnBehalf} disabled={oboUploading||!oboOrderId||oboFiles.length===0}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
                <Upload className="w-4 h-4"/>{oboUploading?"Uploading…":`Upload ${oboFiles.length||""} Photo${oboFiles.length!==1?"s":""} as Agent`}
              </button>
            </div>

            {/* ── Pending order photos (from agent job uploads) ── */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">Order Photos — Pending Review</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Agents uploaded these on their jobs. Vendors can&apos;t see them until you release them.</p>
                </div>
              </div>
              {(()=>{
                const pendingOrders = orders.filter(o=>(o.photos??[]).some(p=>p.approved===false));
                if (pendingOrders.length===0) return <div className="text-center py-10 text-slate-400 text-sm">No photos waiting for review</div>;
                return pendingOrders.map(o=>{
                  const pend = (o.photos??[]).filter(p=>p.approved===false);
                  return (
                    <div key={o.id} className="px-6 py-4 border-b border-slate-100 last:border-0">
                      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{o.address}</p>
                          <p className="text-xs text-slate-400">{o.serviceType} · Vendor: {o.client?.name??o.clientId} · Agent: {o.agent?.name??"—"} · {pend.length} pending photo{pend.length!==1?"s":""}</p>
                        </div>
                        <button onClick={()=>releaseAllPhotos(o.id)} disabled={photoActing===o.id}
                          className="text-xs bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-2 rounded-lg disabled:opacity-50 whitespace-nowrap">
                          {photoActing===o.id?"…":"✓ Release all to vendor"}
                        </button>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {pend.map(ph=>(
                          <div key={ph.id} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                            <a href={ph.url} target="_blank" rel="noopener noreferrer" className="block aspect-video bg-slate-100" title="Open / save full size">
                              {ph.url?<img src={ph.url} alt={ph.description} className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center"><CameraIcon className="w-5 h-5 text-slate-300"/></div>}
                            </a>
                            <div className="p-1.5">
                              <p className="text-[10px] text-slate-500 truncate" title={ph.description}>{ph.description||ph.filename}</p>
                              <div className="flex gap-1 mt-1">
                                <button onClick={()=>releasePhoto(o.id,ph.id)} disabled={photoActing===ph.id}
                                  className="flex-1 text-[10px] bg-green-50 hover:bg-green-100 text-green-700 font-bold px-1 py-1 rounded disabled:opacity-50">✓ Send</button>
                                <button onClick={()=>deletePhoto(o.id,ph.id)} disabled={photoActing===ph.id}
                                  className="text-[10px] bg-red-50 hover:bg-red-100 text-red-600 font-bold px-1.5 py-1 rounded disabled:opacity-50">✕</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* ── Photo submissions (agent open form) ── */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">Photo Submissions (Upload Form)</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Sent directly by agents from their Upload Form. Review the images, then send them to a vendor&apos;s order or dismiss.</p>
                </div>
                <button onClick={fetchSubmissions} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5"/>Refresh</button>
              </div>
              {submissions.filter(su=>su.status==="pending").length===0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">No pending submissions</div>
              ) : submissions.filter(su=>su.status==="pending").map(su=>(
                <div key={su.id} className="px-6 py-4 border-b border-slate-100 last:border-0">
                  <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{su.serviceName||"Photo submission"} <span className="text-xs font-normal text-slate-400">· {su.photos.length} photos</span></p>
                      <p className="text-xs text-slate-400">Agent: {su.agentName??su.agentId} · {etDateTime(su.createdAt)} {su.orderId?`· Linked order: ${su.orderId}`:"· No order linked"}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {!su.orderId&&(
                        <select value={subSendTarget[su.id]??""} onChange={e=>setSubSendTarget(prev=>({...prev,[su.id]:e.target.value}))}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white max-w-[220px]">
                          <option value="">Choose order to send to…</option>
                          {orders.filter(o=>o.assignedAgentId===su.agentId).map(o=><option key={o.id} value={o.id}>{o.address}</option>)}
                        </select>
                      )}
                      <button onClick={()=>actOnSubmission(su.id,"send", su.orderId??subSendTarget[su.id])}
                        disabled={photoActing===su.id||(!su.orderId&&!subSendTarget[su.id])}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-2 rounded-lg disabled:opacity-50 whitespace-nowrap">
                        {photoActing===su.id?"…":"✓ Send to vendor"}
                      </button>
                      <button onClick={()=>actOnSubmission(su.id,"dismiss")} disabled={photoActing===su.id}
                        className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-2 rounded-lg disabled:opacity-50">Dismiss</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {su.photos.map((ph,i)=>(
                      <a key={i} href={ph.url} target="_blank" rel="noopener noreferrer"
                        className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 group" title={`${ph.label} — open / save full size`}>
                        <div className="aspect-video bg-slate-100">
                          {ph.url?<img src={ph.url} alt={ph.label} className="w-full h-full object-cover group-hover:opacity-90"/>:<div className="w-full h-full flex items-center justify-center"><CameraIcon className="w-5 h-5 text-slate-300"/></div>}
                        </div>
                        <p className="text-[10px] text-slate-500 truncate px-1.5 py-1">{ph.label||ph.filename}</p>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        ) : tab==="agents" ? (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Field Agents</h2>
              <span className="text-xs text-slate-400">{agents.filter(a=>a.available).length}/{agents.length} available</span>
            </div>
            <div className="divide-y divide-slate-100">
              {agentsByState.map((agent,i)=>{
                const editedRating = ratingEdit[agent.id];
                const displayRating = editedRating??agent.rating;
                const showStateHeader = i===0 || agentsByState[i-1].__state !== agent.__state;
                return (
                  <div key={agent.id}>
                  {showStateHeader && (
                    <div className="px-5 py-2 bg-slate-50 border-y border-slate-100 flex items-center gap-2 sticky top-0">
                      <MapPin className="w-3.5 h-3.5 text-[#c8991a]"/>
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{agent.__state}</span>
                      <span className="text-xs text-slate-400">({agentsByState.filter(a=>a.__state===agent.__state).length})</span>
                    </div>
                  )}
                  <div className="p-5">
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
                          <select value={agent.backgroundCheckStatus ?? "not_started"} onChange={e=>updateBackgroundCheck(agent.id, e.target.value)}
                            className={`text-xs font-medium px-2 py-0.5 rounded-full border cursor-pointer ${
                              agent.backgroundCheckStatus==="passed" ? "bg-green-50 text-green-700 border-green-200" :
                              agent.backgroundCheckStatus==="failed" ? "bg-red-50 text-red-700 border-red-200" :
                              agent.backgroundCheckStatus==="pending" ? "bg-amber-50 text-amber-700 border-amber-200" :
                              "bg-slate-50 text-slate-500 border-slate-200"
                            }`}>
                            <option value="not_started">BG Check: Not Started</option>
                            <option value="pending">BG Check: Pending</option>
                            <option value="passed">BG Check: Passed</option>
                            <option value="failed">BG Check: Failed</option>
                          </select>
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
                              className={`w-5 h-5 ${n<=displayRating?"text-amber-400":"text-slate-700 hover:text-amber-300"}`}>
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
                  </div>
                );
              })}
              {agents.length===0&&<div className="text-center py-12 text-slate-400"><Users className="w-8 h-8 mx-auto mb-2 text-slate-600"/><p>No agents yet</p></div>}
            </div>
          </div>

        ) : tab==="users" ? (
          <div className="space-y-6">

            {/* ── PENDING APPROVALS — most important section ── */}
            {allUsers.filter(u => u.role !== "admin" && !u.accountActive && !u.suspended).length > 0 && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-amber-200 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600"/>
                  <div>
                    <h2 className="font-bold text-amber-900">
                      Pending Activation — {allUsers.filter(u => u.role !== "admin" && !u.accountActive && !u.suspended).length} user(s) waiting
                    </h2>
                    <p className="text-xs text-amber-700 mt-0.5">Signup is now free for vendors and agents — accounts auto-activate. This list only shows legacy accounts that were never activated; click ✓ Activate to enable them.</p>
                  </div>
                </div>
                <div className="divide-y divide-amber-100">
                  {allUsers.filter(u => u.role !== "admin" && !u.accountActive && !u.suspended).map(u => (
                    <div key={u.id} className="px-6 py-4 flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900">{u.name}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${u.role === "agent" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                            {u.role} — free signup
                          </span>
                          <span className="text-xs bg-amber-200 text-amber-800 font-bold px-2 py-0.5 rounded-full">⏳ Awaiting Payment Confirmation</span>
                        </div>
                        <div className="text-xs text-slate-600 mt-1 flex items-center gap-3">
                          <span>📧 {u.email}</span>
                          {u.phone && <span>📞 {u.phone}</span>}
                          {u.company && <span>🏢 {u.company}</span>}
                          <span suppressHydrationWarning>Registered: {u.createdAt ? etDate(u.createdAt) : ""}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a href={paymentLinks[0]?.url ?? "#"} target="_blank" rel="noopener noreferrer"
                          className="text-xs bg-[#c8991a] hover:bg-[#f0b429] text-[#0f1f3d] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap">
                          View Payment →
                        </a>
                        <button onClick={() => activateUser(u.id, "activate")} disabled={saving === `user-${u.id}`}
                          className="text-xs bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-1.5 rounded-lg disabled:opacity-50 whitespace-nowrap">
                          {saving === `user-${u.id}` ? "…" : "✓ Confirm Payment & Activate"}
                        </button>
                        <button onClick={() => activateUser(u.id, "suspend")} disabled={saving === `user-${u.id}`}
                          className="text-xs border border-red-200 text-red-600 hover:bg-red-50 font-medium px-3 py-1.5 rounded-lg whitespace-nowrap">
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── PENDING ORDERS awaiting payment ── */}
            {orders.filter(o => (o as unknown as Record<string,unknown>).payment_status === "pending").length > 0 && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-blue-200 flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-blue-600"/>
                  <div>
                    <h2 className="font-bold text-blue-900">
                      Orders Awaiting Payment — {orders.filter(o => (o as unknown as Record<string,unknown>).payment_status === "pending").length} order(s)
                    </h2>
                    <p className="text-xs text-blue-700 mt-0.5">Vendors placed these orders and should have paid. Confirm payment to activate.</p>
                  </div>
                </div>
                <div className="divide-y divide-blue-100">
                  {orders.filter(o => (o as unknown as Record<string,unknown>).payment_status === "pending").map(order => (
                    <div key={order.id} className="px-6 py-4 flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-bold text-slate-900">{order.address}</span>
                          <span className="text-xs bg-blue-100 text-blue-700 font-medium px-2 py-0.5 rounded-full">{order.serviceType}</span>
                        </div>
                        <div className="text-xs text-slate-600 flex items-center gap-3">
                          <span>Client: {order.client?.name ?? order.clientId}</span>
                          <span>Amount: <strong>${order.totalPrice}</strong></span>
                          <span suppressHydrationWarning>{etDate(order.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a href={paymentLinks[0]?.url ?? "#"} target="_blank" rel="noopener noreferrer"
                          className="text-xs bg-[#c8991a] hover:bg-[#f0b429] text-[#0f1f3d] font-bold px-3 py-1.5 rounded-lg">
                          View Payment →
                        </a>
                        <button onClick={async () => {
                          await fetch(`/api/orders/${order.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({confirmPayment:true}) });
                          fetchAll();
                        }} className="text-xs bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-1.5 rounded-lg whitespace-nowrap">
                          ✓ Confirm Payment
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Payment Links quick reference ── */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600"/>Your Payment Links
                <button onClick={() => setTab("payment-links")} className="ml-auto text-xs text-[#c8991a] font-bold hover:underline">Manage Links →</button>
              </h3>
              {paymentLinks.length === 0 ? (
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0"/>
                  <p className="text-sm text-red-700">No payment links configured! <button onClick={() => setTab("payment-links")} className="font-bold underline">Add one now →</button></p>
                </div>
              ) : (
                <div className="space-y-2">
                  {paymentLinks.filter(l => l.active).map(link => (
                    <div key={link.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{link.label} {link.amount && <span className="text-emerald-600">${link.amount}</span>}</p>
                        <p className="text-xs text-slate-400 font-mono truncate max-w-xs">{link.url}</p>
                      </div>
                      <a href={link.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs bg-[#c8991a] text-[#0f1f3d] font-bold px-3 py-1.5 rounded-lg hover:bg-[#f0b429] whitespace-nowrap">
                        Open Link ↗
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Add New User form ── */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><UserPlus className="w-5 h-5 text-purple-600"/>Add New User</h2>
              {addUserError&&<div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{addUserError}</div>}
              {addUserSuccess&&<div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl font-mono">{addUserSuccess}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {label:"Role *",type:"select",key:"role",opts:["agent","client"],optLabels:{agent:"Agent",client:"Vendor"}},
                  {label:"Full Name *",type:"text",key:"name",ph:"Jane Smith"},
                  {label:"Email *",type:"email",key:"email",ph:"jane@example.com"},
                  {label:"Phone",type:"text",key:"phone",ph:"555-0101"},
                ].map(f=>(
                  <div key={f.key}>
                    <label className="text-xs font-medium text-slate-600 block mb-1">{f.label}</label>
                    {f.type==="select" ? (
                      <select value={newUser[f.key as keyof typeof newUser]} onChange={e=>setNewUser(u=>({...u,[f.key]:e.target.value}))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                        {f.opts!.map(o=><option key={o} value={o}>{(f as unknown as {optLabels?:Record<string,string>}).optLabels?.[o] ?? (o.charAt(0).toUpperCase()+o.slice(1))}</option>)}
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
                <UserPlus className="w-4 h-4"/>{addingUser?"Creating…":`Create ${newUser.role==="agent"?"Agent":"Vendor"}`}
              </button>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-900">All Users ({allUsers.length})</h2></div>
              <div className="divide-y divide-slate-100">
                {allUsers.map(u=>(
                  <div key={u.id} className="px-6 py-4">
                    <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-800">{u.name}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.role==="admin"?"bg-purple-100 text-purple-700":u.role==="agent"?"bg-green-100 text-green-700":"bg-blue-100 text-blue-700"}`}>{u.role}</span>
                        {u.role!=="admin" && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.suspended?"bg-red-100 text-red-700":u.accountActive?"bg-green-100 text-green-700":"bg-amber-100 text-amber-700"}`}>
                            {u.suspended?"Suspended":u.accountActive?"Active":"Pending"}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{u.email}{u.phone&&` · ${u.phone}`}{u.company&&` · ${u.company}`}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400" suppressHydrationWarning>{u.createdAt?etDate(u.createdAt):""}</span>
                      {u.role !== "admin" && (
                        <button onClick={()=>toggleUserStats(u.id)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border flex items-center gap-1 ${statsOpenFor===u.id?"bg-indigo-600 text-white border-indigo-600":"border-indigo-200 text-indigo-600 hover:bg-indigo-50"}`}>
                          <BarChart3 className="w-3.5 h-3.5"/>{statsOpenFor===u.id?"Hide Stats":"Stats"}
                        </button>
                      )}
                      {u.role !== "admin" && (
                        <>
                          {!u.accountActive && !u.suspended && (
                            <button onClick={()=>activateUser(u.id,"activate")} disabled={saving===`user-${u.id}`}
                              className="text-xs bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 whitespace-nowrap">
                              {saving===`user-${u.id}`?"…":"✓ Activate"}
                            </button>
                          )}
                          {u.accountActive && !u.suspended && (
                            <button onClick={()=>activateUser(u.id,"suspend")} disabled={saving===`user-${u.id}`}
                              className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-3 py-1.5 rounded-lg border border-red-200 disabled:opacity-50">
                              {saving===`user-${u.id}`?"…":"Suspend"}
                            </button>
                          )}
                          {u.suspended && (
                            <button onClick={()=>activateUser(u.id,"unsuspend")} disabled={saving===`user-${u.id}`}
                              className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold px-3 py-1.5 rounded-lg border border-blue-200 disabled:opacity-50">
                              {saving===`user-${u.id}`?"…":"Unsuspend"}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    </div>

                    {/* ── Expanded stats panel ── */}
                    {statsOpenFor===u.id && (
                      <div className="mt-3 bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
                        {statsLoading===u.id ? (
                          <p className="text-xs text-slate-400">Loading stats…</p>
                        ) : userStats[u.id] ? (
                          <>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                              {(userStats[u.id].role==="agent" ? [
                                {label:"Orders Accepted", val:userStats[u.id].ordersAccepted, color:"text-blue-700"},
                                {label:"Pending / Active", val:userStats[u.id].ordersPending, color:"text-amber-700"},
                                {label:"Completed", val:userStats[u.id].ordersCompleted, color:"text-green-700"},
                                {label:"Bids Placed", val:userStats[u.id].bidsPlaced, color:"text-indigo-700"},
                              ] : [
                                {label:"Orders Placed", val:userStats[u.id].ordersPlaced, color:"text-blue-700"},
                                {label:"Pending / Active", val:userStats[u.id].ordersPending, color:"text-amber-700"},
                                {label:"Completed", val:userStats[u.id].ordersCompleted, color:"text-green-700"},
                                {label:"Cancelled", val:userStats[u.id].ordersCancelled, color:"text-red-600"},
                              ]).map(s=>(
                                <div key={s.label} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-center">
                                  <p className={`text-xl font-black ${s.color}`}>{s.val ?? 0}</p>
                                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">{s.label}</p>
                                </div>
                              ))}
                            </div>
                            {userStats[u.id].role==="agent" && (userStats[u.id].bids?.length??0)>0 && (
                              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                                <p className="text-xs font-bold text-slate-700 px-3 py-2 border-b border-slate-100">
                                  Bid History — use these times as reminders ({userStats[u.id].bidsAccepted ?? 0} accepted)
                                </p>
                                <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                                  {userStats[u.id].bids!.map(b=>(
                                    <div key={b.id} className="px-3 py-1.5 flex items-center justify-between gap-2 text-xs">
                                      <span className="text-slate-600 truncate flex-1">{b.address}</span>
                                      <span className="font-bold text-slate-800">${b.amount}</span>
                                      <span className={`px-1.5 py-0.5 rounded-full font-medium ${b.status==="accepted"?"bg-green-50 text-green-700":b.status==="rejected"?"bg-red-50 text-red-600":"bg-amber-50 text-amber-700"}`}>{b.status}</span>
                                      <span className="text-slate-400 whitespace-nowrap" suppressHydrationWarning>{etDateTime(b.placedAt)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {userStats[u.id].role==="client" && (userStats[u.id].recentOrders?.length??0)>0 && (
                              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                                <p className="text-xs font-bold text-slate-700 px-3 py-2 border-b border-slate-100">Recent Orders</p>
                                <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                                  {userStats[u.id].recentOrders!.map(o=>(
                                    <div key={o.id} className="px-3 py-1.5 flex items-center justify-between gap-2 text-xs">
                                      <span className="text-slate-600 truncate flex-1">{o.address}</span>
                                      <span className={`px-1.5 py-0.5 rounded-full font-medium ${o.status==="completed"?"bg-green-50 text-green-700":o.status==="cancelled"?"bg-red-50 text-red-600":"bg-amber-50 text-amber-700"}`}>{o.status}</span>
                                      <span className="text-slate-400 whitespace-nowrap" suppressHydrationWarning>{etDate(o.createdAt)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        ) : <p className="text-xs text-red-500">Could not load stats</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

        ) : tab==="wallet" ? (
          <div className="space-y-6">
            {/* Pending top-up confirmations */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-600"/>Pending Wallet Top-ups
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Vendors requested these top-ups — confirm after verifying payment received</p>
                </div>
                {pendingTopups.length > 0 && (
                  <span className="bg-emerald-100 text-emerald-700 font-bold text-sm px-3 py-1 rounded-full">{pendingTopups.length} pending</span>
                )}
              </div>
              {pendingTopups.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-slate-600"/>
                  <p>No pending top-ups</p>
                </div>
              ) : pendingTopups.map(tx => (
                <div key={tx.id} className="px-6 py-4 border-b border-slate-100 last:border-0 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900">{tx.userName ?? tx.userId}</span>
                      <span className="text-xs text-slate-500">{tx.userEmail}</span>
                    </div>
                    <p className="text-xs text-slate-500">{tx.description}</p>
                    <p className="text-xs text-slate-400" suppressHydrationWarning>{etDateTime(tx.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-2xl font-black text-emerald-600">${tx.amount}</span>
                    <button onClick={() => confirmTopup(tx.id, "confirm")} disabled={confirmingTopup === tx.id}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-4 py-2 rounded-lg disabled:opacity-50 whitespace-nowrap">
                      {confirmingTopup === tx.id ? "…" : "✓ Confirm & Credit Wallet"}
                    </button>
                    <button onClick={() => confirmTopup(tx.id, "cancel")} disabled={confirmingTopup === tx.id}
                      className="border border-red-200 text-red-600 hover:bg-red-50 font-medium text-xs px-3 py-2 rounded-lg disabled:opacity-50">
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Whop payment + webhook activity */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-900 flex items-center gap-2">
                    <WalletIcon className="w-5 h-5 text-[#c8991a]"/>Whop Payment Activity
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Which vendor paid what — linked to Whop checkout and webhook confirmation</p>
                </div>
                <button
                  onClick={fetchWhopActivity}
                  disabled={whopActivityLoading}
                  className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${whopActivityLoading ? "animate-spin" : ""}`}/>
                  {whopActivityLoading ? "Loading…" : "Refresh"}
                </button>
              </div>

              {whopActivityLoading && whopPayments.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">Loading Whop activity…</div>
              ) : whopPayments.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300"/>
                  <p className="text-sm">No Whop wallet payments yet</p>
                  <p className="text-xs mt-1">Shows when a vendor buys credits via Whop checkout</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <th className="px-4 py-3">When</th>
                        <th className="px-4 py-3">Vendor</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Whop payment</th>
                        <th className="px-4 py-3">Webhook</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {whopPayments.map((row) => {
                        const purposeLabel: Record<string, string> = {
                          plan_topup: "Plan",
                          custom_topup: "Custom",
                          auto_topup: "Auto",
                        };
                        const statusClass: Record<string, string> = {
                          confirmed: "bg-emerald-100 text-emerald-700",
                          pending: "bg-amber-100 text-amber-700",
                          failed: "bg-red-100 text-red-700",
                          cancelled: "bg-slate-100 text-slate-600",
                        };
                        return (
                          <tr key={row.txId} className="hover:bg-slate-50/80">
                            <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap" suppressHydrationWarning>
                              {etDateTime(row.confirmedAt ?? row.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-800">{row.userName}</p>
                              <p className="text-xs text-slate-500">{row.userEmail}</p>
                              {row.planName && <p className="text-[10px] text-[#c8991a] font-semibold mt-0.5">{row.planName}</p>}
                            </td>
                            <td className="px-4 py-3 font-bold text-emerald-600 whitespace-nowrap">${row.amount.toFixed(2)}</td>
                            <td className="px-4 py-3 text-xs text-slate-600">{purposeLabel[row.purpose] ?? row.purpose}</td>
                            <td className="px-4 py-3">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusClass[row.status] ?? "bg-slate-100 text-slate-600"}`}>
                                {row.status}
                              </span>
                              {row.failureMessage && (
                                <p className="text-[10px] text-red-600 mt-1 max-w-[140px] truncate" title={row.failureMessage}>{row.failureMessage}</p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {row.whopPaymentId ? (
                                <code className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded block max-w-[120px] truncate" title={row.whopPaymentId}>
                                  {row.whopPaymentId}
                                </code>
                              ) : (
                                <span className="text-[10px] text-slate-400">Awaiting pay</span>
                              )}
                              <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]" title={row.txId}>{row.txId}</p>
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {row.webhookEventType ? (
                                <>
                                  <span className="text-emerald-700 font-semibold">{row.webhookEventType}</span>
                                  {row.webhookAt && (
                                    <p className="text-[10px] text-slate-400 mt-0.5" suppressHydrationWarning>{etDateTime(row.webhookAt)}</p>
                                  )}
                                </>
                              ) : row.status === "confirmed" ? (
                                <span className="text-slate-400">Credited</span>
                              ) : (
                                <span className="text-amber-600">Pending</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="border-t border-slate-100">
                <button
                  onClick={() => setShowWhopWebhooks(!showWhopWebhooks)}
                  className="w-full px-6 py-3 flex items-center justify-between text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <span>Raw webhook event log ({whopWebhooks.length})</span>
                  {showWhopWebhooks ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                </button>
                {showWhopWebhooks && (
                  <div className="px-6 pb-4 space-y-2 max-h-64 overflow-y-auto">
                    {whopWebhooks.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">No webhook events recorded yet</p>
                    ) : whopWebhooks.map((ev) => (
                      <div key={ev.eventId} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs border border-slate-100 rounded-lg px-3 py-2 bg-slate-50/50">
                        <span className="font-mono text-slate-500" suppressHydrationWarning>{etDateTime(ev.processedAt)}</span>
                        <span className="font-semibold text-[#0f1f3d]">{ev.eventType}</span>
                        {ev.userName && <span className="text-slate-700">{ev.userName} ({ev.userEmail})</span>}
                        {ev.purpose && <span className="text-slate-500">{ev.purpose}</span>}
                        {ev.paymentId && (
                          <code className="text-[10px] bg-white border border-slate-200 px-1 rounded">{ev.paymentId}</code>
                        )}
                        <code className="text-[10px] text-slate-400">{ev.eventId}</code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* All vendor wallet balances */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-900">Vendor Wallet Balances</h2>
                <p className="text-xs text-slate-400 mt-0.5">All active vendors and their current wallet balance</p>
              </div>
              <div className="divide-y divide-slate-100">
                {allUsers.filter(u => u.role === "client" && u.accountActive).map(u => (
                  <div key={u.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-800">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-600">$0.00</p>
                      <p className="text-xs text-slate-400">wallet balance</p>
                    </div>
                  </div>
                ))}
                {allUsers.filter(u => u.role === "client" && u.accountActive).length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm">No active vendors yet</div>
                )}
              </div>
            </div>

            {/* Admin-managed wallet credit plans (USD) — stored in our DB, not Whop */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#c8991a]"/>Wallet Credit Plans
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Create packages here ($50, $100, …). Vendors see them in billing, pay on Whop, and get $1 = $1 credit after webhook confirmation. Plans are not created in Whop.
                </p>
              </div>

              {(planError || planSuccess) && (
                <div className={`px-6 py-3 text-sm font-medium border-b border-slate-100 ${planError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                  {planError || planSuccess}
                </div>
              )}

              {/* Create plan */}
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Add new plan</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <input
                    value={newPlan.name}
                    onChange={e => setNewPlan(p => ({ ...p, name: e.target.value }))}
                    placeholder="Name (e.g. Starter $50)"
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={newPlan.amount}
                    onChange={e => setNewPlan(p => ({ ...p, amount: e.target.value }))}
                    placeholder="Amount USD"
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    value={newPlan.description}
                    onChange={e => setNewPlan(p => ({ ...p, description: e.target.value }))}
                    placeholder="Description (optional)"
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm lg:col-span-1"
                  />
                  <input
                    type="number"
                    value={newPlan.sortOrder}
                    onChange={e => setNewPlan(p => ({ ...p, sortOrder: e.target.value }))}
                    placeholder="Sort"
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    onClick={createWalletPlan}
                    disabled={planBusy === "create"}
                    className="bg-[#0f1f3d] hover:bg-[#1a3260] text-white font-semibold text-sm px-4 py-2 rounded-lg disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <PlusIcon className="w-4 h-4"/>{planBusy === "create" ? "Saving…" : "Create plan"}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">Credits default to the same USD amount (1:1).</p>
              </div>

              {/* Edit modal strip */}
              {editingPlan && (
                <div className="px-6 py-4 border-b border-amber-100 bg-amber-50/50 space-y-3">
                  <p className="text-sm font-semibold text-slate-800">Edit plan</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <input value={editingPlan.name} onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    <input type="number" min="1" step="0.01" value={editingPlan.amount} onChange={e => setEditingPlan({ ...editingPlan, amount: e.target.value })} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    <input value={editingPlan.description} onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    <input type="number" value={editingPlan.sortOrder} onChange={e => setEditingPlan({ ...editingPlan, sortOrder: e.target.value })} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveWalletPlanEdit} disabled={planBusy === editingPlan.id} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-50">
                      {planBusy === editingPlan.id ? "…" : "Save changes"}
                    </button>
                    <button onClick={() => setEditingPlan(null)} className="border border-slate-200 text-slate-600 text-xs font-medium px-4 py-2 rounded-lg">Cancel</button>
                  </div>
                </div>
              )}

              {walletPlans.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300"/>
                  <p>No plans yet — create one above</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {walletPlans.map(plan => (
                    <div key={plan.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900">{plan.name}</span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${plan.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {plan.active ? "Active" : "Inactive"}
                          </span>
                          <span className="text-xs text-slate-400">sort {plan.sortOrder}</span>
                        </div>
                        <p className="text-sm text-emerald-700 font-semibold mt-0.5">
                          ${plan.amountUsd.toFixed(2)} USD → {plan.credits.toFixed(2)} credits
                        </p>
                        {plan.description && <p className="text-xs text-slate-500 mt-0.5">{plan.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setEditingPlan({
                            id: plan.id,
                            name: plan.name,
                            amount: String(plan.amountUsd),
                            description: plan.description ?? "",
                            sortOrder: String(plan.sortOrder),
                          })}
                          className="text-xs border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-3 py-1.5 rounded-lg"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleWalletPlan(plan.id, !plan.active)}
                          disabled={planBusy === plan.id}
                          className="text-xs border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
                        >
                          {plan.active ? "Deactivate" : "Activate"}
                        </button>
                        {plan.active && (
                          <button
                            onClick={() => deactivateWalletPlan(plan.id)}
                            disabled={planBusy === plan.id}
                            className="text-xs border border-red-200 text-red-600 hover:bg-red-50 font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                          >
                            <TrashIcon className="w-3.5 h-3.5"/>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#0f1f3d] rounded-2xl p-6 text-white">
              <h3 className="font-bold text-[#f0b429] mb-2">How vendor billing uses these plans</h3>
              <ol className="text-sm text-slate-300 space-y-1.5 list-decimal list-inside">
                <li>You create a plan here (e.g. $50) — saved only in Snapect DB</li>
                <li>Vendor clicks the plan in their wallet / billing page</li>
                <li>We open Whop checkout for that USD amount dynamically</li>
                <li>After Whop webhook confirms payment, their wallet is credited 1:1</li>
              </ol>
            </div>
          </div>

        ) : tab==="samples" ? (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Agent Sample Reviews</h2>
              <p className="text-xs text-slate-400 mt-0.5">Review agent sample submissions before approving them to take orders</p>
            </div>
            {samples.length===0 ? (
              <div className="text-center py-12 text-slate-400"><ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-600"/><p>No pending samples</p></div>
            ) : samples.map(s=>(
              <div key={s.id} className="p-6 border-b border-slate-100 last:border-0">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-semibold text-slate-900">{s.agentName}</span>
                    <span className="ml-2 text-xs text-slate-500">{s.agentEmail}</span>
                    <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Pending Review</span>
                  </div>
                  <span className="text-xs text-slate-400" suppressHydrationWarning>{etDate(s.createdAt)}</span>
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
                  <button onClick={()=>reviewSample(s.id,"approved",s.agentId)}
                    className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl">
                    <CheckCircle className="w-4 h-4"/>Approve — Activate Agent
                  </button>
                  <button onClick={()=>reviewSample(s.id,"rejected",s.agentId)}
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
                  <div className="text-center py-12 text-slate-400"><CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-600"/><p>No pending payouts</p></div>
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
                        <span className="text-xs text-slate-400" suppressHydrationWarning>{etDate(p.created_at)}</span>
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
                              <span className="text-xs text-slate-400 text-center block">Vendor sets</span>
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
                            {svc.isCustom ? <span className="text-xs text-slate-600">—</span>
                            : <span className="text-sm font-medium text-amber-600">${rush24}</span>}
                          </div>

                          {/* Rush 6hr — auto calculated */}
                          <div className="col-span-2 text-center">
                            {svc.isCustom ? <span className="text-xs text-slate-600">—</span>
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

        ) : tab==="payment-links" ? (
          <div className="space-y-6">
            {/* Edit payment link modal */}
            {editingLink && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                  <h3 className="font-bold text-slate-900 mb-4">Edit Payment Link</h3>
                  <div className="space-y-3">
                    <div><label className="text-xs font-medium text-slate-600 block mb-1">Label</label>
                      <input value={editingLink.label} onChange={e=>setEditingLink(l=>l?{...l,label:e.target.value}:l)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/></div>
                    <div><label className="text-xs font-medium text-slate-600 block mb-1">URL</label>
                      <input value={editingLink.url} onChange={e=>setEditingLink(l=>l?{...l,url:e.target.value}:l)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/></div>
                    <div><label className="text-xs font-medium text-slate-600 block mb-1">Amount ($)</label>
                      <input type="number" value={editingLink.amount} onChange={e=>setEditingLink(l=>l?{...l,amount:e.target.value}:l)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/></div>
                    <div><label className="text-xs font-medium text-slate-600 block mb-1">Description</label>
                      <input value={editingLink.description} onChange={e=>setEditingLink(l=>l?{...l,description:e.target.value}:l)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/></div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={saveEditLink} disabled={saving==="edit-link"}
                      className="flex-1 bg-[#c8991a] hover:bg-[#f0b429] disabled:opacity-50 text-[#0f1f3d] font-bold py-2.5 rounded-xl text-sm">
                      {saving==="edit-link"?"Saving…":"Save Changes"}
                    </button>
                    <button onClick={()=>setEditingLink(null)} className="px-4 text-slate-500 text-sm border border-slate-200 rounded-xl hover:bg-slate-50">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* How-to banner */}
            <div className="bg-white rounded-2xl p-6 text-[#0f1f3d]">
              <h2 className="text-lg font-bold text-[#c8991a] mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5"/>How Payment Links Work
              </h2>
              <ol className="space-y-2 text-sm text-slate-600">
                {[
                  "Paste any payment URL — PayPal.me, Venmo, Zelle, CashApp, or a custom invoice URL like https://carebusinessconsultingsolutions.com/generate/invoice?...",
                  "Every time a vendor or agent needs to pay — they see a 'Pay Now' button that opens your link in a new tab",
                  "After they pay, you get a push notification (Ntfy) + email. Then click '✓ Confirm Pay' in Orders tab to activate the order",
                  "Vendor and agent signup is free — accounts auto-activate on registration (use Add Users tab only for legacy accounts)",
                  "Links are saved permanently until you delete them — no need to re-add each time",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-[#c8991a] text-[#0f1f3d] rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">{i+1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Add new link form */}
            <div className="bg-white border-2 border-emerald-300 rounded-2xl p-6">
              <h2 className="font-bold text-slate-900 mb-1 flex items-center gap-2 text-lg">
                <DollarSign className="w-5 h-5 text-emerald-600"/>Add Payment Link
              </h2>
              <p className="text-xs text-slate-500 mb-5">This link will appear as a "Pay Now" button for every vendor and agent payment.</p>
              {linkError && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{linkError}</div>}
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Label * <span className="font-normal text-slate-400">(shown to vendor)</span></label>
                  <input value={newLink.label} onChange={e=>setNewLink(l=>({...l,label:e.target.value}))}
                    placeholder="e.g. Pay via PayPal"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Amount ($) <span className="font-normal text-slate-400">(optional)</span></label>
                  <input type="number" value={newLink.amount} onChange={e=>setNewLink(l=>({...l,amount:e.target.value}))}
                    placeholder="e.g. 299"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Payment URL * <span className="font-normal text-slate-400">(the full link vendors will click)</span></label>
                  <input value={newLink.url} onChange={e=>setNewLink(l=>({...l,url:e.target.value}))}
                    placeholder="https://carebusinessconsultingsolutions.com/generate/invoice?care&realtoruplift&299"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono text-xs"/>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Description <span className="font-normal text-slate-400">(optional — shown below the button)</span></label>
                  <input value={newLink.description} onChange={e=>setNewLink(l=>({...l,description:e.target.value}))}
                    placeholder="e.g. Click to pay securely via our invoice system"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
                </div>
              </div>
              <button onClick={addPaymentLink} disabled={addingLink}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl text-sm">
                {addingLink ? "Adding…" : "＋ Add Payment Link"}
              </button>
            </div>

            {/* Saved links */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Saved Payment Links ({paymentLinks.length})</h2>
                <p className="text-xs text-slate-400">These appear as Pay Now buttons to all vendors and agents</p>
              </div>
              {paymentLinks.length === 0 ? (
                <div className="text-center py-16">
                  <DollarSign className="w-10 h-10 mx-auto mb-3 text-slate-600"/>
                  <p className="text-slate-500 font-semibold">No payment links yet</p>
                  <p className="text-slate-400 text-sm mt-1">Add your first link above to start receiving payments</p>
                </div>
              ) : paymentLinks.map(link => (
                <div key={link.id} className={`px-6 py-5 border-b border-slate-100 last:border-0 ${!link.active?"opacity-50":""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-slate-900">{link.label}</span>
                        {link.amount && <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">${link.amount}</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${link.active?"bg-green-100 text-green-700":"bg-slate-100 text-slate-500"}`}>
                          {link.active?"● Active":"○ Hidden"}
                        </span>
                      </div>
                      {link.description && <p className="text-xs text-slate-500 mb-1">{link.description}</p>}
                      <p className="text-xs text-blue-600 font-mono break-all">{link.url}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={()=>setEditingLink({id:link.id,label:link.label,url:link.url,amount:link.amount?String(link.amount):"",description:link.description})}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50">Edit</button>
                      <button onClick={()=>toggleLink(link.id,link.active)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${link.active?"border-slate-300 text-slate-600 hover:bg-slate-50":"border-green-300 text-green-700 hover:bg-green-50"}`}>
                        {link.active?"Hide":"Show"}
                      </button>
                      <button onClick={()=>deleteLink(link.id)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        ) : tab === "emails" ? (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Email Log</h2>
              <p className="text-xs text-slate-400">Stub emails — no real delivery</p>
            </div>
            {emails.length===0 ? (
              <div className="text-center py-12 text-slate-400"><Mail className="w-8 h-8 mx-auto mb-2 text-slate-600"/><p>No emails logged yet</p></div>
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
                      <span className="text-xs text-slate-400 whitespace-nowrap" suppressHydrationWarning>{etTime(e.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : tab === "disputes" ? (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="font-semibold text-slate-900">Disputes</h2>
                <p className="text-xs text-slate-400 mt-0.5">Snapect has no cash-refund policy — resolve via reshoot, wallet credit, or explanation</p>
              </div>
              <div className="flex gap-1">
                {["open","under_review","resolved","rejected","all"].map(s=>(
                  <button key={s} onClick={()=>setDisputeFilter(s)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${disputeFilter===s?"bg-slate-900 text-white border-slate-900":"border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    {s.replace("_"," ")}
                  </button>
                ))}
              </div>
            </div>
            {disputes.length===0 ? (
              <div className="text-center py-12 text-slate-400"><AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-600"/><p>No disputes{disputeFilter!=="all"?` (${disputeFilter.replace("_"," ")})`:""}</p></div>
            ) : disputes.map(d=>(
              <div key={d.id} className="p-5 border-b border-slate-100 last:border-0">
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        d.status==="resolved"?"bg-green-100 text-green-700":
                        d.status==="rejected"?"bg-red-100 text-red-700":
                        d.status==="under_review"?"bg-blue-100 text-blue-700":"bg-amber-100 text-amber-700"
                      }`}>{d.status.replace("_"," ")}</span>
                      <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">{d.reason.replace("_"," ")}</span>
                    </div>
                    <p className="font-medium text-slate-800 text-sm">{d.clientName} <span className="text-slate-400 font-normal">— {d.clientEmail}</span></p>
                    <p className="text-xs text-slate-500 mt-0.5">Order: {d.orderAddress ?? d.orderId}</p>
                  </div>
                  <span className="text-xs text-slate-400" suppressHydrationWarning>{etDate(d.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-600 mb-3">{d.description}</p>
                {d.resolution ? (
                  <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 inline-block">
                    Resolved: <strong>{d.resolution.replace("_"," ")}</strong>{d.resolutionAmount ? ` — $${d.resolutionAmount} credited` : ""}{d.resolutionNotes ? ` — ${d.resolutionNotes}` : ""}
                  </div>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {d.status === "open" && (
                      <button onClick={async()=>{ await fetch(`/api/disputes/${d.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"under_review"})}); fetchDisputes(disputeFilter); }}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50">Mark Under Review</button>
                    )}
                    <button onClick={()=>setResolveDisputeModal({id:d.id, clientName:d.clientName??""})}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-700">Resolve</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Admin Audit Log</h2>
              <p className="text-xs text-slate-400 mt-0.5">Every activation, payout, price change, sample decision, and order override — most recent first</p>
            </div>
            {auditLog.length===0 ? (
              <div className="text-center py-12 text-slate-400"><History className="w-8 h-8 mx-auto mb-2 text-slate-600"/><p>No admin actions logged yet</p></div>
            ) : (
              <div className="divide-y divide-slate-100">
                {auditLog.map(entry=>(
                  <div key={entry.id} className="px-6 py-3 flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{entry.action}</span>
                      <span className="ml-2 text-sm text-slate-700">{entry.actor_name}</span>
                      {entry.target_type && <span className="ml-2 text-xs text-slate-400">→ {entry.target_type} {entry.target_id}</span>}
                      {Object.keys(entry.details||{}).length>0 && (
                        <p className="text-xs text-slate-400 mt-0.5">{Object.entries(entry.details).map(([k,v])=>`${k}: ${v}`).join(" · ")}</p>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap" suppressHydrationWarning>{etDateTime(entry.created_at)}</span>
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
                  {agentsByState.map(a=><option key={a.id} value={a.id}>{a.name} — {a.__state}{a.available?" (available)":""}</option>)}
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

      {/* Resolve Dispute Modal */}
      {resolveDisputeModal&&(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Resolve Dispute — {resolveDisputeModal.clientName}</h3>
              <button onClick={()=>setResolveDisputeModal(null)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"><X className="w-5 h-5"/></button>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">No cash refunds — choose a reshoot, wallet credit, or a rejection with explanation.</p>
            <div className="space-y-2 mb-4">
              {[
                {v:"reshoot",label:"Free Reshoot", icon:<CameraIcon className="w-4 h-4"/>},
                {v:"wallet_credit",label:"Wallet Credit", icon:<WalletIcon className="w-4 h-4"/>},
                {v:"rejected",label:"Reject — No Action", icon:<XCircle className="w-4 h-4"/>},
                {v:"other",label:"Other", icon:<AlertCircle className="w-4 h-4"/>},
              ].map(opt=>(
                <button key={opt.v} onClick={()=>setResolveChoice(opt.v as typeof resolveChoice)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${resolveChoice===opt.v?"border-slate-900 bg-slate-900 text-white":"border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  {opt.icon}{opt.label}
                </button>
              ))}
            </div>
            {resolveChoice==="wallet_credit" && (
              <div className="mb-4">
                <label className="text-xs font-medium text-slate-600 block mb-1">Credit Amount ($) *</label>
                <input type="number" min="1" value={resolveAmount} onChange={e=>setResolveAmount(e.target.value)} placeholder="25"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"/>
              </div>
            )}
            <div className="mb-4">
              <label className="text-xs font-medium text-slate-600 block mb-1">Notes to vendor</label>
              <textarea value={resolveNotes} onChange={e=>setResolveNotes(e.target.value)} rows={3} placeholder="Explain the outcome…"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"/>
            </div>
            <div className="flex gap-2">
              <button onClick={submitDisputeResolution} disabled={resolvingDispute || (resolveChoice==="wallet_credit" && !resolveAmount)}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl">
                {resolvingDispute?"Resolving…":"Submit Resolution"}
              </button>
              <button onClick={()=>setResolveDisputeModal(null)} className="px-4 text-slate-500 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
