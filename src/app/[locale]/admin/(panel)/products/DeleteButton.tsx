"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";

export default function DeleteButton({
  id,
  name,
  action,
}: {
  id: string;
  name: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        if (confirm(`Delete “${name}”? This cannot be undone.`)) {
          startTransition(() => action(formData));
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-xl border px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
        title="Delete product"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}
