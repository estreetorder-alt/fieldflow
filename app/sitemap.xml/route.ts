import { NextResponse } from "next/server";
const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://fieldflow.app";
const PAGES = [
  { url:"/", priority:"1.0", changefreq:"weekly" },
  { url:"/services", priority:"0.9", changefreq:"weekly" },
  { url:"/coverage", priority:"0.8", changefreq:"weekly" },
  { url:"/work", priority:"0.8", changefreq:"monthly" },
  { url:"/contact", priority:"0.7", changefreq:"monthly" },
  { url:"/register/client", priority:"0.9", changefreq:"monthly" },
  { url:"/register/agent", priority:"0.8", changefreq:"monthly" },
  { url:"/login", priority:"0.5", changefreq:"yearly" },
  { url:"/privacy", priority:"0.3", changefreq:"yearly" },
  { url:"/terms", priority:"0.3", changefreq:"yearly" },
];
export async function GET() {
  const now = new Date().toISOString().split("T")[0];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PAGES.map(p=>`  <url>\n    <loc>${BASE}${p.url}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`).join("\n")}\n</urlset>`;
  return new NextResponse(xml, { headers:{"Content-Type":"application/xml","Cache-Control":"public, max-age=86400"} });
}
