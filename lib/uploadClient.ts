// Client-side image upload helper.
// 1) Asks the server for a signed Supabase Storage upload URL
// 2) PUTs the raw file bytes directly to storage (any image type, any size — no serverless body limit)
// 3) Falls back to a base64 data-URL only if storage isn't configured (small files still work)

export async function uploadImageFile(file: File, folder?: string): Promise<{ filename: string; url: string }> {
  const filename = file.name || "photo.jpg";

  try {
    const signRes = await fetch("/api/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, folder: folder ?? "uploads" }),
    });
    const sign = await signRes.json();

    if (signRes.ok && sign.signedUrl && !sign.fallback) {
      const put = await fetch(sign.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "x-upsert": "false",
        },
        body: file,
      });
      if (put.ok) return { filename, url: sign.publicUrl };
    }
  } catch {
    // fall through to base64
  }

  // Base64 fallback (storage not configured). Note: very large files may exceed
  // the serverless request limit on this path — the direct-storage path above has no limit.
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsDataURL(file);
  });
  return { filename, url: dataUrl };
}
