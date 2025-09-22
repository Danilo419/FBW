// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

/**
 * Evita criar múltiplas instâncias do Prisma em dev (HMR do Next).
 * Guardamos a instância no escopo global.
 */
declare global {
  // eslint-disable-next-line no-var
  var __PRISMA__: PrismaClient | undefined;
}

const isProd = process.env.NODE_ENV === "production";

/**
 * Controla os logs via env PRISMA_LOG:
 *  - "query" | "info" | "warn" | "error"
 *  - default: warn em dev, error em prod
 */
const level = (process.env.PRISMA_LOG || (isProd ? "error" : "warn")).toLowerCase();
const log =
  level === "query"
    ? (["query", "warn", "error"] as const)
    : level === "info"
    ? (["info", "warn", "error"] as const)
    : level === "warn"
    ? (["warn", "error"] as const)
    : (["error"] as const);

export const prisma =
  globalThis.__PRISMA__ ??
  new PrismaClient({
    log: [...log],
    errorFormat: isProd ? "minimal" : "pretty",
    // Se quiseres forçar a URL do datasource (opcional):
    // datasources: { db: { url: process.env.DATABASE_URL! } },
  });

// Em produção, cada processo tem a sua instância;
// em dev, reutilizamos entre HMRs.
if (!isProd) {
  globalThis.__PRISMA__ = prisma;
}

export default prisma;
