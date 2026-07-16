"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Car, MapPin, User, Phone, Mail, Lock, FileText, ArrowRight, CheckCircle, DollarSign, Camera, AlertTriangle, Search } from "lucide-react";
import PublicNav from "../../../app/components/PublicNav";
import PublicFooter from "../../../app/components/PublicFooter";

const STEPS = ["Profile","Coverage","Password","Review"];

export default function AgentRegisterPage() {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name:"", email:"", phone:"", bio:"", coverageZone:"", zip:"", vehicle:"", password:"", confirm:"" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [zipCoverage, setZipCoverage] = useState<{covered:boolean;agentCount:number}|null>(null);
  const [checkingZip, setCheckingZip] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => setForm(f=>({...f,[k]:e.target.value}));
  const inp = "w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a] focus:border-transparent";

  async function checkZip(zip: string) {
    if (zip.length !== 5) return;
    setCheckingZip(true);
    const r = await fetch("/api/coverage-check", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({zip}) });
    const d = await r.json();
    setZipCoverage(d);
    setCheckingZip(false);
  }

  async function submit() {
    if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/auth/register", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ ...form, role:"agent" }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error??"Registration failed"); setLoading(false); return; }
    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <div className="min-h-screen bg-white pt-20">
        <PublicNav />
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-lg">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-white p-8 text-center">
                <div className="w-16 h-16 bg-[#c8991a] rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-[#0f1f3d]"/>
                </div>
                <h1 className="text-2xl font-bold text-[#0f1f3d] mb-2">Agent Account Created!</h1>
                <p className="text-slate-600 text-sm">Free signup — your account is active. Log in now to get started.</p>
              </div>
              <div className="p-8">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                  <p className="font-bold text-amber-900 text-sm mb-1">⚠️ Next Steps</p>
                  <p className="text-amber-800 text-xs leading-relaxed">1. Log in to your agent dashboard<br/>2. Upload your 7-photo sample set within 48 hours<br/>3. Start receiving job offers in your coverage area</p>
                </div>
                <Link href="/login" className="block w-full text-center bg-[#c8991a] hover:bg-[#f0b429] text-[#0f1f3d] font-bold py-3 rounded-xl">
                  Log In →
                </Link>
              </div>
            </div>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-20">
      <PublicNav />

      <section className="bg-white py-10 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Warning banner */}
          <div className="bg-amber-400/10 border border-amber-400/40 rounded-2xl p-4 mb-8 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"/>
            <div className="text-sm text-amber-200">
              <span className="font-bold text-amber-300">Read before registering: </span>
              You must submit a 7-photo sample set within <strong>48 hours</strong> of account creation or your application will be automatically rejected. If you already registered and missed the deadline, do not register again — log in and request reactivation.
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Perks sidebar */}
            <div className="text-[#0f1f3d]">
              <p className="text-[#c8991a] font-bold text-sm uppercase tracking-wider mb-3">Why Join</p>
              <h1 className="text-2xl font-extrabold mb-5 leading-tight">Become a Field Agent</h1>
              <ul className="space-y-4">
                {[
                  { icon:<DollarSign className="w-4 h-4"/>, text:"Earn as much as you can, paid every Friday via PayPal" },
                  { icon:<MapPin className="w-4 h-4"/>, text:"Only local jobs — set your own ZIP codes" },
                  { icon:<Camera className="w-4 h-4"/>, text:"Just your smartphone — no equipment needed" },
                  { icon:<CheckCircle className="w-4 h-4"/>, text:"No real estate license required" },
                  { icon:<Car className="w-4 h-4"/>, text:"Work your own hours, flexible schedule" },
                ].map(({icon,text})=>(
                  <li key={text} className="flex items-start gap-2.5 text-slate-600 text-sm">
                    <span className="text-[#c8991a] flex-shrink-0 mt-0.5">{icon}</span>{text}
                  </li>
                ))}
              </ul>
              <div className="mt-6 p-4 bg-slate-50 rounded-xl">
                <p className="text-[#c8991a] font-bold text-sm mb-2">Signup</p>
                <p className="text-4xl font-black text-[#0f1f3d] mb-1">Free</p>
                <p className="text-slate-400 text-xs">No application fee. Create your account and start browsing jobs right away.</p>
              </div>
            </div>

            {/* Form */}
            <div className="md:col-span-2 bg-white rounded-2xl shadow-xl p-8">
              {/* Step progress */}
              <div className="flex items-center justify-between mb-8">
                {STEPS.map((s,i)=>(
                  <div key={s} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${i<step?"bg-[#c8991a] text-[#0f1f3d]":i===step?"bg-white text-[#c8991a]":"bg-slate-100 text-slate-400"}`}>
                      {i<step?<CheckCircle className="w-4 h-4"/>:i+1}
                    </div>
                    <span className={`ml-1.5 text-xs font-medium hidden sm:block ${i===step?"text-[#0f1f3d]":"text-slate-400"}`}>{s}</span>
                    {i<STEPS.length-1&&<div className={`mx-2 h-0.5 w-8 sm:w-12 ${i<step?"bg-[#c8991a]":"bg-slate-200"}`}/>}
                  </div>
                ))}
              </div>

              {error&&<div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>}

              {step===0&&(
                <div className="space-y-4">
                  <h2 className="font-bold text-[#0f1f3d] text-lg mb-4">Personal Information</h2>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                    <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                      <input required value={form.name} onChange={set("name")} placeholder="Jane Smith" className={inp}/></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                      <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                        <input required type="email" value={form.email} onChange={set("email")} placeholder="you@email.com" className={inp}/></div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                      <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                        <input required value={form.phone} onChange={set("phone")} placeholder="555-0100" className={inp}/></div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Short Bio (optional)</label>
                    <div className="relative"><FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400"/>
                      <textarea value={form.bio} onChange={set("bio")} rows={3} placeholder="Tell clients about your experience and availability…"
                        className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a] focus:border-transparent resize-none"/></div>
                  </div>
                  <button onClick={()=>{ if(!form.name||!form.email||!form.phone){setError("Name, email and phone required");return;} setError("");setStep(1); }}
                    className="w-full bg-[#c8991a] hover:bg-[#f0b429] text-[#0f1f3d] font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                    Continue <ArrowRight className="w-4 h-4"/>
                  </button>
                </div>
              )}

              {step===1&&(
                <div className="space-y-4">
                  <h2 className="font-bold text-[#0f1f3d] text-lg mb-4">Coverage & Equipment</h2>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Your Primary ZIP Code *</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                      <input required value={form.zip} onChange={e=>{set("zip")(e);if(e.target.value.length===5)checkZip(e.target.value);}}
                        placeholder="60601" maxLength={5}
                        className="w-full pl-9 pr-10 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
                      {checkingZip&&<Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-pulse"/>}
                    </div>
                    {zipCoverage&&(
                      <p className={`text-xs mt-1 ${zipCoverage.covered?"text-amber-600":"text-green-600"}`}>
                        {zipCoverage.covered?`${zipCoverage.agentCount} agent(s) already active here — you'll join the rotation`:"Coverage available in your area — great location!"}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">City / Region *</label>
                    <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                      <input required value={form.coverageZone} onChange={set("coverageZone")} placeholder="Chicago, IL (within 25 miles)" className={inp}/></div>
                    <p className="text-xs text-slate-400 mt-1">You can add more ZIP codes later in your agent dashboard</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle *</label>
                    <div className="relative"><Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                      <input required value={form.vehicle} onChange={set("vehicle")} placeholder="2022 Toyota Camry" className={inp}/></div>
                  </div>
                  <div className="p-4 bg-[#faf8f3] border border-[#c8991a]/30 rounded-xl">
                    <h4 className="font-semibold text-[#0f1f3d] text-sm mb-2">Requirements</h4>
                    <ul className="text-xs text-slate-600 space-y-1">
                      {["Smartphone with camera (12MP+ recommended)","Upload photos at 1280×960 resolution or higher","Available 9 AM – 6 PM local time","Respond to job offers within 3 hours","Complete orders within 30 hours (or as specified)","Submit 7-photo sample set within 48 hours of registering"].map(r=>(
                        <li key={r} className="flex items-start gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-[#c8991a] flex-shrink-0 mt-0.5"/>{r}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={()=>setStep(0)} className="flex-1 border border-slate-300 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-50">Back</button>
                    <button onClick={()=>{ if(!form.coverageZone||!form.vehicle||!form.zip){setError("All fields required");return;} setError("");setStep(2); }}
                      className="flex-1 bg-[#c8991a] hover:bg-[#f0b429] text-[#0f1f3d] font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                      Continue <ArrowRight className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              )}

              {step===2&&(
                <div className="space-y-4">
                  <h2 className="font-bold text-[#0f1f3d] text-lg mb-4">Set Your Password</h2>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                    <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                      <input required type={showPw?"text":"password"} value={form.password} onChange={set("password")} placeholder="Minimum 8 characters"
                        className="w-full pl-9 pr-9 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a] focus:border-transparent"/>
                      <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {showPw?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                      </button></div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password *</label>
                    <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                      <input required type={showPw?"text":"password"} value={form.confirm} onChange={set("confirm")} placeholder="Repeat password" className={inp}/></div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={()=>setStep(1)} className="flex-1 border border-slate-300 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-50">Back</button>
                    <button onClick={()=>{ if(!form.password||form.password.length<8){setError("Password min 8 chars");return;} if(form.password!==form.confirm){setError("Passwords don't match");return;} setError("");setStep(3); }}
                      className="flex-1 bg-[#c8991a] hover:bg-[#f0b429] text-[#0f1f3d] font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                      Continue <ArrowRight className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              )}

              {step===3&&(
                <div className="space-y-4">
                  <h2 className="font-bold text-[#0f1f3d] text-lg mb-4">Review & Submit</h2>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-sm">
                    {[["Name",form.name],["Email",form.email],["Phone",form.phone],["ZIP",form.zip],["Coverage Zone",form.coverageZone],["Vehicle",form.vehicle]].map(([l,v])=>(
                      <div key={l} className="flex justify-between"><span className="text-slate-500">{l}</span><span className="font-medium text-slate-800">{v}</span></div>
                    ))}
                  </div>
                  <div className="p-4 bg-white rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#0f1f3d] text-sm">Signup Fee</p>
                      <p className="text-xs text-slate-400 mt-0.5">Free — your account is active immediately</p>
                    </div>
                    <span className="text-2xl font-black text-[#c8991a]">$0</span>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"/>
                    <p className="text-xs text-amber-800">After account creation, you must upload your 7-photo sample set within <strong>48 hours</strong> to stay eligible for job dispatch.</p>
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer mb-2">
                    <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#c8991a]"/>
                    <span className="text-xs text-slate-600">I agree to the <Link href="/terms" target="_blank" className="text-[#c8991a] font-semibold hover:underline">Terms of Service</Link>.</span>
                  </label>
                  <div className="flex gap-3">
                    <button onClick={()=>setStep(2)} className="flex-1 border border-slate-300 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-50">Back</button>
                    <button onClick={submit} disabled={loading || !agreed}
                      className="flex-1 bg-[#c8991a] hover:bg-[#f0b429] disabled:opacity-50 text-[#0f1f3d] font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                      {loading?"Submitting…":<><span>Create Agent Account</span><ArrowRight className="w-4 h-4"/></>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
