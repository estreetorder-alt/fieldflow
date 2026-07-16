"use client";
import { motion } from "framer-motion";
import { Camera, CheckCircle2, MapPin, Clock } from "lucide-react";

export default function HeroVisual() {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Radiating rings */}
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-[420px] h-[420px] rounded-full border border-white/15"
      />
      <motion.div
        animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        className="absolute w-[340px] h-[340px] rounded-full border border-white/10"
      />

      {/* Central camera badge */}
      <motion.div
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 w-40 h-40 rounded-full bg-gradient-to-br from-[#EA580C] to-[#B45309] flex items-center justify-center shadow-2xl"
      >
        <Camera className="w-16 h-16 text-white" strokeWidth={1.5} />
      </motion.div>

      {/* Floating photo cards */}
      <motion.div
        initial={{ opacity: 0, x: -30, rotate: -8 }}
        animate={{ opacity: 1, x: 0, rotate: -8, y: [0, -10, 0] }}
        transition={{ opacity: { duration: 0.8, delay: 0.3 }, x: { duration: 0.8, delay: 0.3 }, y: { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 } }}
        className="absolute left-6 top-16 w-28 h-20 rounded-xl bg-white/95 shadow-xl p-2"
      >
        <div className="w-full h-full rounded-lg bg-gradient-to-br from-[#F3EBDD] to-[#E7DBCB] flex items-center justify-center">
          <MapPin className="w-6 h-6 text-[#C2410C]" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 30, rotate: 6 }}
        animate={{ opacity: 1, x: 0, rotate: 6, y: [0, 12, 0] }}
        transition={{ opacity: { duration: 0.8, delay: 0.45 }, x: { duration: 0.8, delay: 0.45 }, y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.2 } }}
        className="absolute right-4 top-24 w-32 h-24 rounded-xl bg-white/95 shadow-xl p-2"
      >
        <div className="w-full h-full rounded-lg bg-gradient-to-br from-[#FDE9D0] to-[#F3D5A9] flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-[#B45309]" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0, x: [0, 8, 0] }}
        transition={{ opacity: { duration: 0.8, delay: 0.6 }, y: { duration: 0.8, delay: 0.6 }, x: { duration: 5.5, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute bottom-16 left-16 w-24 h-24 rounded-xl bg-white/95 shadow-xl p-2"
      >
        <div className="w-full h-full rounded-lg bg-gradient-to-br from-[#FCEEE3] to-[#F5D9BE] flex items-center justify-center">
          <Clock className="w-6 h-6 text-[#C2410C]" />
        </div>
      </motion.div>

      {/* Drifting dots */}
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-white/40"
          style={{ left: `${10 + ((i * 37) % 80)}%`, top: `${15 + ((i * 53) % 70)}%` }}
          animate={{ opacity: [0.2, 0.7, 0.2], scale: [1, 1.4, 1] }}
          transition={{ duration: 3 + (i % 4), repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
        />
      ))}
    </div>
  );
}
