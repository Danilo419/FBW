// src/app/api/checkout/shipping/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const COOKIE_NAME = "ship";
const COOKIE_MAX_AGE = 60 * 60 * 2; // 2 hours
// Keep some safety margin under the ~4KB cookie limit.
const MAX_COOKIE_BYTES = 3800;

type Shipping = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null; // ISO-3166-1 alpha-2 preferred, but we won't block other inputs
  } | null;
};

const clip = (v: unknown, n = 200) =>
  (v ?? "")
    .toString()
    .trim()
    .slice(0, n) || null;

function sanitizeShipping(input: any): Shipping {
  const countryRaw = input?.address?.country ?? input?.address?.countryCode ?? input?.country;
  // Uppercase 2–3 chars if likely a code (don't enforce)
  const country =
    typeof countryRaw === "string" && countryRaw.trim().length <= 3
      ? countryRaw.trim().toUpperCase()
      : clip(countryRaw, 100);

  const out: Shipping = {
    name: clip(input?.name, 200),
    phone: clip(input?.phone, 50),
    email: clip(input?.email, 200),
    address: {
      line1: clip(input?.address?.line1, 200),
      line2: clip(input?.address?.line2, 200),
      city: clip(input?.address?.city, 120),
      state: clip(input?.address?.state, 120),
      postal_code: clip(input?.address?.postal_code ?? input?.address?.postalCode, 40),
      country,
    },
  };

  // Remove empty address object if no fields
  const a = out.address!;
  if (!a.line1 && !a.line2 && !a.city && !a.state && !a.postal_code && !a.country) {
    out.address = null;
  }

  return out;
}

function isEmptyShipping(s: Shipping | null) {
  if (!s) return true;
  const a = s.address ?? {};
  return !(
    s.name ||
    s.phone ||
    s.email ||
    a.line1 ||
    a.line2 ||
    a.city ||
    a.state ||
    a.postal_code ||
    a.country
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawShipping = body?.shipping ?? body; // accept either shape
    const shipping = sanitizeShipping(rawShipping);

    if (isEmptyShipping(shipping)) {
      return NextResponse.json({ error: "Missing shipping" }, { status: 400 });
    }

    const json = JSON.stringify(shipping);
    const payload = Buffer.from(json, "utf8").toString("base64");

    if (Buffer.byteLength(payload, "utf8") > MAX_COOKIE_BYTES) {
      return NextResponse.json(
        { error: "Shipping data too large" },
        { status: 413 }
      );
    }

    const jar = await cookies();
    jar.set(COOKIE_NAME, payload, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 400 });
  }
}

export async function GET() {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return NextResponse.json({ shipping: null });
  try {
    const shipping = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as Shipping;
    return NextResponse.json({ shipping });
  } catch {
    return NextResponse.json({ shipping: null });
  }
}

export async function DELETE() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return NextResponse.json({ ok: true });
}
