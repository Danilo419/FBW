// scripts/test-blob.ts
import "dotenv/config";
import { put } from "@vercel/blob";

async function main() {
  const token =
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.VERCEL_BLOB_RW_TOKEN ||
    "";

  if (!token) {
    console.error(
      "FAIL: Missing token. Set BLOB_READ_WRITE_TOKEN (recommended) or VERCEL_BLOB_RW_TOKEN in .env/.env.local."
    );
    process.exit(1);
  }

  // Timeout para não ficar preso para sempre
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await put("test/hello.txt", "hello", {
      access: "public",
      token,
      // @ts-expect-error - signal é suportado no fetch interno
      signal: controller.signal,
    });

    console.log("OK:", res.url);
  } catch (e: any) {
    console.error("FAIL:", e?.message || e);
    process.exit(1);
  } finally {
    clearTimeout(t);
  }
}

main();
