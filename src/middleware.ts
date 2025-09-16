import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const { pathname, origin, searchParams } = url;

  // Atalhos canónicos
  if (pathname === "/login") return NextResponse.redirect(`${origin}/account/login`, 308);
  if (pathname === "/signup") return NextResponse.redirect(`${origin}/account/signup`, 308);

  // Proteção admin (liberta /admin/login e /admin/logout)
  if (pathname.startsWith("/admin")) {
    const isLogin = pathname.startsWith("/admin/login");
    const isLogout = pathname.startsWith("/admin/logout");
    if (!isLogin && !isLogout) {
      const token = req.cookies.get("admin_auth")?.value;
      if (token !== "ok") {
        const redirectUrl = url.clone();
        redirectUrl.pathname = "/admin/login";
        const original = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
        redirectUrl.search = `?next=${encodeURIComponent(original)}`;
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/signup", "/admin/:path*"],
};
