"use client";

import React from "react";
import { toggleResolved } from "@/app/admin/(panel)/actions";

type Props = {
  orderId: string;
  initialResolved: boolean;
  initialStatus: string; // status original para restaurar quando desmarcar
};

export default function ResolveCheckbox({ orderId, initialResolved, initialStatus }: Props) {
  const [checked, setChecked] = React.useState(initialResolved);
  const [isPending, startTransition] = React.useTransition();
  const originalStatusRef = React.useRef(initialStatus || "PENDING");

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked;
    setChecked(next);

    // dispara confetti apenas quando MARCA como resolvido
    if (next) fireConfettiAtTarget(e.currentTarget);

    startTransition(async () => {
      if (next) {
        await toggleResolved({ orderId, makeResolved: true });
      } else {
        await toggleResolved({
          orderId,
          makeResolved: false,
          fallbackStatus: originalStatusRef.current || "PENDING",
        });
      }
    });
  };

  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-0"
        checked={checked}
        onChange={onChange}
        disabled={isPending}
      />
      <span className="text-xs">{checked ? "Resolved" : "Mark resolved"}</span>
    </label>
  );
}

/* ===================== CONFETTI (Canvas) ===================== */

function fireConfettiAtTarget(inputEl: HTMLInputElement) {
  const rect = inputEl.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  confettiBurst({ x, y });
}

function confettiBurst({ x, y, count = 140, duration = 1000 }: { x: number; y: number; count?: number; duration?: number }) {
  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.left = "0";
  canvas.style.top = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "60";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d")!;
  const particles = makeParticles(count, x, y, canvas.width, canvas.height);
  const start = performance.now();

  function tick(now: number) {
    const t = now - start;
    const p = Math.min(1, t / duration);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((pt) => {
      // física simples
      pt.vy += 0.25;          // gravidade
      pt.vx += 0.02 * Math.sin(pt.seed + t * 0.01); // drift
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.r += pt.spin;

      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.r);
      ctx.globalAlpha = 1 - p;
      ctx.fillStyle = pt.color;
      ctx.fillRect(-pt.w / 2, -pt.h / 2, pt.w, pt.h);
      ctx.restore();
    });

    if (t < duration) {
      requestAnimationFrame(tick);
    } else {
      document.body.removeChild(canvas);
    }
  }

  requestAnimationFrame(tick);
}

function makeParticles(n: number, x: number, y: number, W: number, H: number) {
  const out: Array<{
    x: number; y: number; vx: number; vy: number; r: number; spin: number;
    w: number; h: number; color: string; seed: number;
  }> = [];
  for (let i = 0; i < n; i++) {
    const angle = (Math.random() * Math.PI) - Math.PI / 2; // para cima
    const speed = 4 + Math.random() * 6;
    const hue = Math.floor(Math.random() * 360);
    out.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      r: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      color: `hsl(${hue}, 90%, 55%)`,
      seed: Math.random() * 1000,
    });
  }
  return out;
}
