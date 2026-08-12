"use client";
import { useState, useRef, useEffect } from "react";
import { Download, FileSpreadsheet, FileText, FileDown } from "lucide-react";
import { exportData, ExportColumn } from "@/lib/exportUtils";

export default function ExportButton<T>({
  rows, columns, filename, pdfTitle, label = "Export",
}: {
  rows: T[]; columns: ExportColumn<T>[]; filename: string; pdfTitle?: string; label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function go(format: "csv" | "excel" | "pdf") {
    exportData(format, rows, columns, filename, pdfTitle);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)} disabled={rows.length === 0}
        className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
        <Download className="w-3.5 h-3.5" />{label}
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-40 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
          <button onClick={() => go("csv")} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 text-left">
            <FileText className="w-3.5 h-3.5 text-slate-400" />CSV
          </button>
          <button onClick={() => go("excel")} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 text-left border-t border-slate-100">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />Excel
          </button>
          <button onClick={() => go("pdf")} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 text-left border-t border-slate-100">
            <FileDown className="w-3.5 h-3.5 text-red-500" />PDF
          </button>
        </div>
      )}
    </div>
  );
}
