"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut, Camera, MapPin, Clock, CheckCircle, Upload, X, User, Wifi, WifiOff,
  DollarSign, Star, ToggleLeft, ToggleRight, Edit3, Save, Car, Package, Image as ImageIcon,
  Gavel, AlertCircle, ShieldCheck, Plus, Trash2, ZapIcon,
} from "lucide-react";

interface Bid { id: string; orderId: string; agentId: string; amount: number; message: string; placedAt: string; status: string; placedByAdmin?: boolean; }
interface Order {
  id: string; address: string; status: string; totalPrice: number; compensationAmount: number;
  serviceType: string; turnaroundTier: string; notes: string; customizeNotes: string;
  photos: { id: string; filename: string; url: string; description: string }[];
  createdAt: string; offerAcceptedAt: string | null; assignedAgentId: string | null;
  bids?: Bid[]; acceptedBidId?: string | null; responseDeadline?: string | null;
}
interface AgentProfile {
  id: string; name: string; email: string; phone: string; bio: string;
  coverageZone: string; vehicle: string; available: boolean; rating: number;
  totalEarnings: number; pendingPayout: number; completedJobs: number;
  grade?: number; approved?: boolean;
}

const TIER_LABELS: Record<string,string> = { standard:"Next Business Day", rush_24hr:"24-Hour Rush", rush_6hr:"6-Hour Rush" };
const TIER_HOURS: Record<string,number> = { standard:24, rush_24hr:24, rush_6hr:6 };

function Countdown({ from, hours, label }: { from: string; hours: number; label: string }) {
  const [r, setR] = useState("");
  useEffect(() => {
    const u = () => {
      const diff = new Date(from).getTime() + hours*3600000 - Date.now();
      if (diff<=0){setR("Overdue");return;}
      setR(`${Math.floor(diff/3600000)}h ${Math.floor((diff%3600000)/60000)}m`);
    };
    u(); const t=setInterval(u,30000); return ()=>clearInterval(t);
  }, [from,hours]);
  return <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${r==="Overdue"?"bg-red-100 text-red-700":"bg-green-50 text-green-700"}`}><Clock className="w-3 h-3"/>{label}: {r}</span>;
}

export default function AgentPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<AgentProfile|null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"mine"|"offers"|"coverage"|"sample"|"profile">("mine");
  const [liveConnected, setLiveConnected] = useState(false);
  const [acting, setActing] = useState<string|null>(null);
  const [declining, setDeclining] = useState<string|null>(null);
  const esRef = useRef<EventSource|null>(null);

  // Bids
  const [biddingOrder, setBiddingOrder] = useState<string|null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [bidMessage, setBidMessage] = useState("");
  const [submittingBid, setSubmittingBid] = useState(false);
  const [bidError, setBidError] = useState("");
  const [myBids, setMyBids] = useState<Record<string,Bid>>({});

  // Photo upload
  const [uploadingFor, setUploadingFor] = useState<string|null>(null);
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Profile edit
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({bio:"",coverageZone:"",vehicle:"",phone:""});
  const [savingProfile, setSavingProfile] = useState(false);
  const [togglingAvail, setTogglingAvail] = useState(false);


  // ZIP codes
  const [zips, setZips] = useState<string[]>([]);
  const [newZip, setNewZip] = useState("");
  const [savingZips, setSavingZips] = useState(false);

  // Sample submission
  const [sampleFiles, setSampleFiles] = useState<string[]>([]);
  const [sampleSubmitted, setSampleSubmitted] = useState(false);
  const [submittingSample, setSubmittingSample] = useState(false);
  const sampleRef = useRef<HTMLInputElement>(null);

  const fetchProfile = useCallback(async (id: string) => {
    const r = await fetch(`/api/agents/${id}`);
    const d = await r.json();
    if (d.agent) {
      setProfile(d.agent);
      setProfileForm({bio:d.agent.bio,coverageZone:d.agent.coverageZone,vehicle:d.agent.vehicle,phone:d.agent.phone});
    }
  }, []);

  const fetchMyBids = useCallback(async (orderIds: string[]) => {
    const results: Record<string,Bid> = {};
    await Promise.all(orderIds.map(async oid => {
      const r = await fetch(`/api/orders/${oid}/bids`);
      const d = await r.json();
      if (d.bids?.length>0) results[oid] = d.bids[0];
    }));
    setMyBids(results);
  }, []);


  const fetchZips = useCallback(async () => {
    const r = await fetch("/api/zip-codes");
    const d = await r.json();
    setZips(d.zips ?? []);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me").then(r=>r.json()).then(d=>{ if(d.user) fetchProfile(d.user.id); });
    const es = new EventSource("/api/events");
    esRef.current = es;
    es.addEventListener("connected", ()=>setLiveConnected(true));
    es.addEventListener("orders", (e)=>{
      const parsed = JSON.parse(e.data) as Order[];
      setOrders(parsed); setLoading(false);
      const pendingIds = parsed.filter(o=>o.status==="pending"&&!o.assignedAgentId).map(o=>o.id);
      if (pendingIds.length>0) fetchMyBids(pendingIds);
    });
    es.onerror = ()=>setLiveConnected(false);
    return ()=>{ es.close(); };
  }, [fetchProfile, fetchMyBids]);

  useEffect(()=>{ if(tab==="coverage") fetchZips(); }, [tab, fetchZips]);

  async function toggleAvailability() {
    if (!profile) return;
    setTogglingAvail(true);
    await fetch(`/api/agents/${profile.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({available:!profile.available}) });
    setProfile(p=>p?{...p,available:!p.available}:p);
    setTogglingAvail(false);
  }

  async function declineOrder(orderId: string) {
    setDeclining(orderId);
    await fetch(`/api/orders/${orderId}/decline`, { method:"POST" });
    setDeclining(null);
  }

  async function directAccept(orderId: string) {
    setActing(orderId);
    await fetch(`/api/orders/${orderId}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({accept:true}) });
    setActing(null);
  }

  async function submitBid(orderId: string) {
    if (!bidAmount||Number(bidAmount)<=0){setBidError("Enter a valid amount");return;}
    setSubmittingBid(true); setBidError("");
    const r = await fetch(`/api/orders/${orderId}/bids`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({amount:Number(bidAmount),message:bidMessage}) });
    const d = await r.json();
    if (!r.ok){setBidError(d.error??"Failed");setSubmittingBid(false);return;}
    setMyBids(prev=>({...prev,[orderId]:d.bid}));
    setBiddingOrder(null); setBidAmount(""); setBidMessage(""); setSubmittingBid(false);
  }

  async function updateStatus(orderId: string, status: string) {
    setActing(orderId);
    await fetch(`/api/orders/${orderId}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({status}) });
    setActing(null);
  }

  async function saveProfile() {
    if (!profile) return;
    setSavingProfile(true);
    await fetch(`/api/agents/${profile.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(profileForm) });
    setProfile(p=>p?{...p,...profileForm}:p);
    setEditingProfile(false); setSavingProfile(false);
  }

  async function uploadPhoto(orderId: string, file: File) {
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async ()=>{
      await fetch(`/api/orders/${orderId}/photos`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({filename:file.name,url:reader.result,description:uploadDesc}) });
      setUploadingFor(null); setUploadDesc(""); setUploading(false);
    };
    reader.readAsDataURL(file);
  }

  async function saveZips() {
    setSavingZips(true);
    await fetch("/api/zip-codes", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({zips}) });
    setSavingZips(false);
  }

  async function submitSamplePhotos() {
    if (sampleFiles.length<7){alert("Please upload exactly 7 photos");return;}
    setSubmittingSample(true);
    await fetch("/api/samples", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({photos:sampleFiles}) });
    setSampleSubmitted(true); setSubmittingSample(false);
  }

  const myOrders = orders.filter(o=>o.assignedAgentId===profile?.id);
  const availableOrders = orders.filter(o=>o.status==="pending"&&!o.assignedAgentId);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/snapect-logo.png" alt="Snapect" className="h-8 w-auto object-contain" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
          <span className="text-xs bg-green-50 text-green-700 border border-green-100 rounded-full px-2 py-0.5 font-medium">Agent Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${liveConnected?"bg-green-50 text-green-600 border-green-200":"bg-slate-50 text-slate-400 border-slate-200"}`}>
            {liveConnected?<Wifi className="w-3 h-3"/>:<WifiOff className="w-3 h-3"/>}{liveConnected?"Live":"Connecting…"}
          </div>
          <span className="text-sm text-slate-600">Welcome, <span className="font-semibold">{profile?.name??"Agent"}</span></span>
          {profile && (
            <button onClick={toggleAvailability} disabled={togglingAvail}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border ${profile.available?"bg-green-50 text-green-700 border-green-200":"bg-slate-50 text-slate-500 border-slate-200"}`}>
              {profile.available?<ToggleRight className="w-3.5 h-3.5"/>:<ToggleLeft className="w-3.5 h-3.5"/>}
              {togglingAvail?"…":profile.available?"Available":"Unavailable"}
            </button>
          )}
          <button onClick={async()=>{await fetch("/api/auth/logout",{method:"POST"});router.push("/");}} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600">
            <LogOut className="w-4 h-4"/>
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Approval warning */}
        {profile && profile.approved===false && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"/>
            <div>
              <p className="font-semibold text-amber-800">Account Pending Approval</p>
              <p className="text-sm text-amber-700 mt-0.5">Please submit your 7-photo sample set for review. You'll be able to accept orders once approved.</p>
              <button onClick={()=>setTab("sample")} className="text-xs font-semibold text-amber-700 underline mt-1">Go to Sample Submission →</button>
            </div>
          </div>
        )}

        {/* Stats */}
        {profile && (
          <div className="grid grid-cols-5 gap-3 mb-5">
            {[
              {label:"My Jobs",val:myOrders.length,color:"text-blue-600"},
              {label:"Available",val:availableOrders.length,color:"text-amber-600"},
              {label:"Completed",val:profile.completedJobs,color:"text-green-600"},
              {label:"Grade",val:profile.grade!=null?`${profile.grade}/5`:"—",color:"text-purple-600"},
              {label:"Pending Pay",val:`$${profile.pendingPayout}`,color:"text-emerald-600"},
            ].map(({label,val,color})=>(
              <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
                <div className={`text-xl font-bold ${color}`}>{val}</div>
                <div className="text-xs text-slate-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-5 flex-wrap">
          {([
            ["mine","My Jobs"],["offers","Available"],            ["coverage","ZIP Codes"],["sample","Sample"],["profile","Profile"]
          ] as const).map(([t,label])=>(
            <button key={t} onClick={()=>setTab(t)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${tab===t?"bg-white text-slate-900 shadow-sm":"text-slate-500 hover:text-slate-700"}`}>
              {label}
              {t==="offers"&&availableOrders.length>0&&<span className="ml-1 bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{availableOrders.length}</span>}
            </button>
          ))}
        </div>

        {loading ? <div className="text-center py-20 text-slate-400 text-sm">Connecting…</div>

        : tab==="mine" ? (
          <div className="space-y-4">
            {myOrders.length===0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                <Camera className="w-10 h-10 text-slate-600 mx-auto mb-3"/>
                <p className="text-slate-500 font-medium">No active jobs</p>
              </div>
            ) : myOrders.map(order=>(
              <div key={order.id} className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${order.status==="in_progress"?"bg-blue-100 text-blue-700":"bg-green-100 text-green-700"}`}>{order.status.replace("_"," ")}</span>
                      <span className="text-xs text-slate-400">{TIER_LABELS[order.turnaroundTier]}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium"><MapPin className="w-3.5 h-3.5 text-slate-400"/>{order.address}</div>
                    <div className="text-xs text-slate-500 mt-1 capitalize">{order.serviceType.replace(/_/g," ")}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold text-green-700">${order.compensationAmount}</div>
                    <div className="text-xs text-slate-400">your earnings</div>
                  </div>
                </div>
                {order.offerAcceptedAt&&order.status==="in_progress"&&(
                  <div className="mb-3"><Countdown from={order.offerAcceptedAt} hours={TIER_HOURS[order.turnaroundTier]} label="Deadline"/></div>
                )}
                {order.notes&&<div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 mb-3">{order.notes}</div>}
                {order.status==="in_progress"&&(
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={()=>setUploadingFor(uploadingFor===order.id?null:order.id)}
                      className="flex items-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium px-3 py-2 rounded-lg">
                      <Upload className="w-3.5 h-3.5"/>Upload Photo
                    </button>
                    <button onClick={()=>updateStatus(order.id,"completed")} disabled={acting===order.id}
                      className="flex items-center gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-2 rounded-lg disabled:opacity-50">
                      <CheckCircle className="w-3.5 h-3.5"/>{acting===order.id?"…":"Mark Complete"}
                    </button>
                  </div>
                )}
                {uploadingFor===order.id&&(
                  <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <input type="text" placeholder="Photo description" value={uploadDesc} onChange={e=>setUploadDesc(e.target.value)}
                      className="w-full text-sm border border-blue-200 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"/>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e=>{if(e.target.files?.[0])uploadPhoto(order.id,e.target.files[0]);}}/>
                    <div className="flex gap-2">
                      <button onClick={()=>fileRef.current?.click()} disabled={uploading}
                        className="flex items-center gap-1.5 text-xs bg-blue-600 text-white font-medium px-3 py-2 rounded-lg disabled:opacity-50">
                        {uploading?"Uploading…":<><ImageIcon className="w-3.5 h-3.5"/>Choose File</>}
                      </button>
                      <button onClick={()=>setUploadingFor(null)} className="text-xs text-slate-500 px-2">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

        ) : tab==="offers" ? (
          <div className="space-y-4">
            {availableOrders.length===0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                <Package className="w-10 h-10 text-slate-600 mx-auto mb-3"/>
                <p className="text-slate-500 font-medium">No available orders right now</p>
              </div>
            ) : availableOrders.map(order=>{
              const myBid = myBids[order.id];
              const isBidding = biddingOrder===order.id;
              return (
                <div key={order.id} className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Open</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${order.turnaroundTier==="rush_6hr"?"bg-red-50 text-red-600":order.turnaroundTier==="rush_24hr"?"bg-amber-50 text-amber-700":"bg-slate-50 text-slate-500"}`}>
                          {order.turnaroundTier!=="standard"?"⚡ ":""}{TIER_LABELS[order.turnaroundTier]}
                        </span>
                        <span className="text-xs text-slate-400 capitalize">{order.serviceType.replace(/_/g," ")}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium"><MapPin className="w-3.5 h-3.5 text-slate-400"/>{order.address}</div>
                      {order.notes&&<p className="text-xs text-slate-500 mt-1">{order.notes}</p>}
                    </div>

                  </div>
                  {myBid ? (
                    <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${myBid.status==="accepted"?"bg-green-50 text-green-700":myBid.status==="rejected"?"bg-red-50 text-red-700":"bg-blue-50 text-blue-700"}`}>
                      <Gavel className="w-4 h-4"/>
                      <div>
                        <span className="font-semibold">Your bid: ${myBid.amount}</span>
                        {myBid.message&&<span className="ml-2 text-xs opacity-75">"{myBid.message}"</span>}
                        <span className={`ml-2 font-medium capitalize ${myBid.status==="pending"?"text-blue-600":myBid.status==="accepted"?"text-green-700":"text-red-600"}`}> — {myBid.status}</span>
                        {myBid.placedByAdmin&&<span className="ml-1 text-xs opacity-60">(placed by admin)</span>}
                      </div>
                    </div>
                  ) : isBidding ? (
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 space-y-2">
                      {bidError&&<p className="text-xs text-red-600">{bidError}</p>}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/>
                          <input type="number" min="1" placeholder="Your offer amount" value={bidAmount} onChange={e=>setBidAmount(e.target.value)}
                            className="w-full pl-7 pr-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"/>
                        </div>
                        <input type="text" placeholder="Message (optional)" value={bidMessage} onChange={e=>setBidMessage(e.target.value)}
                          className="flex-1 px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"/>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={()=>submitBid(order.id)} disabled={submittingBid}
                          className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-2 rounded-lg disabled:opacity-50">
                          <Gavel className="w-3.5 h-3.5"/>{submittingBid?"Placing…":"Place Bid"}
                        </button>
                        <button onClick={()=>{setBiddingOrder(null);setBidAmount("");setBidMessage("");setBidError("");}} className="text-xs text-slate-500 px-2">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={()=>{setBiddingOrder(order.id);setBidAmount("");}}
                        className="flex items-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-3 py-2 rounded-lg border border-blue-200">
                        <Gavel className="w-3.5 h-3.5"/>Place Bid
                      </button>
                      <button onClick={()=>declineOrder(order.id)} disabled={declining===order.id}
                        className="flex items-center gap-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-3 py-2 rounded-lg border border-red-200 disabled:opacity-50">
                        {declining===order.id?"…":"Skip"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        ) : tab==="coverage" ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-1 flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-600"/>ZIP Code Coverage</h2>
            <p className="text-sm text-slate-500 mb-4">Add the ZIP codes you want to cover. Orders in these areas will be auto-dispatched to you based on your grade.</p>
            <div className="flex gap-2 mb-4">
              <input value={newZip} onChange={e=>setNewZip(e.target.value.replace(/\D/g,"").slice(0,5))}
                placeholder="e.g. 60601" maxLength={5}
                className="w-32 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              <button onClick={()=>{if(newZip.length===5&&!zips.includes(newZip)){setZips(z=>[...z,newZip]);setNewZip("");}}}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-xl">
                <Plus className="w-4 h-4"/>Add
              </button>
            </div>
            {zips.length===0 ? (
              <p className="text-sm text-slate-400">No ZIP codes added yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-4">
                {zips.map(z=>(
                  <span key={z} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-sm font-medium px-3 py-1.5 rounded-full">
                    {z}
                    <button onClick={()=>setZips(prev=>prev.filter(p=>p!==z))} className="hover:text-red-600"><X className="w-3 h-3"/></button>
                  </span>
                ))}
              </div>
            )}
            <button onClick={saveZips} disabled={savingZips}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl">
              <Save className="w-4 h-4"/>{savingZips?"Saving…":"Save ZIP Codes"}
            </button>
          </div>

        ) : tab==="sample" ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-1 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-purple-600"/>Sample Photo Submission</h2>
            <p className="text-sm text-slate-500 mb-4">Upload exactly 7 photos of any property (front, sides, address, street scenes). Our team will review within 2 business days.</p>
            {sampleSubmitted ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 font-medium">
                ✓ Sample submitted! We'll email you within 2 business days.
              </div>
            ) : (
              <>
                <input ref={sampleRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={e=>{
                    if (!e.target.files) return;
                    const readers = Array.from(e.target.files).slice(0,7).map(f=>new Promise<string>(res=>{
                      const r=new FileReader(); r.onload=()=>res(r.result as string); r.readAsDataURL(f);
                    }));
                    Promise.all(readers).then(setSampleFiles);
                  }}/>
                <button onClick={()=>sampleRef.current?.click()} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-xl mb-4">
                  <ImageIcon className="w-4 h-4"/>Choose 7 Photos ({sampleFiles.length}/7)
                </button>
                {sampleFiles.length>0&&(
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {sampleFiles.map((src,i)=>(
                      <div key={i} className="aspect-video rounded-lg overflow-hidden bg-slate-100">
                        <img src={src} alt={`sample ${i+1}`} className="w-full h-full object-cover"/>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={submitSamplePhotos} disabled={submittingSample||sampleFiles.length!==7}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
                  <ShieldCheck className="w-4 h-4"/>{submittingSample?"Submitting…":"Submit for Review"}
                </button>
              </>
            )}
          </div>

        ) : (
          // Profile tab
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            {profile&&(
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{profile.name}</h2>
                    <p className="text-sm text-slate-500">{profile.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400"/>
                    <span className="font-bold text-slate-700">{profile.rating?.toFixed(1)}</span>
                    {profile.grade!=null&&<span className="text-xs text-slate-400">Grade: <span className="font-semibold text-purple-600">{profile.grade}/5</span></span>}
                  </div>
                </div>
                {editingProfile ? (
                  <div className="space-y-3">
                    {[{label:"Phone",key:"phone",ph:"555-0101"},{label:"Coverage Zone",key:"coverageZone",ph:"Chicago, IL"},{label:"Vehicle",key:"vehicle",ph:"2022 Honda CR-V"}].map(({label,key,ph})=>(
                      <div key={key}>
                        <label className="text-xs font-medium text-slate-600 block mb-1">{label}</label>
                        <input value={profileForm[key as keyof typeof profileForm]} onChange={e=>setProfileForm(f=>({...f,[key]:e.target.value}))}
                          placeholder={ph} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
                      </div>
                    ))}
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">Bio</label>
                      <textarea value={profileForm.bio} onChange={e=>setProfileForm(f=>({...f,bio:e.target.value}))} rows={3}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"/>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveProfile} disabled={savingProfile} className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50">
                        <Save className="w-4 h-4"/>{savingProfile?"Saving…":"Save"}
                      </button>
                      <button onClick={()=>setEditingProfile(false)} className="text-sm text-slate-500 px-3">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[{icon:<User className="w-4 h-4"/>,label:"Phone",val:profile.phone},{icon:<MapPin className="w-4 h-4"/>,label:"Coverage Zone",val:profile.coverageZone},{icon:<Car className="w-4 h-4"/>,label:"Vehicle",val:profile.vehicle}].map(({icon,label,val})=>(
                      <div key={label} className="flex items-center gap-3 text-sm">
                        <span className="text-slate-400">{icon}</span>
                        <span className="text-slate-500 w-28">{label}</span>
                        <span className="text-slate-700 font-medium">{val||"—"}</span>
                      </div>
                    ))}
                    {profile.bio&&<p className="text-sm text-slate-600 italic">"{profile.bio}"</p>}
                    <button onClick={()=>setEditingProfile(true)} className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:text-blue-700">
                      <Edit3 className="w-4 h-4"/>Edit Profile
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
