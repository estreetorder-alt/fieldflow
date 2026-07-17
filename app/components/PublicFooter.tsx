"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Clock, Facebook, Twitter, Linkedin, Instagram } from "lucide-react";
import Image from "next/image";

export default function PublicFooter() {
  return (
    <footer className="relative bg-[#F3EBDD] border-t border-[#E7DBCB] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#F7E9D5] pointer-events-none" />

      <div className="relative container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          <motion.div
            className="col-span-1 md:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Image src="/snapect-logo.png" alt="Snapect" width={150} height={48} className="h-12 w-auto object-contain" />
            <p className="text-[#6B5D52] text-sm leading-relaxed mb-4 mt-4 max-w-xs">
              America&apos;s trusted field inspection and photo documentation platform. 35 states, verified agents.
            </p>
            <div className="space-y-1.5 text-sm text-[#6B5D52] mb-4">
              <p className="flex items-center gap-2"><Mail size={14} className="text-[#C2410C]" /> info@snapect.com</p>
              <p className="flex items-center gap-2"><Clock size={14} className="text-[#C2410C]" /> Mon–Fri · 8 AM – 6 PM CST</p>
            </div>
            <div className="flex gap-4">
              <a href="#" className="text-[#8A7A6C] hover:text-[#C2410C] transition-colors" aria-label="Facebook"><Facebook size={20} /></a>
              <a href="#" className="text-[#8A7A6C] hover:text-[#C2410C] transition-colors" aria-label="Twitter"><Twitter size={20} /></a>
              <a href="#" className="text-[#8A7A6C] hover:text-[#C2410C] transition-colors" aria-label="LinkedIn"><Linkedin size={20} /></a>
              <a href="#" className="text-[#8A7A6C] hover:text-[#C2410C] transition-colors" aria-label="Instagram"><Instagram size={20} /></a>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}>
            <h4 className="text-[#2A2320] font-semibold mb-4">Services</h4>
            <ul className="space-y-3">
              <li><Link href="/services" className="text-[#6B5D52] hover:text-[#C2410C] transition-colors text-sm">BPO Photo Sets</Link></li>
              <li><Link href="/services" className="text-[#6B5D52] hover:text-[#C2410C] transition-colors text-sm">Vehicle Inspections</Link></li>
              <li><Link href="/services" className="text-[#6B5D52] hover:text-[#C2410C] transition-colors text-sm">Property Inspections</Link></li>
              <li><Link href="/services" className="text-[#6B5D52] hover:text-[#C2410C] transition-colors text-sm">Videography</Link></li>
              <li><Link href="/services" className="text-[#6B5D52] hover:text-[#C2410C] transition-colors text-sm">All Services</Link></li>
            </ul>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}>
            <h4 className="text-[#2A2320] font-semibold mb-4">Platform</h4>
            <ul className="space-y-3">
              <li><Link href="/coverage" className="text-[#6B5D52] hover:text-[#C2410C] transition-colors text-sm">Coverage Map</Link></li>
              <li><Link href="/work" className="text-[#6B5D52] hover:text-[#C2410C] transition-colors text-sm">Become an Agent</Link></li>
              <li><Link href="/contact" className="text-[#6B5D52] hover:text-[#C2410C] transition-colors text-sm">Contact Us</Link></li>
              <li><Link href="/login" className="text-[#6B5D52] hover:text-[#C2410C] transition-colors text-sm">Vendor Portal</Link></li>
              <li><Link href="/login" className="text-[#6B5D52] hover:text-[#C2410C] transition-colors text-sm">Agent Portal</Link></li>
            </ul>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }}>
            <h4 className="text-[#2A2320] font-semibold mb-4">Legal</h4>
            <ul className="space-y-3">
              <li><Link href="/privacy" className="text-[#6B5D52] hover:text-[#C2410C] transition-colors text-sm">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-[#6B5D52] hover:text-[#C2410C] transition-colors text-sm">Terms of Service</Link></li>
              <li><Link href="/refund-policy" className="text-[#6B5D52] hover:text-[#C2410C] transition-colors text-sm">Refund Policy</Link></li>
              <li><Link href="/register/client" className="text-[#6B5D52] hover:text-[#C2410C] transition-colors text-sm">Vendor Sign Up</Link></li>
              <li><Link href="/register/agent" className="text-[#6B5D52] hover:text-[#C2410C] transition-colors text-sm">Agent Registration</Link></li>
            </ul>
          </motion.div>
        </div>

        <div className="pt-8 border-t border-[#E7DBCB]">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[#8A7A6C] text-sm">&copy; {new Date().getFullYear()} Snapect. All rights reserved.</p>
            <p className="text-[#8A7A6C] text-sm">Trusted by 500+ property managers &amp; REO companies · 87% of orders completed within 24hrs</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
