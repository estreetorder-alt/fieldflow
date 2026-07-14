import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import { Mail, Phone, Clock, MapPin, MessageSquare, Users, HelpCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Snapect for BPO and REO field inspection services, field agent support, or general inquiries. Fast response times.",
  keywords: ["contact Snapect", "BPO inspection support", "field inspection company contact"],
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Snapect",
    description: "Get in touch for BPO and REO field inspection services or field agent support.",
    url: "/contact",
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNav />

      <section className="bg-white text-[#0f1f3d] py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[#c8991a] font-bold text-sm uppercase tracking-wider mb-3">Get in Touch</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-5">Contact Us</h1>
          <p className="text-xl text-slate-600">Questions about orders, services, or agent applications? We're here to help.</p>
        </div>
      </section>

      <section className="py-16 px-4 bg-[#faf8f3]">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-6 mb-12">
          {[
            { icon:<Mail className="w-6 h-6"/>, title:"Email Us", lines:["info@snapect.com","We reply within 1 business day"], note:"For order issues, include your order ID" },
            { icon:<Phone className="w-6 h-6"/>, title:"Phone", lines:["(941) 723-3200","Mon–Fri 8 AM – 6 PM CST"], note:"Please do not call to check application status" },
            { icon:<Clock className="w-6 h-6"/>, title:"Support Hours", lines:["Monday – Friday","8:00 AM – 6:00 PM CST"], note:"Closed weekends and federal holidays" },
          ].map(c=>(
            <div key={c.title} className="bg-white border border-slate-200 rounded-2xl p-6 text-center hover:border-[#c8991a] transition-colors">
              <div className="w-12 h-12 bg-white text-[#c8991a] rounded-xl flex items-center justify-center mx-auto mb-4">{c.icon}</div>
              <h3 className="font-bold text-[#0f1f3d] mb-2">{c.title}</h3>
              {c.lines.map(l=><p key={l} className="text-slate-600 text-sm">{l}</p>)}
              <p className="text-xs text-slate-400 mt-2 italic">{c.note}</p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-[#0f1f3d] mb-6 flex items-center gap-2"><HelpCircle className="w-6 h-6 text-[#c8991a]"/>Common Questions</h2>
          <div className="space-y-4">
            {[
              { q:"How quickly will my order be completed?", a:"87% of standard orders are completed within 24 hours. Orders submitted before 10 AM local time are dispatched same day. Rush options (24hr, 6hr) are available for an additional flat fee." },
              { q:"I registered as an agent — when will I be approved?", a:"Our team reviews sample sets within 1–2 business days. Do not call or email to check status — we will contact you by email. Make sure to submit your 7-photo sample within 48 hours of registering." },
              { q:"What if no agent is available in my area?", a:"We have agents covering all major areas. Place your order and our team will ensure assignment within the stated timeframe." },
              { q:"How long are my photos stored?", a:"Photos are stored securely for 30 days after order completion. After that they are permanently deleted. Download your photos within this window — we cannot recover deleted photos." },
              { q:"Can I cancel or modify an order?", a:"Orders can be cancelled before an agent accepts them. Once accepted, cancellations may incur a fee. Orders cannot be modified after submission — please double-check your address and service selection before paying." },
              { q:"How do agents get paid?", a:"Agents are paid every Friday via PayPal for all orders completed and approved that week. We cover the PayPal processing fees. Minimum balance of $40 required for payout — otherwise balance rolls to next week." },
            ].map(({q,a})=>(
              <div key={q} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-[#c8991a] transition-colors">
                <h3 className="font-semibold text-[#0f1f3d] mb-2">{q}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-6">
          <div className="bg-slate-50 rounded-2xl p-6">
            <Users className="w-8 h-8 text-[#c8991a] mb-3"/>
            <h3 className="font-bold text-[#0f1f3d] mb-2">Vendors</h3>
            <p className="text-slate-600 text-sm mb-4">For order help, billing questions, or account issues:</p>
            <a href="mailto:info@snapect.com" className="inline-flex items-center gap-2 bg-[#c8991a] text-[#0f1f3d] font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-[#f0b429] transition-colors">
              <Mail className="w-4 h-4"/>Email Vendor Support
            </a>
          </div>
          <div className="bg-slate-50 rounded-2xl p-6">
            <MessageSquare className="w-8 h-8 text-[#c8991a] mb-3"/>
            <h3 className="font-bold text-[#0f1f3d] mb-2">Field Agents</h3>
            <p className="text-slate-600 text-sm mb-4">For application status, payment questions, or technical issues:</p>
            <a href="mailto:info@snapect.com" className="inline-flex items-center gap-2 bg-[#c8991a] text-[#0f1f3d] font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-[#f0b429] transition-colors">
              <Mail className="w-4 h-4"/>Email Agent Support
            </a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
