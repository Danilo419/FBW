"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeletePtStockProductButton({
  productId,
}: {
  productId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const ok = window.confirm("Tem certeza que quer eliminar este produto?");
    if (!ok) return;

    try {
      setLoading(true);

      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Falha ao eliminar o produto.");
      }

      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao eliminar o produto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Deleting..." : "Delete"}
    </button>
  );
}