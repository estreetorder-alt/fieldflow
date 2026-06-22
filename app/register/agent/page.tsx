"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Car, MapPin, User, Phone, Mail, Lock, FileText, ArrowRight, CheckCircle, DollarSign, Camera } from "lucide-react";

const STEPS = ["Profile", "Coverage", "Security", "Review"];

export default function AgentRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", bio: "", coverageZone: "", vehicle: "", password: "", confirm: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, role: "agent" }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Registration failed"); setLoading(false); return; }
    router.push("/agent");
  }

  const inp = "w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-700 font-bold text-xl mb-6">
            <span className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center text-lg">📷</span>
            FieldFlow
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Become a Field Agent</h1>
          <p className="text-slate-500 mt-2">Get paid to take photos — on your schedule</p>
        </div>

        {/* Perks */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: <Camera className="w-5 h-5" />, label: "Just your phone", sub: "No equipment" },
            { icon: <MapPin className="w-5 h-5" />, label: "Your coverage", sub: "Any radius" },
            { icon: <DollarSign className="w-5 h-5" />, label: "$60–$160/job", sub: "Weekly payout" },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="bg-white rounded-xl p-3 text-center border border-slate-100">
              <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-1.5">{icon}</div>
              <p className="font-semibold text-slate-800 text-sm">{label}</p>
              <p className="text-xs text-slate-400">{sub}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
          {/* Step progress */}
          <div className="flex items-center justify-between mb-8">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${i < step ? "bg-green-500 text-white" : i === step ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                  {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`ml-1.5 text-xs font-medium hidden sm:block ${i === step ? "text-blue-600" : "text-slate-400"}`}>{s}</span>
                {i < STEPS.length - 1 && <div className={`mx-2 h-0.5 w-8 sm:w-12 transition-all ${i < step ? "bg-green-500" : "bg-slate-200"}`} />}
              </div>
            ))}
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>}

          {step === 0 && (
            <div className="space-y-4">
              <h2 className="font-bold text-slate-900 text-lg mb-4">Personal Information</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input required value={form.name} onChange={set("name")} placeholder="Jane Smith" className={inp} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input required type="email" value={form.email} onChange={set("email")} placeholder="you@email.com" className={inp} /></div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                  <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input required value={form.phone} onChange={set("phone")} placeholder="555-0100" className={inp} /></div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Short Bio</label>
                <div className="relative"><FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <textarea value={form.bio} onChange={set("bio")} rows={3} placeholder="Tell clients about your experience…"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" /></div>
              </div>
              <button onClick={() => { if (!form.name || !form.email || !form.phone) { setError("Name, email and phone are required"); return; } setError(""); setStep(1); }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-bold text-slate-900 text-lg mb-4">Coverage & Equipment</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Coverage Zone *</label>
                <p className="text-xs text-slate-400 mb-2">City or region you can cover within 3 hours</p>
                <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input required value={form.coverageZone} onChange={set("coverageZone")} placeholder="Chicago, IL (within 30 miles)"
                    className={inp} /></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle *</label>
                <div className="relative"><Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input required value={form.vehicle} onChange={set("vehicle")} placeholder="2022 Toyota Camry"
                    className={inp} /></div>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <h3 className="font-semibold text-amber-900 text-sm mb-2">Requirements</h3>
                <ul className="text-xs text-amber-800 space-y-1">
                  <li>✓ Smartphone camera (min. 12MP recommended)</li>
                  <li>✓ Photos uploaded at 1280×960 resolution or higher</li>
                  <li>✓ GPS access and reliable internet</li>
                  <li>✓ Available 9 AM – 6 PM in your local time zone</li>
                  <li>✓ Respond to job offers within 3 hours</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-50">Back</button>
                <button onClick={() => { if (!form.coverageZone || !form.vehicle) { setError("Coverage zone and vehicle are required"); return; } setError(""); setStep(2); }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-bold text-slate-900 text-lg mb-4">Set Your Password</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input required type={showPw ? "text" : "password"} value={form.password} onChange={set("password")} placeholder="Minimum 8 characters"
                    className="w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password *</label>
                <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input required type={showPw ? "text" : "password"} value={form.confirm} onChange={set("confirm")} placeholder="Repeat password"
                    className={inp} /></div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-50">Back</button>
                <button onClick={() => { if (!form.password || form.password.length < 8) { setError("Password must be at least 8 characters"); return; } if (form.password !== form.confirm) { setError("Passwords don't match"); return; } setError(""); setStep(3); }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-bold text-slate-900 text-lg mb-4">Review & Submit</h2>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-medium">{form.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-medium">{form.email}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Phone</span><span className="font-medium">{form.phone}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Coverage</span><span className="font-medium">{form.coverageZone}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Vehicle</span><span className="font-medium">{form.vehicle}</span></div>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-blue-900 text-sm">One-time Application Fee</p>
                    <p className="text-xs text-blue-700 mt-0.5">Non-refundable · Processed securely</p>
                  </div>
                  <span className="text-2xl font-bold text-blue-800">$15.00</span>
                </div>
                <p className="text-xs text-blue-600 mt-3 italic">* Payment integration coming soon. For now, your account will be created and reviewed within 1–2 business days.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-50">Back</button>
                <button onClick={submit} disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                  {loading ? "Submitting…" : <><span>Submit Application</span><ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center mt-6 text-sm text-slate-500">
          Already registered? <Link href="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
          {" · "}
          <Link href="/register/client" className="text-blue-600 font-medium hover:underline">Client signup</Link>
        </p>
      </div>
    </div>
  );
}
