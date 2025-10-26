// src/lib/upload.ts
export async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("Failed to upload");
  const { url } = await res.json();
  return url as string;
}
