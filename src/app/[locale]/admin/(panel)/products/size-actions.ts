// src/app/admin/(panel)/products/size-actions.ts
"use server";

import { prisma } from "@/lib/prisma";

/**
 * Define explicitamente a disponibilidade do tamanho (NÃO apaga o registo).
 * @param sizeId ID do registo em SizeStock
 * @param available true = disponível, false = indisponível
 */
export async function setSizeAvailability(sizeId: string, available: boolean) {
  if (!sizeId) throw new Error("Missing sizeId");

  const row = await prisma.sizeStock.update({
    where: { id: sizeId },
    data: { available },
    select: { id: true, size: true, available: true, productId: true },
  });

  return { sizeId: row.id, available: row.available };
}

/**
 * Alterna (toggle) a disponibilidade.
 * @param sizeId ID do registo em SizeStock
 */
export async function toggleSizeAvailability(sizeId: string) {
  if (!sizeId) throw new Error("Missing sizeId");

  const row = await prisma.sizeStock.findUnique({
    where: { id: sizeId },
    select: { id: true, available: true },
  });
  if (!row) throw new Error("Size not found");

  const next = !row.available;

  const updated = await prisma.sizeStock.update({
    where: { id: sizeId },
    data: { available: next },
    select: { id: true, available: true },
  });

  return { sizeId: updated.id, available: updated.available };
}

/**
 * Compatibilidade com UIs antigas:
 * algumas chamam setSizeUnavailable({ sizeId, unavailable }).
 * Mantemos a assinatura para evitar refactors.
 * @param args.sizeId ID do registo
 * @param args.unavailable true = marcar como indisponível
 */
export async function setSizeUnavailable(args: { sizeId: string; unavailable: boolean }) {
  const { sizeId, unavailable } = args;
  if (!sizeId) throw new Error("Missing sizeId");
  return setSizeAvailability(sizeId, !unavailable ? true : false);
}
