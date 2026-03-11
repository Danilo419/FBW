// proxy.ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    "/",                    // homepage
    "/(en|pt)/:path*",      // páginas com locale
    "/((?!api|_next|_vercel|.*\\..*).*)" // excluir API e assets
  ]
};