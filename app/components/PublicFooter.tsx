import Link from "next/link";
import { Camera } from "lucide-react";

export default function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <Camera className="w-4 h-4 text-white" />
              </div>
              <span className="text-slate-200 font-bold text-lg">FieldFlow</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-500">
              Professional field inspection and photo documentation services nationwide.
            </p>
            <div className="mt-4 space-y-1 text-xs text-slate-500">
              <p>support@fieldflow.app</p>
              <p>Mon–Fri 8am–6pm CST</p>
            </div>
          </div>
          <div>
            <h4 className="text-slate-200 font-semibold text-sm mb-4">Services</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/services" className="hover:text-slate-200 transition-colors">Photo Sets</Link></li>
              <li><Link href="/services" className="hover:text-slate-200 transition-colors">Vehicle Inspections</Link></li>
              <li><Link href="/services" className="hover:text-slate-200 transition-colors">Property Inspections</Link></li>
              <li><Link href="/services" className="hover:text-slate-200 transition-colors">Videography</Link></li>
              <li><Link href="/services" className="hover:text-slate-200 transition-colors">All Services</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-slate-200 font-semibold text-sm mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/coverage" className="hover:text-slate-200 transition-colors">Coverage Map</Link></li>
              <li><Link href="/work" className="hover:text-slate-200 transition-colors">Become an Agent</Link></li>
              <li><Link href="/contact" className="hover:text-slate-200 transition-colors">Contact</Link></li>
              <li><Link href="/login" className="hover:text-slate-200 transition-colors">Client Login</Link></li>
              <li><Link href="/login" className="hover:text-slate-200 transition-colors">Agent Login</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-slate-200 font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/register/client" className="hover:text-slate-200 transition-colors">Sign Up as Client</Link></li>
              <li><Link href="/register/agent" className="hover:text-slate-200 transition-colors">Join as Field Agent</Link></li>
              <li><Link href="/privacy" className="hover:text-slate-200 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-slate-200 transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-600">
          <p>&copy; {new Date().getFullYear()} FieldFlow. All rights reserved.</p>
          <p className="text-slate-700">Trusted by 500+ property managers &amp; REO companies nationwide</p>
        </div>
      </div>
    </footer>
  );
}
