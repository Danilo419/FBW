"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toggleResolved } from "@/app/[locale]/admin/(panel)/actions";

type Props = {
  orderId: string;
  initialResolved: boolean;
  initialStatus: string;
};

export default function ResolveCheckbox({
  orderId,
  initialResolved,
  initialStatus,
}: Props) {
  const router = useRouter();
  const [checked, setChecked] = React.useState(initialResolved);
  const [isPending, startTransition] = React.useTransition();

  const fallbackStatus = React.useMemo(() => {
    const s = (initialStatus || "").toUpperCase();
    return s === "RESOLVED" ? "PENDING" : initialStatus || "PENDING";
  }, [initialStatus]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked;
    setChecked(next);

    if (next) fireConfettiAtTarget(e.currentTarget);

    startTransition(async () => {
      try {
        if (next) {
          await toggleResolved({ orderId, makeResolved: true });
        } else {
          await toggleResolved({
            orderId,
            makeResolved: false,
            fallbackStatus,
          });
        }
      } finally {
        router.refresh();
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

/* ===================== CONFETTI ===================== */

function fireConfettiAtTarget(inputEl: HTMLInputElement) {
  const rect = inputEl.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  confettiBurst({ x, y });
}

function confettiBurst({
  x,
  y,
  count = 140,
  duration = 1000,
}: {
  x: number;
  y: number;
  count?: number;
  duration?: number;
}) {
  const canvas = document.createElement("canvas");

  canvas.style.position = "fixed";
  canvas.style.left = "0";
  canvas.style.top = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "9999";

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d")!;
  const particles = makeParticles(count, x, y);
  const start = performance.now();

  function tick(now: number) {
    const elapsed = now - start;
    const progress = Math.min(1, elapsed / duration);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      p.vy += 0.25;
      p.vx += 0.02 * Math.sin(p.seed + elapsed * 0.01);

      p.x += p.vx;
      p.y += p.vy;
      p.r += p.spin;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.globalAlpha = 1 - progress;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    if (elapsed < duration) {
      requestAnimationFrame(tick);
    } else {
      document.body.removeChild(canvas);
    }
  }

  requestAnimationFrame(tick);
}

function makeParticles(n: number, x: number, y: number) {
  const particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    spin: number;
    w: number;
    h: number;
    color: string;
    seed: number;
  }> = [];

  for (let i = 0; i < n; i++) {
    const angle = -Math.PI + Math.random() * Math.PI;
    const speed = 4 + Math.random() * 6;
    const hue = Math.floor(Math.random() * 360);

    particles.push({
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

  return particles;
}