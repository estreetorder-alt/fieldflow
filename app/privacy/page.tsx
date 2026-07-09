import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import { Shield } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNav />
      <section className="bg-[#0f1f3d] text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <Shield className="w-12 h-12 text-[#c8991a] mx-auto mb-4"/>
          <h1 className="text-4xl font-extrabold mb-3">Privacy Policy</h1>
          <p className="text-slate-300">Last updated: January 1, 2025</p>
        </div>
      </section>
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto prose prose-slate">
          {[
            { title:"1. Information We Collect", body:"We collect information you provide when creating an account (name, email, phone, company), placing orders (property addresses, service selections), and submitting agent applications (ZIP codes, vehicle details, sample photos). We also collect usage data such as login times and order history." },
            { title:"2. How We Use Your Information", body:"Your information is used solely to operate the Snapect platform — dispatching orders to field agents, processing payments via Whop, delivering photos to your dashboard, and sending order status notifications. We do not use your data for advertising." },
            { title:"3. Data Security", body:"All data is stored on encrypted, secure servers. We use industry-standard SSL/TLS encryption for all data in transit. Property addresses and order details are only visible to the assigned field agent and platform administrators." },
            { title:"4. No Data Sale or Sharing", body:"We will never sell, rent, or share your personal information — including property addresses, contact details, or order history — with any third party for any reason. Your data belongs to you." },
            { title:"5. Field Agent Data", body:"Agent sample photos and profile information are used solely for the approval process and order matching. Sample photos are reviewed by administrators only and are not shared publicly." },
            { title:"6. Photo Storage", body:"Photos uploaded by field agents are stored securely for 30 days after order completion. After 30 days, photos are permanently deleted from our servers. Vendors are responsible for downloading photos within this window." },
            { title:"7. Payments", body:"Payment processing is handled by Whop. Snapect does not store credit card numbers or payment credentials on our servers. Please review Whop's privacy policy at whop.com/privacy." },
            { title:"8. Cookies", body:"We use essential cookies only — to maintain your login session. We do not use tracking cookies, advertising cookies, or third-party analytics that collect personally identifiable information." },
            { title:"9. Your Rights", body:"You may request deletion of your account and associated data at any time by contacting info@snapect.com. Active orders cannot be deleted until completed or cancelled." },
            { title:"10. Contact", body:"For privacy-related questions, contact us at info@snapect.com. For legal matters, Snapect is a corporation registered in the State of Florida." },
          ].map(s=>(
            <div key={s.title} className="mb-8">
              <h2 className="text-xl font-bold text-[#0f1f3d] mb-3 border-b border-[#c8991a]/30 pb-2">{s.title}</h2>
              <p className="text-slate-600 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
