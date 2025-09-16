// src/components/analytics/LiveVisitorsBadge.tsx
"use client";

import { useEffect, useState } from "react";

export default function LiveVisitorsBadge() {
  const [live, setLive] = useState<number>(0);

  useEffect(() => {
    let stop = false;

    async function poll() {
      try {
        const r = await fetch("/api/analytics/live", { cache: "no-store" });
        const j = await r.json();
        if (!stop) setLive(Number(j.live || 0));
      } catch {}
    }
    poll();
    const id = setInterval(poll, 10000); // 10s
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm bg-white">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <span className="font-medium">{live}</span>
      <span className="text-slate-500">live visitors</span>
    </div>
  );
}
