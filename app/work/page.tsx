"use client";
import { useState } from "react";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import { CheckCircle, DollarSign, Clock, MapPin, Star, Camera, ChevronRight, Send, Users, Smartphone, Award, AlertTriangle, Search } from "lucide-react";

const PERKS = [
  { icon:<DollarSign className="w-6 h-6"/>, title:"Earn As Much As You Can", desc:"Earn based on service complexity. Vehicle inspections from $45, full property assessments up to $300+. Paid every Friday via PayPal." },
  { icon:<Clock className="w-6 h-6"/>, title:"Flexible Schedule", desc:"You set your availability. Accept jobs that fit your calendar. No minimums, no quotas — work when you want." },
  { icon:<MapPin className="w-6 h-6"/>, title:"Only Local Jobs", desc:"You set your ZIP codes. Only orders in your coverage area appear in your feed. No long drives or multi-state routing." },
  { icon:<Smartphone className="w-6 h-6"/>, title:"Just Your Smartphone", desc:"No special equipment needed. Accept, document, and complete jobs entirely through the Snapect agent portal." },
  { icon:<Award className="w-6 h-6"/>, title:"Grade-Based Priority", desc:"Higher-graded agents get first pick of orders. Build your grade by completing orders on time with quality photos." },
  { icon:<Users className="w-6 h-6"/>, title:"Our Pledge to You", desc:"We treat you as a professional. Consistent work, clear communication, and prompt weekly payments — every time." },
];

const STEPS = [
  { n:"01", title:"Enter Your ZIP & Apply", desc:"Fill out the short form below. Provide your ZIP code so we can verify coverage in your area. Takes about 3 minutes." },
  { n:"02", title:"Submit 7-Photo Sample Set", desc:"Within 48 hours of registering, upload a sample set of 7 photos of any house following our shot list. This is required — do not register if you cannot submit within 48 hours." },
  { n:"03", title:"Admin Review (1–2 Business Days)", desc:"Our team reviews your sample set within 2 business days. We'll contact you by email with our decision — do not call the office to check status." },
  { n:"04", title:"Start Accepting Orders", desc:"Once approved, set your ZIP code coverage and go Available. Orders in your area appear in your dashboard. Respond within 3 hours (9 AM–6 PM local time)." },
  { n:"05", title:"Get Paid Every Friday", desc:"Completed and approved orders go to your payments page. We send payment every Friday via PayPal — we cover the PayPal fees." },
];

const TESTIMONIALS = [
  { name:"Sarah M.", city:"Ohio", text:"The first 2 weeks were slow — about 3 orders the first week, 8 the second. But by week 4 I was earning $600/week. Easy work and they pay on Friday as promised." },
  { name:"James T.", city:"Texas", text:"Saved me from a bad RV purchase. My agent took photos that revealed issues left off the listing. This service is invaluable." },
  { name:"Kelly R.", city:"California", text:"I went from putting 200+ miles on my car each week to next to nothing. The most one contractor made was over $800 in a single week!" },
];

export default function WorkPage() {
  const [form, setForm] = useState({ name:"", email:"", phone:"", zip:"", city:"", state:"", experience:"", why:"" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [zipCoverage, setZipCoverage] = useState<{covered:boolean;agentCount:number}|null>(null);
  const [checkingZip, setCheckingZip] = useState(false);

  function set(k: string) { return (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => setForm(f=>({...f,[k]:e.target.value})); }

  async function checkZip(zip: string) {
    if (zip.length !== 5) return;
    setCheckingZip(true);
    const r = await fetch("/api/coverage-check", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({zip}) });
    const d = await r.json();
    setZipCoverage(d);
    setCheckingZip(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    try {
      const r = await fetch("/api/applications", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) { alert(d.error ?? "Submission failed. Please try again."); setLoading(false); return; }
      setSubmitted(true);
    } catch { alert("Network error. Please try again."); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-white">
      <PublicNav />

      {/* Hero */}
      <section className="bg-white text-[#0f1f3d] py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#c8991a]/20 border border-[#c8991a]/40 text-[#c8991a] text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            <Star className="w-3.5 h-3.5 fill-current"/>Always Hiring · 150+ Active Agents
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-5 leading-tight">Join Our Field Agent Network</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed mb-8">
            Earn as much as you can conducting property and vehicle inspections in your area. No real estate license required. Get paid every Friday via PayPal.
          </p>
          <a href="#apply" className="inline-flex items-center gap-2 bg-[#c8991a] hover:bg-[#f0b429] text-[#0f1f3d] font-bold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg">
            Apply Now — 3 Minutes <ChevronRight className="w-5 h-5"/>
          </a>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#c8991a] py-4 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center text-[#0f1f3d]">
          {[["Earn As Much","As You Can"],["Every Friday","Payout Day"],["150+","Active Agents"],["2,400+","Jobs Completed"]].map(([v,l])=>(
            <div key={l}><div className="text-2xl font-extrabold">{v}</div><div className="text-xs font-medium opacity-75">{l}</div></div>
          ))}
        </div>
      </section>

      {/* 48hr Warning */}
      <section className="py-6 px-4 bg-amber-50 border-b border-amber-200">
        <div className="max-w-3xl mx-auto flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"/>
          <div>
            <p className="font-bold text-amber-900">Important: Please read before registering</p>
            <p className="text-sm text-amber-800 mt-1">You must submit a 7-photo sample set within <strong>48 hours</strong> of creating your account. Failure to submit on time results in automatic rejection. If you missed the deadline, do not re-register — log into your existing account and request reactivation. Do not call our office to check approval status; we will contact you by email within 2 business days.</p>
          </div>
        </div>
      </section>

      {/* Perks */}
      <section className="py-20 px-4 bg-[#faf8f3]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#c8991a] font-bold text-sm uppercase tracking-wider mb-2">Why Agents Choose Snapect</p>
            <h2 className="text-3xl font-bold text-[#0f1f3d] mb-3">Flexible Work. Real Income.</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PERKS.map(p=>(
              <div key={p.title} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-[#c8991a] transition-colors">
                <div className="w-12 h-12 bg-white text-[#c8991a] rounded-xl flex items-center justify-center mb-4">{p.icon}</div>
                <h3 className="font-bold text-[#0f1f3d] mb-2">{p.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#c8991a] font-bold text-sm uppercase tracking-wider mb-2">The Process</p>
            <h2 className="text-3xl font-bold text-[#0f1f3d] mb-3">From Application to First Paycheck</h2>
          </div>
          <div className="space-y-4">
            {STEPS.map(s=>(
              <div key={s.n} className="flex gap-5 items-start bg-[#faf8f3] border border-slate-200 rounded-2xl p-5">
                <div className="w-12 h-12 bg-white text-[#c8991a] rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0">{s.n}</div>
                <div>
                  <h3 className="font-bold text-[#0f1f3d] mb-1">{s.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agent rules */}
      <section className="py-16 px-4 bg-[#faf8f3] border-y border-slate-200">
        <div className="max-w-3xl mx-auto">
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="font-bold text-[#0f1f3d] mb-3">Requirements</h3>
              <ul className="space-y-2">
                {["Smartphone with camera (iOS or Android)","Reliable vehicle & valid driver's license","Pass a standard background check","18+ years old, authorized to work in US","Available 9 AM–6 PM in your local time zone","Respond to job offers within 3 hours","Complete orders within 30 hours (or as specified)"].map(r=>(
                  <li key={r} className="flex items-start gap-2 text-sm text-slate-600"><CheckCircle className="w-4 h-4 text-[#c8991a] flex-shrink-0 mt-0.5"/>{r}</li>
                ))}
              </ul>
            </div>
            <div className="bg-white border border-[#1a3260] rounded-2xl p-5 text-[#0f1f3d]">
              <h3 className="font-bold text-[#c8991a] mb-3">How Orders Work</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                {["Set your available ZIP codes in your profile","When available, you receive email notifications for nearby orders","Review the offer — compensation shown upfront","Accept or decline within 3 hours (9 AM–6 PM local)","If no response, order is reassigned to next agent","Multiple agents in same ZIP = rotating priority by grade","Higher grade = more orders & higher-value jobs","Images reviewed by our team before payment approved","Payment released every Friday via PayPal"].map(r=>(
                  <li key={r} className="flex items-start gap-2"><span className="text-[#c8991a] font-bold mt-0.5">→</span>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[#c8991a] font-bold text-sm uppercase tracking-wider mb-2">Agent Stories</p>
            <h2 className="text-2xl font-bold text-[#0f1f3d]">What Our Agents Say</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map(t=>(
              <div key={t.name} className="bg-slate-50 rounded-2xl p-5">
                <div className="flex mb-3">{[1,2,3,4,5].map(i=><Star key={i} className="w-4 h-4 text-[#c8991a] fill-current"/>)}</div>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <p className="text-[#0f1f3d] font-semibold text-sm">{t.name}</p>
                <p className="text-slate-500 text-xs">{t.city}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section id="apply" className="py-20 px-4 bg-[#faf8f3] border-t border-slate-200">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[#c8991a] font-bold text-sm uppercase tracking-wider mb-2">Apply Today</p>
            <h2 className="text-3xl font-bold text-[#0f1f3d] mb-3">Start Your Application</h2>
            <p className="text-slate-500">Takes 3 minutes. We'll follow up within 48 hours.</p>
          </div>

          {submitted ? (
            <div className="bg-white border border-[#c8991a] rounded-2xl p-12 text-center">
              <div className="w-16 h-16 bg-[#c8991a]/10 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-8 h-8 text-[#c8991a]"/></div>
              <h3 className="text-2xl font-bold text-[#0f1f3d] mb-2">Application Received!</h3>
              <p className="text-slate-500 max-w-sm mx-auto">A member of our agent team will reach out within 48 hours. Remember to prepare your 7-photo sample set — you'll need to upload it within 48 hours of account creation.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-5">
              {/* Free signup notice */}
              <div className="p-4 bg-white rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#0f1f3d] text-sm">Application Fee</p>
                  <p className="text-xs text-slate-400 mt-0.5">Free — no cost to apply or join</p>
                </div>
                <span className="text-2xl font-black text-[#c8991a]">$0</span>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-[#0f1f3d] mb-1.5">Full Name *</label>
                  <input required name="name" value={form.name} onChange={set("name")} placeholder="Jane Smith"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0f1f3d] mb-1.5">Email *</label>
                  <input required type="email" name="email" value={form.email} onChange={set("email")} placeholder="jane@email.com"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-[#0f1f3d] mb-1.5">Phone *</label>
                  <input required name="phone" value={form.phone} onChange={set("phone")} placeholder="555-123-4567"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0f1f3d] mb-1.5">Your ZIP Code *</label>
                  <div className="relative">
                    <input required name="zip" value={form.zip} onChange={e=>{set("zip")(e);if(e.target.value.length===5)checkZip(e.target.value);}}
                      placeholder="60601" maxLength={5}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
                    {checkingZip && <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-pulse"/>}
                  </div>
                  {zipCoverage && (
                    <p className={`text-xs mt-1 ${zipCoverage.covered?"text-green-600":"text-amber-600"}`}>
                      {zipCoverage.covered ? `✓ We have ${zipCoverage.agentCount} agent(s) in this area — good fit!` : "⚠ No agents in this ZIP yet — yours could be the first!"}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-[#0f1f3d] mb-1.5">City *</label>
                  <input required name="city" value={form.city} onChange={set("city")} placeholder="Chicago"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0f1f3d] mb-1.5">State *</label>
                  <input required name="state" value={form.state} onChange={set("state")} placeholder="Illinois"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0f1f3d] mb-1.5">Relevant Experience</label>
                <select name="experience" value={form.experience} onChange={set("experience")}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a] bg-white">
                  <option value="">Select one…</option>
                  <option value="none">No experience</option>
                  <option value="photography">Photography / Videography</option>
                  <option value="real-estate">Real Estate or Property Management</option>
                  <option value="construction">Construction or Contracting</option>
                  <option value="inspection">Home Inspection</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0f1f3d] mb-1.5">Why do you want to join? *</label>
                <textarea required name="why" value={form.why} onChange={set("why")} rows={3}
                  placeholder="Tell us about yourself and what interests you about field work…"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a] resize-none"/>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-[#c8991a] hover:bg-[#f0b429] disabled:opacity-60 text-[#0f1f3d] font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                {loading ? <span className="animate-pulse">Submitting…</span> : <><Send className="w-4 h-4"/>Submit Application</>}
              </button>
              <p className="text-xs text-center text-slate-400">By applying you agree to our <a href="/terms" className="underline">Terms of Service</a>. Agent signup is completely free.</p>
            </form>
          )}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
