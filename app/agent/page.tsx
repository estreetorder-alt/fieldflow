"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut, Camera, MapPin, Clock, CheckCircle, RefreshCw, Upload, X,
  User, Wifi, WifiOff, DollarSign, Star, ToggleLeft, ToggleRight,
  Edit3, Save, Car, AlertCircle, Zap, Package, Image as ImageIcon, Trash2, Gavel,
} from "lucide-react";

interface Photo { id: string; filename: string; url: string; description: string; selectedByClient: boolean; }
interface Bid { id: string; orderId: string; agentId: string; amount: number; message: string; placedAt: string; status: string; placedByAdmin?: boolean; }
interface Order {
  id: string; address: string; status: string; totalPrice: number; compensationAmount: number;
  serviceType: string; turnaroundTier: string; notes: string; customizeNotes: string;
  photos: Photo[]; createdAt: string; offerSentAt: string | null; offerAcceptedAt: string | null;
  client?: { name: string; email: string } | null; assignedAgentId: string | null;
  bids?: Bid[]; acceptedBidId?: string | null;
}
interface AgentProfile {
  id: string; name: string; email: string; phone: string; bio: string;
  coverageZone: string; vehicle: string; available: boolean; rating: number;
  totalEarnings: number; pendingPayout: number; completedJobs: number;
}

const TIER_LABELS: Record<string, string> = { standard: "Next Business Day", rush_24hr: "24-Hour Rush", rush_6hr: "6-Hour Rush" };
const TIER_HOURS: Record<string, number> = { standard: 24, rush_24hr: 24, rush_6hr: 6 };

function Countdown({ from, hours, label }: { from: string; hours: number; label: string }) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    const update = () => {
      const deadline = new Date(new Date(from).getTime() + hours * 3600000);
      const diff = deadline.getTime() - Date.now();
      if (diff <= 0) { setRemaining("Overdue"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${h}h ${m}m`);
    };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, [from, hours]);
  const overdue = remaining === "Overdue";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${overdue ? "bg-red-100 text-red-700" : "bg-green-50 text-green-700"}`}>
      <Clock className="w-3 h-3" /> {label}: {remaining}
    </span>
  );
}

export default function AgentPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"mine" | "offers" | "profile">("mine");
  const [acting, setActing] = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [togglingAvail, setTogglingAvail] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  // Photo upload
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile edit
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ bio: "", coverageZone: "", vehicle: "", phone: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  // Bid state
  const [biddingOrder, setBiddingOrder] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [bidMessage, setBidMessage] = useState("");
  const [submittingBid, setSubmittingBid] = useState(false);
  const [bidError, setBidError] = useState("");
  const [myBids, setMyBids] = useState<Record<string, Bid>>({});

  const fetchProfile = useCallback(async (id: string) => {
    const r = await fetch(`/api/agents/${id}`);
    const d = await r.json();
    if (d.agent) {
      setProfile(d.agent);
      setProfileForm({ bio: d.agent.bio, coverageZone: d.agent.coverageZone, vehicle: d.agent.vehicle, phone: d.agent.phone });
    }
  }, []);

  const fetchMyBids = useCallback(async (orderIds: string[]) => {
    const results: Record<string, Bid> = {};
    await Promise.all(orderIds.map(async (oid) => {
      const r = await fetch(`/api/orders/${oid}/bids`);
      const d = await r.json();
      if (d.bids?.length > 0) results[oid] = d.bids[0];
    }));
    setMyBids(results);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user) fetchProfile(d.user.id);
    });
    const es = new EventSource("/api/events");
    esRef.current = es;
    es.addEventListener("connected", () => setLiveConnected(true));
    es.addEventListener("orders", (e) => {
      const parsed = JSON.parse(e.data) as Order[];
      setOrders(parsed);
      setLoading(false);
      // Fetch my bids for pending orders
      const pendingIds = parsed.filter(o => o.status === "pending" && !o.assignedAgentId).map(o => o.id);
      if (pendingIds.length > 0) fetchMyBids(pendingIds);
    });
    es.onerror = () => setLiveConnected(false);
    return () => { es.close(); };
  }, [fetchProfile, fetchMyBids]);

  async function toggleAvailability() {
    if (!profile) return;
    setTogglingAvail(true);
    await fetch(`/api/agents/${profile.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !profile.available }),
    });
    setProfile(p => p ? { ...p, available: !p.available } : p);
    setTogglingAvail(false);
  }

  async function directAccept(orderId: string) {
    setActing(orderId);
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept: true }),
    });
    setActing(null);
  }

  async function submitBid(orderId: string) {
    if (!bidAmount || Number(bidAmount) <= 0) { setBidError("Enter a valid amount"); return; }
    setSubmittingBid(true); setBidError("");
    const r = await fetch(`/api/orders/${orderId}/bids`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(bidAmount), message: bidMessage }),
    });
    const d = await r.json();
    if (!r.ok) { setBidError(d.error ?? "Failed to place bid"); setSubmittingBid(false); return; }
    setMyBids(prev => ({ ...prev, [orderId]: d.bid }));
    setBiddingOrder(null); setBidAmount(""); setBidMessage("");
    setSubmittingBid(false);
  }

  async function updateStatus(orderId: string, status: string) {
    setActing(orderId);
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setActing(null);
  }

  async function saveProfile() {
    if (!profile) return;
    setSavingProfile(true);
    await fetch(`/api/agents/${profile.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileForm),
    });
    setProfile(p => p ? { ...p, ...profileForm } : p);
    setEditingProfile(false); setSavingProfile(false);
  }

  async function uploadPhoto(orderId: string, file: File) {
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      await fetch(`/api/orders/${orderId}/photos`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, url: reader.result, description: uploadDesc }),
      });
      setUploadingFor(null); setUploadDesc(""); setUploading(false);
    };
    reader.readAsDataURL(file);
  }

  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); }

  const myOrders = orders.filter(o => o.assignedAgentId === profile?.id);
  const availableOrders = orders.filter(o => o.status === "pending" && !o.assignedAgentId);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center text-base font-bold">📷</span>
          <span className="font-bold text-slate-900">FieldFlow</span>
          <span className="text-xs bg-green-50 text-green-700 border border-green-100 rounded-full px-2 py-0.5 font-medium">Agent Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${liveConnected ? "bg-green-50 text-green-600 border-green-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}>
            {liveConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {liveConnected ? "Live" : "Connecting…"}
          </div>
          <span className="text-sm text-slate-600">Welcome, <span className="font-semibold">{profile?.name ?? "Agent"}</span></span>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Stats */}
        {profile && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: "My Jobs", val: myOrders.length, color: "text-blue-600" },
              { label: "Available Orders", val: availableOrders.length, color: "text-amber-600" },
              { label: "Completed", val: profile.completedJobs, color: "text-green-600" },
              { label: "Pending Payout", val: `$${profile.pendingPayout}`, color: "text-purple-600" },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 text-center">
                <div className={`text-2xl font-bold ${color}`}>{val}</div>
                <div className="text-xs text-slate-400 mt-1">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
          {([["mine", "My Jobs"], ["offers", "Available Orders"], ["profile", "Profile"]] as const).map(([t, label]) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {label}{t === "offers" && availableOrders.length > 0 && (
                <span className="ml-1.5 bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{availableOrders.length}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400 text-sm">Connecting…</div>
        ) : activeTab === "mine" ? (
          <div className="space-y-4">
            {myOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                <Camera className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No active jobs</p>
                <p className="text-slate-400 text-sm mt-1">Check Available Orders to bid on new work</p>
              </div>
            ) : myOrders.map(order => (
              <div key={order.id} className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${order.status === "in_progress" ? "bg-blue-100 text-blue-700" : order.status === "completed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {order.status.replace("_", " ")}
                      </span>
                      <span className="text-xs text-slate-400">{TIER_LABELS[order.turnaroundTier]}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {order.address}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 capitalize">{order.serviceType.replace(/_/g, " ")}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold text-green-700">${order.compensationAmount}</div>
                    <div className="text-xs text-slate-400">your earnings</div>
                  </div>
                </div>

                {order.notes && (
                  <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 mb-3">{order.notes}</div>
                )}

                {order.offerAcceptedAt && order.status === "in_progress" && (
                  <div className="mb-3">
                    <Countdown from={order.offerAcceptedAt} hours={TIER_HOURS[order.turnaroundTier]} label="Deadline" />
                  </div>
                )}

                {/* Photos */}
                {order.photos.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-slate-600 mb-2">{order.photos.length} photo(s) uploaded</p>
                    <div className="flex gap-2 flex-wrap">
                      {order.photos.map(ph => (
                        <div key={ph.id} className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                          {ph.url?.startsWith("data:") ? (
                            <img src={ph.url} alt={ph.description} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Camera className="w-5 h-5 text-slate-400" /></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {order.status === "in_progress" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setUploadingFor(uploadingFor === order.id ? null : order.id)}
                      className="flex items-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium px-3 py-2 rounded-lg">
                      <Upload className="w-3.5 h-3.5" /> Upload Photo
                    </button>
                    <button onClick={() => updateStatus(order.id, "completed")} disabled={acting === order.id}
                      className="flex items-center gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-2 rounded-lg disabled:opacity-50">
                      <CheckCircle className="w-3.5 h-3.5" /> {acting === order.id ? "…" : "Mark Complete"}
                    </button>
                  </div>
                )}

                {/* Upload panel */}
                {uploadingFor === order.id && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <input type="text" placeholder="Photo description" value={uploadDesc}
                      onChange={e => setUploadDesc(e.target.value)}
                      className="w-full text-sm border border-blue-200 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { if (e.target.files?.[0]) uploadPhoto(order.id, e.target.files[0]); }} />
                    <div className="flex gap-2">
                      <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                        className="flex items-center gap-1.5 text-xs bg-blue-600 text-white font-medium px-3 py-2 rounded-lg disabled:opacity-50">
                        {uploading ? "Uploading…" : <><ImageIcon className="w-3.5 h-3.5" /> Choose File</>}
                      </button>
                      <button onClick={() => setUploadingFor(null)} className="text-xs text-slate-500 px-2">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

        ) : activeTab === "offers" ? (
          <div className="space-y-4">
            {availableOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No available orders right now</p>
                <p className="text-slate-400 text-sm mt-1">Check back soon — new orders appear here in real time</p>
              </div>
            ) : availableOrders.map(order => {
              const myBid = myBids[order.id];
              const isBidding = biddingOrder === order.id;
              return (
                <div key={order.id} className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Open</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${order.turnaroundTier === "rush_6hr" ? "bg-red-50 text-red-600" : order.turnaroundTier === "rush_24hr" ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-500"}`}>
                          {order.turnaroundTier === "rush_6hr" ? "⚡ " : order.turnaroundTier === "rush_24hr" ? "⚡ " : ""}{TIER_LABELS[order.turnaroundTier]}
                        </span>
                        <span className="text-xs text-slate-400 capitalize">{order.serviceType.replace(/_/g, " ")}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {order.address}
                      </div>
                      {order.notes && <p className="text-xs text-slate-500 mt-1">{order.notes}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-slate-400">Offered</div>
                      <div className="text-lg font-bold text-green-700">${order.compensationAmount}</div>
                    </div>
                  </div>

                  {/* Bids on this order */}
                  {(order.bids?.length ?? 0) > 0 && (
                    <div className="mb-3 text-xs text-slate-400">{order.bids!.length} bid(s) placed</div>
                  )}

                  {myBid ? (
                    // Agent already bid
                    <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${myBid.status === "accepted" ? "bg-green-50 text-green-700" : myBid.status === "rejected" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>
                      <Gavel className="w-4 h-4" />
                      <div>
                        <span className="font-semibold">Your bid: ${myBid.amount}</span>
                        {myBid.message && <span className="ml-2 text-xs opacity-75">"{myBid.message}"</span>}
                        <span className={`ml-2 font-medium capitalize ${myBid.status === "pending" ? "text-blue-600" : myBid.status === "accepted" ? "text-green-700" : "text-red-600"}`}>
                          — {myBid.status}
                        </span>
                        {myBid.placedByAdmin && <span className="ml-1 text-xs opacity-60">(placed by admin)</span>}
                      </div>
                    </div>
                  ) : isBidding ? (
                    // Bid form
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 space-y-2">
                      {bidError && <p className="text-xs text-red-600">{bidError}</p>}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input type="number" min="1" placeholder={`${order.compensationAmount}`}
                            value={bidAmount} onChange={e => setBidAmount(e.target.value)}
                            className="w-full pl-7 pr-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        </div>
                        <input type="text" placeholder="Message (optional)" value={bidMessage}
                          onChange={e => setBidMessage(e.target.value)}
                          className="flex-1 px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => submitBid(order.id)} disabled={submittingBid}
                          className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-2 rounded-lg disabled:opacity-50">
                          <Gavel className="w-3.5 h-3.5" />{submittingBid ? "Placing…" : "Place Bid"}
                        </button>
                        <button onClick={() => { setActing(order.id); directAccept(order.id); }} disabled={acting === order.id}
                          className="flex items-center gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-2 rounded-lg disabled:opacity-50">
                          <CheckCircle className="w-3.5 h-3.5" /> Accept at ${order.compensationAmount}
                        </button>
                        <button onClick={() => { setBiddingOrder(null); setBidAmount(""); setBidMessage(""); setBidError(""); }}
                          className="text-xs text-slate-500 px-2">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    // Default actions
                    <div className="flex gap-2">
                      <button onClick={() => { setBiddingOrder(order.id); setBidAmount(String(order.compensationAmount)); }}
                        className="flex items-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-3 py-2 rounded-lg border border-blue-200">
                        <Gavel className="w-3.5 h-3.5" /> Place Bid
                      </button>
                      <button onClick={() => directAccept(order.id)} disabled={acting === order.id}
                        className="flex items-center gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded-lg disabled:opacity-50">
                        <CheckCircle className="w-3.5 h-3.5" /> {acting === order.id ? "…" : `Accept at $${order.compensationAmount}`}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        ) : (
          // Profile tab
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            {profile && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{profile.name}</h2>
                    <p className="text-sm text-slate-500">{profile.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="font-bold text-slate-700">{profile.rating?.toFixed(1)}</span>
                    </div>
                    <button onClick={toggleAvailability} disabled={togglingAvail}
                      className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl border transition-all ${profile.available ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                      {profile.available ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      {togglingAvail ? "…" : profile.available ? "Available" : "Unavailable"}
                    </button>
                  </div>
                </div>

                {editingProfile ? (
                  <div className="space-y-3">
                    {[
                      { label: "Phone", key: "phone", placeholder: "555-0101" },
                      { label: "Coverage Zone", key: "coverageZone", placeholder: "Chicago, IL" },
                      { label: "Vehicle", key: "vehicle", placeholder: "2022 Honda CR-V" },
                    ].map(({ label, key, placeholder }) => (
                      <div key={key}>
                        <label className="text-xs font-medium text-slate-600 block mb-1">{label}</label>
                        <input value={profileForm[key as keyof typeof profileForm]}
                          onChange={e => setProfileForm(f => ({ ...f, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      </div>
                    ))}
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">Bio</label>
                      <textarea value={profileForm.bio} onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                        rows={3} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveProfile} disabled={savingProfile}
                        className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50">
                        <Save className="w-4 h-4" />{savingProfile ? "Saving…" : "Save"}
                      </button>
                      <button onClick={() => setEditingProfile(false)} className="text-sm text-slate-500 px-3">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[
                      { icon: <User className="w-4 h-4" />, label: "Phone", val: profile.phone },
                      { icon: <MapPin className="w-4 h-4" />, label: "Coverage Zone", val: profile.coverageZone },
                      { icon: <Car className="w-4 h-4" />, label: "Vehicle", val: profile.vehicle },
                    ].map(({ icon, label, val }) => (
                      <div key={label} className="flex items-center gap-3 text-sm">
                        <span className="text-slate-400">{icon}</span>
                        <span className="text-slate-500 w-28">{label}</span>
                        <span className="text-slate-700 font-medium">{val || "—"}</span>
                      </div>
                    ))}
                    {profile.bio && <p className="text-sm text-slate-600 italic mt-2">"{profile.bio}"</p>}
                    <button onClick={() => setEditingProfile(true)}
                      className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:text-blue-700 mt-2">
                      <Edit3 className="w-4 h-4" /> Edit Profile
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
