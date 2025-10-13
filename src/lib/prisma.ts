// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

/**
 * Singleton do Prisma para evitar múltiplas conexões em dev (HMR).
 */
declare global {
  // eslint-disable-next-line no-var
  var __PRISMA__: PrismaClient | undefined;
}

const isProd = process.env.NODE_ENV === "production";

/**
 * Logs configuráveis via PRISMA_LOG:
 *  - "query" | "info" | "warn" | "error"
 *  - default: "warn" em dev, "error" em prod
 *
 * (Sem depender de tipos do @prisma/client que podem não existir)
 */
type LogLiteral = "query" | "info" | "warn" | "error";
type LogConfig =
  | LogLiteral
  | { level: LogLiteral; emit: "stdout" | "event" };

const level = (process.env.PRISMA_LOG || (isProd ? "error" : "warn")).toLowerCase() as LogLiteral;

const log: LogConfig[] = [];
if (level === "query") {
  log.push("query", "info", "warn", "error");
} else if (level === "info") {
  log.push("info", "warn", "error");
} else if (level === "warn") {
  log.push("warn", "error");
} else {
  log.push("error");
}

export const prisma =
  globalThis.__PRISMA__ ??
  new PrismaClient({
    // Prisma aceita um array de literais ("query" | "info" | "warn" | "error")
    // ou objetos { level, emit }. Aqui usamos apenas literais.
    log,
    errorFormat: isProd ? "minimal" : "pretty",
    // Opcional: força datasource por código (normalmente desnecessário):
    // datasources: { db: { url: process.env.POSTGRES_POSTGRES_PRISMA_URL! } },
  });

if (!isProd) {
  globalThis.__PRISMA__ = prisma;
}

export default prisma;

/**
 * Dica: em rotas do App Router que usem Prisma,
 * define `export const runtime = "nodejs";` (Prisma não funciona no Edge).
 */
