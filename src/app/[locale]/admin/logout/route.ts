import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getLocaleFromPathname(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  return parts[0] || "en";
}

export async function POST(req: Request) {
  const url = new URL(req.url);

  const locale = getLocaleFromPathname(url.pathname);

  const res = NextResponse.redirect(
    new URL(`/${locale}/account/login`, url.origin)
  );

  res.cookies.set({
    name: "admin_auth",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res;
}

// permitir GET direto no browser (ex.: escrever /admin/logout)
export { POST as GET };