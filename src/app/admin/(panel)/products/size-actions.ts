// src/app/admin/(panel)/products/size-actions.ts
"use server";

import { prisma } from "@/lib/prisma";

/**
 * Define explicitamente a disponibilidade do tamanho (NÃO apaga o registo).
 */
export async function setSizeAvailability(sizeId: string, available: boolean) {
  if (!sizeId) throw new Error("Missing sizeId");
  await prisma.sizeStock.update({
    where: { id: sizeId },
    data: { available },
  });
  return { sizeId, available };
}

/**
 * Alterna (toggle) a disponibilidade.
 */
export async function toggleSizeAvailability(sizeId: string) {
  if (!sizeId) throw new Error("Missing sizeId");
  const row = await prisma.sizeStock.findUnique({
    where: { id: sizeId },
    select: { available: true },
  });
  if (!row) throw new Error("Size not found");
  const next = !row.available;
  await prisma.sizeStock.update({
    where: { id: sizeId },
    data: { available: next },
  });
  return { sizeId, available: next };
}

/**
 * Compat: algumas UIs chamam setSizeUnavailable({ sizeId, unavailable }).
 * Mantemos esta assinatura para conseguirmos evitar refactors.
 */
export async function setSizeUnavailable(args: { sizeId: string; unavailable: boolean }) {
  const { sizeId, unavailable } = args;
  return setSizeAvailability(sizeId, !unavailable ? true : false);
}
