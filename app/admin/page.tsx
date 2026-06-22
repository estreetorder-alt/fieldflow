"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut, Users, DollarSign, ClipboardList, RefreshCw,
  Save, Camera, CheckCircle, Clock, XCircle, Wifi, WifiOff,
  Star, ToggleLeft, ToggleRight, Mail, MapPin, Car, Download,
  AlertCircle, Package,
} from "lucide-react";

interface Order {
  id: string; address: string; status: string; clientId: string;
  assignedAgentId: string | null; totalPrice: number; compensationAmount: number;
  serviceType: string; turnaroundTier: string; notes: string; createdAt: string;
  client?: { name: string; email: string } | null;
  agent?: { name: string; rating?: number } | null;
}
interface Agent {
  id: string; name: string; email: string; phone: string; coverageZone: string; vehicle: string;
  available: boolean; rating: number; totalEarnings: number; pendingPayout: number; completedJobs: number;
}
interface PricingConfig {
  id: string; serviceType: string; basePrice: number; urgencyMultiplier: number; active: boolean;
}
interface EmailEntry {
  timestamp: string; type: string; to: string; subject: string; body: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};
const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5" />, in_progress: <RefreshCw className="w-3.5 h-3.5" />,
  completed: <CheckCircle className="w-3.5 h-3.5" />, cancelled: <XCircle className="w-3.5 h-3.5" />,
};
const TIER_BADGES: Record<string, string> = {
  standard: "bg-slate-50 text-slate-500",
  rush_24hr: "bg-amber-50 text-amber-700",
  rush_6hr: "bg-red-50 text-red-700",
};
const TIER_LABELS: Record<string, string> = {
  standard: "Standard", rush_24hr: "Rush 24hr", rush_6hr: "Rush 6hr",
};

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"orders" | "agents" | "pricing" | "emails">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [pricing, setPricing] = useState<PricingConfig[]>([]);
  const [emails, setEmails] = useState<EmailEntry[]>([]);
  const [editingPrice, setEditingPrice] = useState<Record<string, Partial<PricingConfig>>>({});
  const [ratingEdit, setRatingEdit] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [userName, setUserName] = useState("Admin");
  const [liveConnected, setLiveConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const fetchAll = useCallback(async () => {
    const [agentsRes, pricingRes, meRes, emailsRes] = await Promise.all([
      fetch("/api/agents"),
      fetch("/api/pricing"),
      fetch("/api/auth/me"),
      fetch("/api/email-log"),
    ]);
    const [agentsData, pricingData, meData, emailsData] = await Promise.all([
      agentsRes.json(), pricingRes.json(), meRes.json(), emailsRes.json(),
    ]);
    setAgents(agentsData.agents ?? []);
    setPricing(pricingData.pricing ?? []);
    setEmails(emailsData.emails ?? []);
    if (meData.user) setUserName(meData.user.name);
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

  async function handleLogout() { await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); }

  async function assignAgent(orderId: string, agentId: string | null, status?: string) {
    const body: Record<string, unknown> = { assignedAgentId: agentId };
    if (status) body.status = status;
    await fetch(`/api/orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  }

  async function updateStatus(orderId: string, status: string) {
    await fetch(`/api/orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
  }

  async function savePricing(id: string) {
    setSaving(id);
    const updates = editingPrice[id];
    if (!updates) { setSaving(null); return; }
    await fetch("/api/pricing", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...updates }) });
    setSaving(null);
    setEditingPrice(prev => { const n = { ...prev }; delete n[id]; return n; });
    fetchAll();
  }

  function setPriceEdit(id: string, field: string, value: string | number | boolean) {
    setEditingPrice(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function toggleAgentAvailability(agent: Agent) {
    await fetch(`/api/agents/${agent.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ available: !agent.available }) });
    setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, available: !a.available } : a));
  }

  async function saveAgentRating(agentId: string) {
    const rating = ratingEdit[agentId];
    if (rating == null) return;
    setSaving(`rating-${agentId}`);
    await fetch(`/api/agents/${agentId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating }) });
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, rating } : a));
    setRatingEdit(prev => { const n = { ...prev }; delete n[agentId]; return n; });
    setSaving(null);
  }

  async function markAgentPaid(agentId: string) {
    setSaving(`pay-${agentId}`);
    await fetch(`/api/agents/${agentId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markPaid: true }) });
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, pendingPayout: 0 } : a));
    setSaving(null);
  }

  const ordersByStatus = {
    pending: orders.filter(o => o.status === "pending"),
    in_progress: orders.filter(o => o.status === "in_progress"),
    completed: orders.filter(o => o.status === "completed"),
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-700 rounded-lg flex items-center justify-center">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-slate-900">FieldFlow</span>
              <span className="ml-2 text-xs bg-purple-100 text-purple-700 font-medium px-2 py-0.5 rounded-full">Admin Studio</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${liveConnected ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
              {liveConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {liveConnected ? "Live" : "Offline"}
            </div>
            <span className="text-sm text-slate-500 hidden sm:block">Welcome, <span className="font-medium text-slate-700">{userName}</span></span>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600 transition-colors">
              <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          {[
            { label: "Total Orders", value: orders.length, icon: <ClipboardList className="w-4 h-4" />, color: "text-blue-600 bg-blue-50" },
            { label: "Pending", value: ordersByStatus.pending.length, icon: <Clock className="w-4 h-4" />, color: "text-amber-600 bg-amber-50" },
            { label: "In Progress", value: ordersByStatus.in_progress.length, icon: <RefreshCw className="w-4 h-4" />, color: "text-blue-600 bg-blue-50" },
            { label: "Completed", value: ordersByStatus.completed.length, icon: <CheckCircle className="w-4 h-4" />, color: "text-green-600 bg-green-50" },
            { label: "Active Agents", value: agents.filter(a => a.available).length, icon: <Users className="w-4 h-4" />, color: "text-purple-600 bg-purple-50" },
          ].map((card) => (
            <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${card.color}`}>{card.icon}</div>
              <div className="text-2xl font-bold text-slate-900">{card.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit flex-wrap">
          {([
            ["orders", "Orders", <ClipboardList key="o" className="w-4 h-4 inline mr-1 mb-0.5" />],
            ["agents", "Agents", <Users key="a" className="w-4 h-4 inline mr-1 mb-0.5" />],
            ["pricing", "Pricing", <DollarSign key="p" className="w-4 h-4 inline mr-1 mb-0.5" />],
            ["emails", "Email Log", <Mail key="e" className="w-4 h-4 inline mr-1 mb-0.5" />],
          ] as const).map(([t, label, icon]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {icon}{label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading…</div>
        ) : tab === "orders" ? (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">All Orders</h2>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                {liveConnected && <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />}
                {liveConnected ? "Auto-updating" : "Manual refresh needed"}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-6 py-3">Order / Address</th>
                    <th className="text-left px-6 py-3">Client</th>
                    <th className="text-left px-6 py-3">Service</th>
                    <th className="text-left px-6 py-3">Price / Comp.</th>
                    <th className="text-left px-6 py-3">Status</th>
                    <th className="text-left px-6 py-3">Assign Agent</th>
                    <th className="text-left px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs text-slate-400 mb-0.5">{order.id}</div>
                        <div className="text-slate-700 text-xs max-w-[180px] truncate font-medium">{order.address}</div>
                        <div className={`inline-flex text-xs font-medium px-1.5 py-0.5 rounded mt-1 ${TIER_BADGES[order.turnaroundTier] ?? "bg-slate-50 text-slate-500"}`}>
                          {TIER_LABELS[order.turnaroundTier] ?? order.turnaroundTier}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs">{order.client?.name ?? order.clientId}</td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-700 capitalize">{order.serviceType.replace(/_/g, " ")}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">${order.totalPrice}</div>
                        <div className="text-xs text-green-600">Agent: ${order.compensationAmount}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
                          {STATUS_ICONS[order.status]}{order.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select value={order.assignedAgentId ?? ""}
                          onChange={e => assignAgent(order.id, e.target.value || null, e.target.value ? "in_progress" : "pending")}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                          <option value="">Unassigned</option>
                          {agents.map(a => <option key={a.id} value={a.id}>{a.name}{a.available ? " ✓" : " (off)"}</option>)}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <select value={order.status} onChange={e => updateStatus(order.id, e.target.value)}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <button onClick={() => window.open(`/api/orders/${order.id}/invoice`, "_blank")}
                            className="p-1.5 text-slate-400 hover:text-blue-600 border border-slate-200 rounded-lg hover:border-blue-200">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">No orders yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        ) : tab === "agents" ? (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Field Agents</h2>
              <span className="text-xs text-slate-400">{agents.filter(a => a.available).length}/{agents.length} available</span>
            </div>
            {agents.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>No agents yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {agents.map(agent => {
                  const editedRating = ratingEdit[agent.id];
                  const displayRating = editedRating ?? agent.rating;
                  return (
                    <div key={agent.id} className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <span className="font-semibold text-slate-900">{agent.name}</span>
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${agent.available ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                              {agent.available ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                              {agent.available ? "Available" : "Unavailable"}
                            </span>
                            <button onClick={() => toggleAgentAvailability(agent)}
                              className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600">
                              {agent.available ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4" />}
                              Toggle
                            </button>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{agent.email}</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{agent.coverageZone || "—"}</span>
                            <span className="flex items-center gap-1"><Car className="w-3 h-3" />{agent.vehicle || "—"}</span>
                            <span className="flex items-center gap-1"><Package className="w-3 h-3" />{agent.completedJobs} jobs done</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            {/* Star rating */}
                            <div className="flex items-center gap-0.5">
                              {[1,2,3,4,5].map(n => (
                                <button key={n} onClick={() => setRatingEdit(prev => ({ ...prev, [agent.id]: n }))}
                                  className={`w-5 h-5 transition-colors ${n <= displayRating ? "text-amber-400" : "text-slate-200 hover:text-amber-300"}`}>
                                  <Star className="w-full h-full fill-current" />
                                </button>
                              ))}
                            </div>
                            <span className="text-sm font-bold text-slate-600">{displayRating.toFixed(1)}</span>
                            {editedRating != null && (
                              <button onClick={() => saveAgentRating(agent.id)} disabled={saving === `rating-${agent.id}`}
                                className="text-xs bg-blue-600 text-white px-2 py-1 rounded-lg font-medium">
                                {saving === `rating-${agent.id}` ? "…" : "Save"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Payout */}
                      <div className="mt-3 flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                        <div className="flex-1 grid grid-cols-3 gap-3 text-center">
                          <div>
                            <div className="text-sm font-bold text-green-700">${agent.totalEarnings}</div>
                            <div className="text-xs text-slate-400">Total Earned</div>
                          </div>
                          <div>
                            <div className={`text-sm font-bold ${agent.pendingPayout > 0 ? "text-purple-700" : "text-slate-400"}`}>${agent.pendingPayout}</div>
                            <div className="text-xs text-slate-400">Pending Payout</div>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-700">{agent.completedJobs}</div>
                            <div className="text-xs text-slate-400">Completed Jobs</div>
                          </div>
                        </div>
                        {agent.pendingPayout > 0 && (
                          <button onClick={() => markAgentPaid(agent.id)} disabled={saving === `pay-${agent.id}`}
                            className="flex items-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold px-3 py-2 rounded-lg whitespace-nowrap">
                            <DollarSign className="w-3.5 h-3.5" />
                            {saving === `pay-${agent.id}` ? "…" : "Mark Paid"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        ) : tab === "pricing" ? (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Pricing Configuration</h2>
              <p className="text-xs text-slate-500 mt-0.5">Edit base prices. Final price = base × turnaround multiplier (Standard ×1.0 · Rush 24hr ×1.25 · Rush 6hr ×1.75).</p>
            </div>
            <div className="p-6 space-y-4">
              {pricing.map((p) => {
                const edits = editingPrice[p.id] || {};
                const basePrice = edits.basePrice ?? p.basePrice;
                const multiplier = edits.urgencyMultiplier ?? p.urgencyMultiplier;
                const active = edits.active ?? p.active;
                const isDirty = Object.keys(edits).length > 0;
                return (
                  <div key={p.id} className="border border-slate-200 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-slate-800 capitalize">{p.serviceType.replace(/_/g, " ")}</h3>
                        <div onClick={() => setPriceEdit(p.id, "active", !active)} className="flex items-center gap-1.5 cursor-pointer">
                          <div className={`w-9 h-5 rounded-full relative transition-colors ${active ? "bg-green-500" : "bg-slate-300"}`}>
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${active ? "translate-x-4" : "translate-x-0.5"}`} />
                          </div>
                          <span className="text-xs text-slate-500">{active ? "Active" : "Inactive"}</span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-400">
                        Std: <span className="font-semibold text-slate-600">${basePrice}</span>
                        {" · "}Rush 24hr: <span className="font-semibold text-slate-600">${Math.round(Number(basePrice) * 1.25)}</span>
                        {" · "}Rush 6hr: <span className="font-semibold text-slate-600">${Math.round(Number(basePrice) * 1.75)}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1.5">Base Price ($)</label>
                        <input type="number" value={basePrice}
                          onChange={e => setPriceEdit(p.id, "basePrice", e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1.5">Legacy Urgency Multiplier (×)</label>
                        <input type="number" step="0.1" value={multiplier}
                          onChange={e => setPriceEdit(p.id, "urgencyMultiplier", e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      </div>
                    </div>
                    {isDirty && (
                      <button onClick={() => savePricing(p.id)} disabled={saving === p.id}
                        className="mt-3 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
                        <Save className="w-3.5 h-3.5" />{saving === p.id ? "Saving…" : "Save Changes"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        ) : (
          // Email Log
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Email Log</h2>
              <p className="text-xs text-slate-400">Stub emails sent by the platform (no real delivery)</p>
            </div>
            {emails.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Mail className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>No emails logged yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {emails.map((e, i) => (
                  <div key={i} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            e.type === "new_order" ? "bg-blue-50 text-blue-700"
                              : e.type === "order_completed" ? "bg-green-50 text-green-700"
                              : e.type === "offer_sent" ? "bg-amber-50 text-amber-700"
                              : e.type === "welcome" ? "bg-purple-50 text-purple-700"
                              : "bg-slate-50 text-slate-600"
                          }`}>{e.type.replace(/_/g, " ")}</span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" />To: {e.to}
                          </span>
                        </div>
                        <p className="font-medium text-slate-800 text-sm">{e.subject}</p>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{e.body}</p>
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0" suppressHydrationWarning>
                        {new Date(e.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
