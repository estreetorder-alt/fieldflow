// Req. 12 — universal export functionality across orders, statements, and
// date-range reports into PDF, CSV, or Excel. Implemented client-side with
// no extra dependencies: CSV is native, "Excel" uses the SpreadsheetML XML
// format (opens natively in Excel with a .xls extension, no library
// needed), and PDF uses the browser's print-to-PDF via a formatted print
// window (avoids pulling in a heavy PDF-generation dependency for what is,
// in every case here, a simple tabular report).

export type ExportColumn<T> = { label: string; value: (row: T) => string | number };

function triggerDownload(filename: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportToCSV<T>(rows: T[], columns: ExportColumn<T>[], filename: string) {
  const header = columns.map(c => csvEscape(c.label)).join(",");
  const lines = rows.map(row => columns.map(c => csvEscape(c.value(row))).join(","));
  triggerDownload(`${filename}.csv`, "text/csv;charset=utf-8;", [header, ...lines].join("\n"));
}

/** SpreadsheetML (Excel 2003 XML) — opens directly in Excel/Sheets, no library required. */
export function exportToExcel<T>(rows: T[], columns: ExportColumn<T>[], filename: string, sheetName = "Sheet1") {
  const esc = (s: string | number) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const cell = (v: string | number) => {
    const isNum = typeof v === "number";
    return `<Cell><Data ss:Type="${isNum ? "Number" : "String"}">${esc(v)}</Data></Cell>`;
  };
  const headerRow = `<Row>${columns.map(c => cell(c.label)).join("")}</Row>`;
  const dataRows = rows.map(row => `<Row>${columns.map(c => cell(c.value(row))).join("")}</Row>`).join("");
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="${esc(sheetName)}">
  <Table>${headerRow}${dataRows}</Table>
 </Worksheet>
</Workbook>`;
  triggerDownload(`${filename}.xls`, "application/vnd.ms-excel", xml);
}

/** Opens a print-formatted window; the user's "Save as PDF" print destination produces the PDF. */
export function exportToPDF<T>(rows: T[], columns: ExportColumn<T>[], filename: string, title: string) {
  const win = window.open("", "_blank", "width=900,height=1100");
  if (!win) { alert("Please allow pop-ups to export as PDF."); return; }
  const esc = (s: string | number) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const rowsHtml = rows.map(row => `<tr>${columns.map(c => `<td>${esc(c.value(row))}</td>`).join("")}</tr>`).join("");
  win.document.write(`<!DOCTYPE html><html><head><title>${esc(filename)}</title>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;padding:24px;color:#1e293b;}
      h1{font-size:18px;margin-bottom:4px;}
      .meta{font-size:11px;color:#64748b;margin-bottom:16px;}
      table{width:100%;border-collapse:collapse;font-size:11px;}
      th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left;}
      th{background:#f8fafc;font-weight:600;}
      @media print{ body{padding:0;} }
    </style></head><body>
    <h1>${esc(title)}</h1>
    <div class="meta">Exported ${new Date().toLocaleString()} · ${rows.length} record${rows.length === 1 ? "" : "s"}</div>
    <table><thead><tr>${columns.map(c => `<th>${esc(c.label)}</th>`).join("")}</tr></thead><tbody>${rowsHtml}</tbody></table>
    <script>window.onload = () => setTimeout(() => window.print(), 200);</script>
    </body></html>`);
  win.document.close();
}

export function exportData<T>(
  format: "csv" | "excel" | "pdf",
  rows: T[],
  columns: ExportColumn<T>[],
  filename: string,
  pdfTitle?: string,
) {
  if (format === "csv") return exportToCSV(rows, columns, filename);
  if (format === "excel") return exportToExcel(rows, columns, filename);
  return exportToPDF(rows, columns, filename, pdfTitle ?? filename);
}
