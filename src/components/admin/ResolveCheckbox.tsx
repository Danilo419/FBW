"use client";

import React from "react";
import { markOrderResolved } from "@/app/admin/(panel)/actions";

export default function ResolveCheckbox({
  orderId,
  initialResolved,
}: {
  orderId: string;
  initialResolved: boolean;
}) {
  const [checked, setChecked] = React.useState(initialResolved);
  const [firing, setFiring] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const onToggle = () => {
    if (checked) return; // já resolvido
    setChecked(true);
    setFiring(true);
    startTransition(async () => {
      await markOrderResolved(orderId);
    });
    setTimeout(() => setFiring(false), 1200);
  };

  return (
    <>
      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-0"
          checked={checked}
          onChange={onToggle}
          disabled={checked || isPending}
        />
        <span className="text-xs">{checked ? "Resolved" : "Mark resolved"}</span>
      </label>

      {firing && <ConfettiBurst />}
    </>
  );
}

function ConfettiBurst() {
  const pieces = Array.from({ length: 28 });

  // Usamos <style> puro (não styled-jsx) para evitar o erro de build
  const css = `
    .__confetti_ {
      position: fixed;
      inset: 0;
      z-index: 60;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    .__confetti_piece {
      position: absolute;
      width: 8px;
      height: 12px;
      top: 0;
      left: 0;
      border-radius: 1px;
      background: hsl(calc(var(--i) * 13), 90%, 55%);
      transform: translate(-50%, -50%) rotate(45deg);
      animation: __confetti_burst 900ms ease-out forwards;
      opacity: 0.95;
    }
    @keyframes __confetti_burst {
      0% {
        transform: translate(0, 0) rotate(0deg);
        opacity: 1;
      }
      100% {
        transform: translate(calc((var(--i) - 14) * 16px), calc(-120px - (var(--i) % 5) * 20px)) rotate(720deg);
        opacity: 0;
      }
    }
  `;

  return (
    <div className="__confetti_">
      <div className="relative">
        {pieces.map((_, i) => (
          <span
            key={i}
            className="__confetti_piece"
            style={{ ["--i" as any]: i } as React.CSSProperties}
          />
        ))}
      </div>
      <style>{css}</style>
    </div>
  );
}
