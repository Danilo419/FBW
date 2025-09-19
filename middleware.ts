// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // rotas/ficheiros que nunca devem ser interceptados
  const PUBLIC_PATHS = [
    "/login",
    "/signup",
    "/auth/error",
    "/api/auth",          // next-auth
    "/_next",             // assets Next
    "/favicon.ico",
    "/manifest.webmanifest",
    "/images",
    "/static",
  ];
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // proteger /admin
  if (pathname.startsWith("/admin")) {
    // Cookie de sessão NextAuth:
    // - dev: "next-auth.session-token"
    // - prod/https: "__Secure-next-auth.session-token"
    const token =
      req.cookies.get("__Secure-next-auth.session-token")?.value ||
      req.cookies.get("next-auth.session-token")?.value;

    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      // preserva query string e next
      url.searchParams.set("next", pathname + req.nextUrl.search);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // aplica o middleware a tudo excepto os assets estáticos comuns
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)).*)"],
};
