import Link from "next/link";

export default function PublicFooter() {
  return (
    <footer className="bg-white border-t border-slate-200 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
          <div className="col-span-2">
            <div className="mb-4">
              <img src="/snapect-logo.png" alt="Snapect" className="h-12 w-auto object-contain"/>
            </div>
            <p className="text-sm leading-relaxed text-slate-500 max-w-xs">
              America's trusted field inspection and photo documentation platform. 45+ services, 35 states, verified agents.
            </p>
            <div className="mt-4 space-y-1 text-xs text-slate-400">
              <p>support@snapect.com</p>
              <p>Mon–Fri · 8 AM – 6 PM CST</p>
            </div>
          </div>
          <div>
            <h4 className="text-[#0f1f3d] font-bold text-sm mb-4 uppercase tracking-wider">Services</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link href="/services" className="hover:text-[#c8991a] transition-colors">BPO Photo Sets</Link></li>
              <li><Link href="/services" className="hover:text-[#c8991a] transition-colors">Vehicle Inspections</Link></li>
              <li><Link href="/services" className="hover:text-[#c8991a] transition-colors">Property Inspections</Link></li>
              <li><Link href="/services" className="hover:text-[#c8991a] transition-colors">Videography</Link></li>
              <li><Link href="/services" className="hover:text-[#c8991a] transition-colors">All 45+ Services</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[#0f1f3d] font-bold text-sm mb-4 uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link href="/coverage" className="hover:text-[#c8991a] transition-colors">Coverage Map</Link></li>
              <li><Link href="/work" className="hover:text-[#c8991a] transition-colors">Become an Agent</Link></li>
              <li><Link href="/contact" className="hover:text-[#c8991a] transition-colors">Contact Us</Link></li>
              <li><Link href="/login" className="hover:text-[#c8991a] transition-colors">Client Portal</Link></li>
              <li><Link href="/login" className="hover:text-[#c8991a] transition-colors">Agent Portal</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[#0f1f3d] font-bold text-sm mb-4 uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link href="/privacy" className="hover:text-[#c8991a] transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-[#c8991a] transition-colors">Terms of Service</Link></li>
              <li><Link href="/refund-policy" className="hover:text-[#c8991a] transition-colors">Refund Policy</Link></li>
              <li><Link href="/register/client" className="hover:text-[#c8991a] transition-colors">Client Sign Up</Link></li>
              <li><Link href="/register/agent" className="hover:text-[#c8991a] transition-colors">Agent Registration</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-400">
          <p>&copy; {new Date().getFullYear()} Snapect. All rights reserved.</p>
          <p>Trusted by 500+ property managers &amp; REO companies · 87% of orders completed within 24hrs</p>
        </div>
      </div>
    </footer>
  );
}
