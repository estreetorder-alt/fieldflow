import Link from "next/link";
import { Camera } from "lucide-react";

export default function PublicFooter() {
  return (
    <footer className="bg-[#0f1f3d] text-slate-400 py-14 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-[#c8991a] rounded-lg flex items-center justify-center">
                <Camera className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold text-lg">FieldFlow</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400 max-w-xs">
              America's trusted field inspection and photo documentation platform. 45+ services, 35 states, thousands of verified agents.
            </p>
            <div className="mt-4 space-y-1 text-xs text-slate-500">
              <p>support@fieldflow.app</p>
              <p>Mon–Fri · 8 AM – 6 PM CST</p>
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Services</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/services" className="hover:text-[#f0b429] transition-colors">BPO Photo Sets</Link></li>
              <li><Link href="/services" className="hover:text-[#f0b429] transition-colors">Vehicle Inspections</Link></li>
              <li><Link href="/services" className="hover:text-[#f0b429] transition-colors">Property Inspections</Link></li>
              <li><Link href="/services" className="hover:text-[#f0b429] transition-colors">Videography</Link></li>
              <li><Link href="/services" className="hover:text-[#f0b429] transition-colors">All 45+ Services</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/coverage" className="hover:text-[#f0b429] transition-colors">Coverage Map</Link></li>
              <li><Link href="/work" className="hover:text-[#f0b429] transition-colors">Become an Agent</Link></li>
              <li><Link href="/contact" className="hover:text-[#f0b429] transition-colors">Contact Us</Link></li>
              <li><Link href="/login" className="hover:text-[#f0b429] transition-colors">Client Portal</Link></li>
              <li><Link href="/login" className="hover:text-[#f0b429] transition-colors">Agent Portal</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="hover:text-[#f0b429] transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-[#f0b429] transition-colors">Terms of Service</Link></li>
              <li><Link href="/register/client" className="hover:text-[#f0b429] transition-colors">Client Sign Up</Link></li>
              <li><Link href="/register/agent" className="hover:text-[#f0b429] transition-colors">Agent Registration</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#1a3260] pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-600">
          <p>&copy; {new Date().getFullYear()} FieldFlow. All rights reserved.</p>
          <p>Trusted by 500+ property managers &amp; REO companies · 87% of standard orders completed within 24hrs</p>
        </div>
      </div>
    </footer>
  );
}
