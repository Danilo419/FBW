"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  label: string;
  confirmText: string;
  action: (formData: FormData) => Promise<void>;
  formData: Record<string, string>;
  className?: string;
};

export default function DangerActionButton({
  label,
  confirmText,
  action,
  formData,
  className,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    if (!window.confirm(confirmText)) return;

    startTransition(async () => {
      try {
        const fd = new FormData();
        for (const [k, v] of Object.entries(formData)) fd.set(k, v);
        await action(fd);
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? "Erro ao executar ação.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        className={
          className ??
          "inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        }
      >
        {isPending ? "A processar..." : label}
      </button>

      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
