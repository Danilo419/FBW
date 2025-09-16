// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

/**
 * Evita criar múltiplas instâncias do Prisma em dev (HMR do Next).
 * Usamos uma var global tipada para sobreviver a reloads.
 */
declare global {
  // eslint-disable-next-line no-var
  var __PRISMA__: PrismaClient | undefined;
}

const isProd = process.env.NODE_ENV === 'production';

/** Controla logs via env PRISMA_LOG (query|info|warn|error). Default: warn em dev, error em prod */
const wanted = (process.env.PRISMA_LOG || (isProd ? 'error' : 'warn')).toLowerCase();
const log =
  wanted === 'query'
    ? (['query', 'warn', 'error'] as const)
    : wanted === 'info'
    ? (['info', 'warn', 'error'] as const)
    : wanted === 'warn'
    ? (['warn', 'error'] as const)
    : (['error'] as const);

export const prisma =
  global.__PRISMA__ ??
  new PrismaClient({
    log: [...log],
    errorFormat: isProd ? 'minimal' : 'pretty',
    // Se quiseres forçar a URL do datasource (opcional):
    // datasources: { db: { url: process.env.DATABASE_URL } },
  });

// Em produção cada processo pode ter a sua instância;
// em dev guardamos no global para reutilizar entre HMRs.
if (!isProd) {
  global.__PRISMA__ = prisma;
}

export default prisma;
