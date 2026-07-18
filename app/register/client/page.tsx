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
  const inp = "w-full pl-9 pr-3 py-2.5 border border-[#D8C4AC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C2410C] focus:border-transparent";

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
      <div className="min-h-screen bg-[#FAF6EF] pt-20">
        <PublicNav />
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-lg">
            <div className="bg-white border border-[#E7DBCB] rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-white border-b border-[#F0E4D3] p-8 text-center">
                <div className="w-16 h-16 bg-[#C2410C] rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-white"/>
                </div>
                <h1 className="text-2xl font-bold text-[#2A2320] mb-2">Account Created!</h1>
                <p className="text-[#8A7A6C] text-sm">Free signup — your account is active. Log in now to start placing orders.</p>
              </div>
              <div className="p-8">
                <Link href="/login" className="block w-full text-center bg-[#C2410C] hover:bg-[#EA580C] text-white font-bold py-3 rounded-xl transition-colors">
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
    <div className="min-h-screen bg-[#FAF6EF] pt-20">
      <PublicNav />
      <div className="grid md:grid-cols-2 min-h-[calc(100vh-80px)]">
        {/* Left panel — dark gradient, matches reference */}
        <div
          className="relative overflow-hidden px-8 sm:px-14 py-16 flex flex-col justify-center"
          style={{ background: "linear-gradient(160deg, #1C1917 0%, #4A2C1C 60%, #7A3E1C 100%)" }}
        >
          <span className="inline-block w-fit bg-white/10 text-[#F5C99B] text-sm font-semibold px-4 py-1.5 rounded-full mb-6 border border-white/10">
            Vendor Partnership
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-5 leading-tight text-white">
            Partner With <span className="text-[#EA580C]">Snapect</span> as a Vendor
          </h1>
          <p className="text-white/70 text-base mb-10 max-w-sm leading-relaxed">
            Join our nationwide network of trusted inspection vendors. Expand your business with a steady stream of field inspection work.
          </p>
          <div className="space-y-5">
            {[
              { icon: <Shield className="w-5 h-5" />, title: "Trusted Partnership", text: "Long-term business relationships" },
              { icon: <Building2 className="w-5 h-5" />, title: "Nationwide Reach", text: "Access jobs across 35+ states" },
              { icon: <CheckCircle className="w-5 h-5" />, title: "Reliable Volume", text: "Consistent inspection assignments" },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#EA580C] flex-shrink-0">{f.icon}</div>
                <div>
                  <p className="font-bold text-white text-sm">{f.title}</p>
                  <p className="text-white/60 text-xs mt-0.5">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — white form */}
        <div className="bg-white px-6 sm:px-14 py-12 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto">
            <h2 className="text-2xl font-extrabold text-[#2A2320] mb-1">New Vendor Signup</h2>
            <p className="text-[#8A7A6C] text-sm mb-7">Register your inspection business with Snapect</p>
            {error && <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>}
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#4A403A] mb-1">Contact Name</label>
                <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A99885]" />
                  <input required value={form.name} onChange={set("name")} placeholder="Jane Smith" className={inp} /></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4A403A] mb-1">Company Name</label>
                <div className="relative"><Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A99885]" />
                  <input value={form.company} onChange={set("company")} placeholder="Acme Inspections LLC" className={inp} /></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4A403A] mb-1">Business Email</label>
                <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A99885]" />
                  <input required type="email" value={form.email} onChange={set("email")} placeholder="you@company.com" className={inp} /></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4A403A] mb-1">Phone</label>
                <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A99885]" />
                  <input value={form.phone} onChange={set("phone")} placeholder="555-0100" className={inp} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#4A403A] mb-1">Password</label>
                  <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A99885]" />
                    <input required type={showPw ? "text" : "password"} value={form.password} onChange={set("password")} placeholder="Min 8 chars"
                      className="w-full pl-9 pr-9 py-2.5 border border-[#D8C4AC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C2410C]" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A99885]">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4A403A] mb-1">Confirm Password</label>
                  <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A99885]" />
                    <input required type={showPw ? "text" : "password"} value={form.confirm} onChange={set("confirm")} placeholder="Repeat password" className={inp} /></div>
                </div>
              </div>
              <label className="flex items-start gap-2 cursor-pointer pt-1">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#C2410C]" />
                <span className="text-xs text-[#6B5D52]">I agree to the <Link href="/terms" target="_blank" className="text-[#C2410C] hover:underline font-semibold">Terms of Service</Link> and <Link href="/privacy" target="_blank" className="text-[#C2410C] hover:underline font-semibold">Privacy Policy</Link>.</span>
              </label>
              <button type="submit" disabled={loading || !agreed}
                className="w-full flex items-center justify-center gap-2 bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-50 text-white font-bold py-3.5 rounded-full transition-colors mt-2">
                {loading ? "Creating account…" : <><span>Register as Vendor</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
            <p className="text-center mt-5 text-sm text-[#8A7A6C]">
              Already have an account? <Link href="/login" className="text-[#C2410C] font-semibold hover:underline">Sign in</Link>
            </p>
            <p className="text-center mt-1.5 text-sm text-[#8A7A6C]">
              Want to join as a field agent? <Link href="/register/agent" className="text-[#C2410C] font-semibold hover:underline">Register as Agent</Link>
            </p>
          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
