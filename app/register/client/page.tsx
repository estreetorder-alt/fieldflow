"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Building2, User, Phone, Mail, Lock, ArrowRight, CheckCircle, Shield, Star, Zap } from "lucide-react";
import PublicNav from "../../../app/components/PublicNav";
import PublicFooter from "../../../app/components/PublicFooter";

export default function ClientRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name:"", email:"", phone:"", company:"", password:"", confirm:"" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f=>({...f,[k]:e.target.value}));

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
    router.push("/client");
  }

  const inp = "w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a] focus:border-transparent";

  return (
    <div className="min-h-screen bg-white">
      <PublicNav />

      <div className="bg-[#0f1f3d] py-12 px-4">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Left — trust signals */}
          <div className="text-white">
            <p className="text-[#c8991a] font-bold text-sm uppercase tracking-wider mb-3">Free to Join · No Monthly Fees</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-5 leading-tight">Create Your Client Account</h1>
            <p className="text-slate-300 text-lg mb-8 leading-relaxed">
              Order field inspections from 150+ verified agents in 35 states. Most orders dispatched within seconds.
            </p>
            <ul className="space-y-4">
              {[
                { icon:<Zap className="w-5 h-5 text-[#f0b429]"/>, text:"Orders dispatched to field agents within seconds of submission" },
                { icon:<Shield className="w-5 h-5 text-[#f0b429]"/>, text:"Your data is stored securely and never sold or shared with anyone" },
                { icon:<Star className="w-5 h-5 text-[#f0b429]"/>, text:"87% of standard orders completed within 24 hours" },
                { icon:<CheckCircle className="w-5 h-5 text-[#f0b429]"/>, text:"30-day photo storage · Download or email photos anytime" },
                { icon:<Building2 className="w-5 h-5 text-[#f0b429]"/>, text:"Sub-accounts for employees — ideal for BPO companies with teams" },
              ].map(({icon,text})=>(
                <li key={text} className="flex items-start gap-3">
                  <span className="flex-shrink-0 mt-0.5">{icon}</span>
                  <span className="text-slate-300 text-sm leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 p-4 bg-[#1a3260] rounded-xl border border-[#1a3260]">
              <p className="text-[#f0b429] font-bold text-sm mb-1">Privacy Guarantee</p>
              <p className="text-slate-400 text-xs leading-relaxed">All data stored on our secure, encrypted servers. We do not sell or share your information — including property addresses — with any third party. Some clients have trusted us since 2008.</p>
            </div>
          </div>

          {/* Right — form */}
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
                        className="w-full pl-9 pr-9 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a] focus:border-transparent"/>
                      <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {showPw?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                      </button></div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm *</label>
                    <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                      <input required type={showPw?"text":"password"} value={form.confirm} onChange={set("confirm")} placeholder="Repeat password" className={inp}/></div>
                  </div>
                </div>
                {/* $30 signup fee notice */}
                <div className="flex items-center justify-between bg-[#0f1f3d] rounded-xl px-4 py-3 mt-2">
                  <div>
                    <p className="font-bold text-white text-sm">One-Time Account Setup Fee</p>
                    <p className="text-xs text-slate-400 mt-0.5">Non-refundable · Required to activate your account</p>
                  </div>
                  <span className="text-2xl font-black text-[#f0b429]">$30</span>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#c8991a] hover:bg-[#f0b429] disabled:opacity-50 text-[#0f1f3d] font-bold py-3 rounded-xl transition-colors mt-2">
                  {loading?"Creating account…":<><span>Create Account — $30 Fee Applies</span><ArrowRight className="w-4 h-4"/></>}
                </button>
              </form>
              <div className="mt-5 pt-5 border-t border-slate-100">
                <div className="flex gap-2 text-xs text-slate-500">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5"/>
                  <span>By registering you agree to our <Link href="/terms" className="text-[#c8991a] hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-[#c8991a] hover:underline">Privacy Policy</Link>.</span>
                </div>
              </div>
            </div>
            <p className="text-center mt-5 text-sm text-slate-500">
              Already have an account? <Link href="/login" className="text-[#c8991a] font-semibold hover:underline">Sign in</Link>
              {" · "}
              <Link href="/register/agent" className="text-[#c8991a] font-semibold hover:underline">Join as agent</Link>
            </p>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
