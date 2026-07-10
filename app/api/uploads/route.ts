import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Issues a signed upload URL so the browser uploads the file DIRECTLY to
// Supabase Storage — no size limit from the serverless request body (~4.5MB on Vercel).
// Any image type, any size.
export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || !["agent", "admin", "client"].includes(userRole ?? ""))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filename, folder } = await request.json();
  if (!filename) return NextResponse.json({ error: "filename required" }, { status: 400 });

  const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
  const safeFolder = String(folder ?? "uploads").replace(/[^a-zA-Z0-9._/-]/g, "_");
  const path = `${safeFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${safeName}`;

  const { data, error } = await supabase.storage.from("photos").createSignedUploadUrl(path);
  if (error || !data) {
    // Storage bucket not configured — tell the client to fall back to base64
    return NextResponse.json({ fallback: true, error: error?.message ?? "storage unavailable" });
  }

  const { data: { publicUrl } } = supabase.storage.from("photos").getPublicUrl(path);
  return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, path, publicUrl });
}
