// middleware.ts (raiz do projeto)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * - Protege /admin com NextAuth (só entra quem for admin)
 * - Garante que /checkout tem o cookie "ship" (senão redireciona para /checkout/address)
 *
 * Importante: para o guard de /admin funcionar em produção,
 * garante que NEXTAUTH_SECRET está definido nas variáveis do Vercel.
 */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // --- Guard para /admin ---
  if (pathname.startsWith("/admin")) {
    const token = await getToken({ req, secureCookie: true });
    const isAdmin =
      !!token &&
      (((token as any).isAdmin === true) ||
        (typeof token?.name === "string" && token.name.toLowerCase() === "admin"));

    if (!isAdmin) {
      const url = req.nextUrl.clone();
      url.pathname = "/account/login";
      url.search = `?callbackUrl=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
  }

  // --- Fluxo do checkout: precisa do cookie "ship" ---
  if (pathname === "/checkout") {
    const ship = req.cookies.get("ship")?.value;
    if (!ship) {
      const url = req.nextUrl.clone();
      url.pathname = "/checkout/address";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/checkout", "/admin/:path*"],
};
