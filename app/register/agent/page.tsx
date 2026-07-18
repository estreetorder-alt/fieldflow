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
  const inp = "w-full pl-9 pr-3 py-2.5 border border-[#D8C4AC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C2410C] focus:border-transparent";

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
      <div className="min-h-screen bg-[#FAF6EF] pt-20">
        <PublicNav />
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-lg">
            <div className="bg-white border border-[#E7DBCB] rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-white p-8 text-center">
                <div className="w-16 h-16 bg-[#C2410C] rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-[#2A2320]"/>
                </div>
                <h1 className="text-2xl font-bold text-[#2A2320] mb-2">Agent Account Created!</h1>
                <p className="text-[#6B5D52] text-sm">Free signup — your account is active. Log in now to get started.</p>
              </div>
              <div className="p-8">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                  <p className="font-bold text-amber-900 text-sm mb-1">⚠️ Next Steps</p>
                  <p className="text-amber-800 text-xs leading-relaxed">1. Log in to your agent dashboard<br/>2. Upload your 7-photo sample set within 48 hours<br/>3. Start receiving job offers in your coverage area</p>
                </div>
                <Link href="/login" className="block w-full text-center bg-[#C2410C] hover:bg-[#EA580C] text-white font-bold py-3 rounded-xl">
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
    <div className="min-h-screen bg-[#FAF6EF] pt-20">
      <PublicNav />

      <div className="grid md:grid-cols-2 min-h-[calc(100vh-80px)]">
        {/* Left panel — solid orange, matches reference */}
        <div className="relative overflow-hidden px-8 sm:px-14 py-16 flex flex-col justify-center bg-[#C2410C]">
          <span className="inline-block w-fit bg-white/15 text-white text-sm font-semibold px-4 py-1.5 rounded-full mb-6 border border-white/20">
            Agent Registration
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-5 leading-tight text-white">
            Turn Your Smartphone Into a Money-Making Tool
          </h1>
          <p className="text-white/80 text-base mb-10 max-w-sm leading-relaxed">
            Join thousands of field agents earning flexible income on their own schedule.
          </p>
          <div className="space-y-5">
            {[
              { icon: <DollarSign className="w-5 h-5" />, title: "Rewarding Income", text: "Full-time earning potential" },
              { icon: <Camera className="w-5 h-5" />, title: "No Special Equipment", text: "Just your smartphone" },
              { icon: <MapPin className="w-5 h-5" />, title: "Work Locally", text: "Jobs near your location" },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white flex-shrink-0">{f.icon}</div>
                <div>
                  <p className="font-bold text-white text-sm">{f.title}</p>
                  <p className="text-white/70 text-xs mt-0.5">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — white, multi-step form */}
        <div className="bg-white px-6 sm:px-14 py-12 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto">
            <h2 className="text-2xl font-extrabold text-[#2A2320] mb-1">Become an Agent</h2>
            <p className="text-[#8A7A6C] text-sm mb-6">Start earning on your own schedule</p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-6 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Submit a 7-photo sample set within <strong>48 hours</strong> of registering or your application is auto-rejected. Already registered and missed it? Log in and request reactivation instead of re-registering.
              </p>
            </div>

            <div className="flex items-center justify-between mb-7">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${i < step ? "bg-[#C2410C] text-white" : i === step ? "bg-[#FCEEE3] text-[#C2410C] border-2 border-[#C2410C]" : "bg-[#EADCC8] text-[#A99885]"}`}>
                    {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`ml-1.5 text-xs font-medium hidden sm:block ${i === step ? "text-[#2A2320]" : "text-[#A99885]"}`}>{s}</span>
                  {i < STEPS.length - 1 && <div className={`mx-2 h-0.5 w-6 sm:w-10 ${i < step ? "bg-[#C2410C]" : "bg-[#EADCC8]"}`} />}
                </div>
              ))}
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>}

            {step===0&&(
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#4A403A] mb-1">Full Name</label>
                    <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A99885]"/>
                      <input required value={form.name} onChange={set("name")} placeholder="John Doe" className={inp}/></div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A403A] mb-1">Email</label>
                    <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A99885]"/>
                      <input required type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" className={inp}/></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-[#4A403A] mb-1">Phone</label>
                      <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A99885]"/>
                        <input required value={form.phone} onChange={set("phone")} placeholder="Phone" className={inp}/></div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#4A403A] mb-1">Location</label>
                      <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A99885]"/>
                        <input value={form.coverageZone} onChange={set("coverageZone")} placeholder="City" className={inp}/></div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A403A] mb-1">Short Bio (optional)</label>
                    <div className="relative"><FileText className="absolute left-3 top-3 w-4 h-4 text-[#A99885]"/>
                      <textarea value={form.bio} onChange={set("bio")} rows={2} placeholder="Tell clients about your experience and availability…"
                        className="w-full pl-9 pr-3 py-2.5 border border-[#D8C4AC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C2410C] focus:border-transparent resize-none"/></div>
                  </div>
                  <button onClick={()=>{ if(!form.name||!form.email||!form.phone){setError("Name, email and phone required");return;} setError("");setStep(1); }}
                    className="w-full bg-[#C2410C] hover:bg-[#EA580C] text-white font-bold py-3.5 rounded-full flex items-center justify-center gap-2 transition-colors mt-2">
                    Continue <ArrowRight className="w-4 h-4"/>
                  </button>
                </div>
              )}

              {step===1&&(
                <div className="space-y-4">
                  <h2 className="font-bold text-[#2A2320] text-lg mb-4">Coverage & Equipment</h2>
                  <div>
                    <label className="block text-sm font-medium text-[#4A403A] mb-1">Your Primary ZIP Code *</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A99885]"/>
                      <input required value={form.zip} onChange={e=>{set("zip")(e);if(e.target.value.length===5)checkZip(e.target.value);}}
                        placeholder="60601" maxLength={5}
                        className="w-full pl-9 pr-10 py-2.5 border border-[#D8C4AC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C2410C]"/>
                      {checkingZip&&<Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A99885] animate-pulse"/>}
                    </div>
                    {zipCoverage&&(
                      <p className={`text-xs mt-1 ${zipCoverage.covered?"text-amber-600":"text-green-600"}`}>
                        {zipCoverage.covered?`${zipCoverage.agentCount} agent(s) already active here — you'll join the rotation`:"Coverage available in your area — great location!"}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A403A] mb-1">City / Region *</label>
                    <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A99885]"/>
                      <input required value={form.coverageZone} onChange={set("coverageZone")} placeholder="Chicago, IL (within 25 miles)" className={inp}/></div>
                    <p className="text-xs text-[#A99885] mt-1">You can add more ZIP codes later in your agent dashboard</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A403A] mb-1">Vehicle *</label>
                    <div className="relative"><Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A99885]"/>
                      <input required value={form.vehicle} onChange={set("vehicle")} placeholder="2022 Toyota Camry" className={inp}/></div>
                  </div>
                  <div className="p-4 bg-[#FAF6EF] border border-[#C2410C]/30 rounded-xl">
                    <h4 className="font-semibold text-[#2A2320] text-sm mb-2">Requirements</h4>
                    <ul className="text-xs text-[#6B5D52] space-y-1">
                      {["Smartphone with camera (12MP+ recommended)","Upload photos at 1280×960 resolution or higher","Available 9 AM – 6 PM local time","Respond to job offers within 3 hours","Complete orders within 30 hours (or as specified)","Submit 7-photo sample set within 48 hours of registering"].map(r=>(
                        <li key={r} className="flex items-start gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-[#C2410C] flex-shrink-0 mt-0.5"/>{r}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={()=>setStep(0)} className="flex-1 border border-[#D8C4AC] text-[#6B5D52] font-semibold py-3 rounded-xl hover:bg-[#F3EBDD]">Back</button>
                    <button onClick={()=>{ if(!form.coverageZone||!form.vehicle||!form.zip){setError("All fields required");return;} setError("");setStep(2); }}
                      className="flex-1 bg-[#C2410C] hover:bg-[#EA580C] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                      Continue <ArrowRight className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              )}

              {step===2&&(
                <div className="space-y-4">
                  <h2 className="font-bold text-[#2A2320] text-lg mb-4">Set Your Password</h2>
                  <div>
                    <label className="block text-sm font-medium text-[#4A403A] mb-1">Password *</label>
                    <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A99885]"/>
                      <input required type={showPw?"text":"password"} value={form.password} onChange={set("password")} placeholder="Minimum 8 characters"
                        className="w-full pl-9 pr-9 py-2.5 border border-[#D8C4AC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C2410C] focus:border-transparent"/>
                      <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A99885]">
                        {showPw?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                      </button></div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A403A] mb-1">Confirm Password *</label>
                    <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A99885]"/>
                      <input required type={showPw?"text":"password"} value={form.confirm} onChange={set("confirm")} placeholder="Repeat password" className={inp}/></div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={()=>setStep(1)} className="flex-1 border border-[#D8C4AC] text-[#6B5D52] font-semibold py-3 rounded-xl hover:bg-[#F3EBDD]">Back</button>
                    <button onClick={()=>{ if(!form.password||form.password.length<8){setError("Password min 8 chars");return;} if(form.password!==form.confirm){setError("Passwords don't match");return;} setError("");setStep(3); }}
                      className="flex-1 bg-[#C2410C] hover:bg-[#EA580C] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                      Continue <ArrowRight className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              )}

              {step===3&&(
                <div className="space-y-4">
                  <h2 className="font-bold text-[#2A2320] text-lg mb-4">Review & Submit</h2>
                  <div className="bg-[#F3EBDD] border border-[#E7DBCB] rounded-xl p-4 space-y-2 text-sm">
                    {[["Name",form.name],["Email",form.email],["Phone",form.phone],["ZIP",form.zip],["Coverage Zone",form.coverageZone],["Vehicle",form.vehicle]].map(([l,v])=>(
                      <div key={l} className="flex justify-between"><span className="text-[#8A7A6C]">{l}</span><span className="font-medium text-[#2A2320]">{v}</span></div>
                    ))}
                  </div>
                  <div className="p-4 bg-white rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#2A2320] text-sm">Signup Fee</p>
                      <p className="text-xs text-[#A99885] mt-0.5">Free — your account is active immediately</p>
                    </div>
                    <span className="text-2xl font-black text-[#C2410C]">$0</span>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"/>
                    <p className="text-xs text-amber-800">After account creation, you must upload your 7-photo sample set within <strong>48 hours</strong> to stay eligible for job dispatch.</p>
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer mb-2">
                    <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#C2410C]"/>
                    <span className="text-xs text-[#6B5D52]">I agree to the <Link href="/terms" target="_blank" className="text-[#C2410C] font-semibold hover:underline">Terms of Service</Link>.</span>
                  </label>
                  <div className="flex gap-3">
                    <button onClick={()=>setStep(2)} className="flex-1 border border-[#D8C4AC] text-[#6B5D52] font-semibold py-3 rounded-xl hover:bg-[#F3EBDD]">Back</button>
                    <button onClick={submit} disabled={loading || !agreed}
                      className="flex-1 bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                      {loading?"Submitting…":<><span>Create Agent Account</span><ArrowRight className="w-4 h-4"/></>}
                    </button>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
