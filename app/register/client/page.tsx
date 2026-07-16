"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Building2, User, Phone, Mail, Lock, ArrowRight, CheckCircle, Shield, Star, Zap } from "lucide-react";
import PublicNav from "../../components/PublicNav";
import PublicFooter from "../../components/PublicFooter";

export default function ClientRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name:"", email:"", phone:"", company:"", password:"", confirm:"" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"form"|"payment">("form");
  const [agreed, setAgreed] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f=>({...f,[k]:e.target.value}));
  const inp = "w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a] focus:border-transparent";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/auth/register", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ name:form.name, email:form.email, phone:form.phone, company:form.company, password:form.password, role:"client" }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Registration failed"); setLoading(false); return; }
    setStep("payment");
    setLoading(false);
  }

  if (step === "payment") {
    return (
      <div className="min-h-screen bg-white pt-20">
        <PublicNav />
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-lg">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-white border-b border-slate-100 p-8 text-center">
                <div className="w-16 h-16 bg-[#c8991a] rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-white"/>
                </div>
                <h1 className="text-2xl font-bold text-[#0f1f3d] mb-2">Account Created!</h1>
                <p className="text-slate-500 text-sm">Free signup — your account is active. Log in now to start placing orders.</p>
              </div>
              <div className="p-8">
                <Link href="/login" className="block w-full text-center bg-[#c8991a] hover:bg-[#f0b429] text-[#0f1f3d] font-bold py-3 rounded-xl transition-colors">
                  Sign In to Your Dashboard
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
      <div className="bg-white py-12 px-4">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="text-[#0f1f3d]">
            <p className="text-[#c8991a] font-bold text-sm uppercase tracking-wider mb-3">Join Snapect</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-5 leading-tight">Create Your Vendor Account</h1>
            <p className="text-slate-600 text-lg mb-8 leading-relaxed">Order field inspections from verified agents nationwide. Most orders dispatched within seconds.</p>
            <ul className="space-y-4 mb-8">
              {[
                { icon:<Zap className="w-5 h-5 text-[#c8991a]"/>, text:"Orders dispatched to agents within seconds of submission" },
                { icon:<Shield className="w-5 h-5 text-[#c8991a]"/>, text:"Your data is stored securely and never sold or shared with anyone" },
                { icon:<Star className="w-5 h-5 text-[#c8991a]"/>, text:"87% of standard orders completed within 24 hours" },
                { icon:<CheckCircle className="w-5 h-5 text-[#c8991a]"/>, text:"30-day photo storage — download or email photos anytime" },
                { icon:<Building2 className="w-5 h-5 text-[#c8991a]"/>, text:"Sub-accounts for employees — ideal for BPO companies" },
              ].map(({icon,text})=>(
                <li key={text} className="flex items-start gap-3"><span className="flex-shrink-0 mt-0.5">{icon}</span><span className="text-slate-600 text-sm leading-relaxed">{text}</span></li>
              ))}
            </ul>
            <div className="p-4 bg-slate-50 rounded-xl border border-[#c8991a]/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#c8991a] font-bold text-sm">Free Vendor Signup</p>
                  <p className="text-slate-400 text-xs mt-0.5">No activation fee — your dashboard unlocks instantly</p>
                </div>
                <span className="text-3xl font-black text-[#0f1f3d]">$0</span>
              </div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-xl font-bold text-[#0f1f3d] mb-6">Your Information</h2>
              {error && <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>}
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                    <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                      <input required value={form.name} onChange={set("name")} placeholder="Jane Smith" className={inp}/></div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                      <input value={form.phone} onChange={set("phone")} placeholder="555-0100" className={inp}/></div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company / Organization</label>
                  <div className="relative"><Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                    <input value={form.company} onChange={set("company")} placeholder="Acme Realty LLC" className={inp}/></div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address *</label>
                  <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                    <input required type="email" value={form.email} onChange={set("email")} placeholder="you@company.com" className={inp}/></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                    <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                      <input required type={showPw?"text":"password"} value={form.password} onChange={set("password")} placeholder="Min 8 chars"
                        className="w-full pl-9 pr-9 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
                      <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {showPw?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button></div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm *</label>
                    <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                      <input required type={showPw?"text":"password"} value={form.confirm} onChange={set("confirm")} placeholder="Repeat password" className={inp}/></div>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div><p className="font-bold text-[#0f1f3d] text-sm">No Activation Fee</p>
                    <p className="text-xs text-slate-400 mt-0.5">Signup is completely free</p></div>
                  <span className="text-2xl font-black text-[#c8991a]">$0</span>
                </div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#c8991a]"/>
                  <span className="text-xs text-slate-600">I agree to the <Link href="/terms" target="_blank" className="text-[#c8991a] hover:underline font-semibold">Terms of Service</Link> and <Link href="/privacy" target="_blank" className="text-[#c8991a] hover:underline font-semibold">Privacy Policy</Link>.</span>
                </label>
                <button type="submit" disabled={loading || !agreed}
                  className="w-full flex items-center justify-center gap-2 bg-[#c8991a] hover:bg-[#f0b429] disabled:opacity-50 text-[#0f1f3d] font-bold py-3 rounded-xl transition-colors">
                  {loading?"Creating account…":<><span>Create Free Account</span><ArrowRight className="w-4 h-4"/></>}
                </button>

              </form>
            </div>
            <p className="text-center mt-5 text-sm text-slate-500">Already have an account? <Link href="/login" className="text-[#c8991a] font-semibold hover:underline">Sign in</Link></p>
          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
