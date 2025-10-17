// src/components/admin/CopyButton.tsx
"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label = "Copy",
  className = "",
}: { text: string; label?: string; className?: string }) {
  const [ok, setOk] = useState(false);

  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        } catch {}
      }}
    >
      {ok ? "Copied!" : label}
    </button>
  );
}
