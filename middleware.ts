// middleware.ts (raiz do projeto)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * - Protege /admin com NextAuth (só entra quem for admin)
 * - Garante que /checkout tem o cookie "ship" (senão redireciona para /checkout/address)
 *
 * Nota: define NEXTAUTH_SECRET nas variáveis do Vercel.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- Proteger /admin ---
  if (pathname.startsWith("/admin")) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET, // passa o secret explicitamente
    });

    const isAdmin =
      !!token &&
      ( (token as any).isAdmin === true ||
        (typeof token?.name === "string" && token.name.toLowerCase() === "admin") );

    if (!isAdmin) {
      const login = new URL("/account/login", req.nextUrl.origin);
      login.searchParams.set(
        "callbackUrl",
        req.nextUrl.pathname + req.nextUrl.search
      );
      return NextResponse.redirect(login);
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
