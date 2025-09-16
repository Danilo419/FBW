"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Star, MessageSquare, Send, Loader2, UserRound, Sparkles, MessageCircle } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Contracts                                                          */
/* ------------------------------------------------------------------ */
type ReviewUser = { name?: string | null; image?: string | null };
type Review = {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string; // ISO
  user?: ReviewUser | null;
};
type ReviewsResponse = { reviews: Review[]; average: number; total: number };

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const clamp = (n: number, min = 0, max = 5) => Math.max(min, Math.min(max, n));

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24);
  if (dd < 30) return `${dd}d ago`;
  return d.toLocaleDateString();
}

function initials(name?: string | null) {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/);
  const i1 = parts[0]?.[0] ?? "";
  const i2 = parts[1]?.[0] ?? "";
  return (i1 + i2).toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Read-only stars (cheias e amarelas, com preenchimento parcial)     */
/* ------------------------------------------------------------------ */
function ReadOnlyStars({ value, size = 16 }: { value: number; size?: number }) {
  const v = clamp(value);
  const full = Math.floor(v);
  const partial = v - full;

  return (
    <div className="inline-flex gap-1 align-middle" aria-label={`${v.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < full ? 1 : i === full ? partial : 0;
        return (
          <div className="relative" key={i} style={{ width: size, height: size }}>
            {/* base cinza preenchida */}
            <Star className="absolute inset-0 text-gray-300" width={size} height={size} fill="currentColor" />
            {/* parte amarela (clip) */}
            <Star
              className="absolute inset-0 text-amber-500"
              width={size}
              height={size}
              fill="currentColor"
              style={{ clipPath: `inset(0 ${100 - filled * 100}% 0 0)` }}
              aria-hidden
            />
            {/* contorno suave */}
            <Star className="absolute inset-0 text-amber-700/25" width={size} height={size} fill="none" />
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Selector de estrelas (amarelas cheias)                             */
/* ------------------------------------------------------------------ */
function SelectStars({
  value,
  onChange,
  size = 26,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const live = hover ?? value;

  return (
    <div className="inline-flex items-center gap-3">
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => {
          const idx = i + 1;
          const active = live >= idx;
          return (
            <button
              key={i}
              type="button"
              onMouseEnter={() => setHover(idx)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onChange(idx)}
              className={`relative transition-transform duration-150 ${
                active ? "scale-110" : "opacity-60 hover:opacity-90"
              }`}
              aria-label={`${idx} star${idx > 1 ? "s" : ""}`}
            >
              {active && <span className="absolute -inset-1 rounded-full bg-amber-300/25 blur-[6px]" />}
              <Star
                width={size}
                height={size}
                className={active ? "text-amber-500" : "text-gray-300"}
                fill="currentColor"
              />
              <Star width={size} height={size} className="absolute inset-0 text-black/10" fill="none" />
            </button>
          );
        })}
      </div>
      <span className="text-sm text-gray-500">Click a star (0–5)</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Item de review — compacto e sem “espaços brancos”                   */
/* ------------------------------------------------------------------ */
function ReviewItem({ r }: { r: Review }) {
  const name = r.user?.name || "Anonymous";
  const photo = r.user?.image || null;

  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {photo ? (
          <img
            src={photo}
            alt={name}
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover ring-1 ring-black/5"
          />
        ) : (
          <div className="h-10 w-10 rounded-full grid place-items-center bg-gradient-to-br from-gray-50 to-gray-100 text-gray-600 ring-1 ring-black/5">
            {/* fallback com iniciais */}
            <span className="text-xs font-semibold">{initials(name)}</span>
          </div>
        )}

        {/* Conteúdo */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate">{name}</span>
            <ReadOnlyStars value={r.rating} />
            <span className="ml-auto text-xs text-gray-500">{timeAgo(r.createdAt)}</span>
          </div>
          {r.comment && <p className="mt-1 text-sm text-gray-700 break-words">{r.comment}</p>}
        </div>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Barras de distribuição                                              */
/* ------------------------------------------------------------------ */
function Distribution({ reviews }: { reviews: Review[] }) {
  const totals = useMemo(() => {
    const acc = [0, 0, 0, 0, 0, 0]; // 0..5
    for (const r of reviews) acc[clamp(Math.round(r.rating))] += 1;
    return acc;
  }, [reviews]);

  const total = reviews.length || 1;

  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = totals[star];
        const pct = Math.round((count / total) * 100);
        return (
          <div key={star} className="grid grid-cols-[24px_1fr_auto] items-center gap-3">
            <span className="text-xs text-gray-500">{star}</span>
            <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden ring-1 ring-black/5">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-gray-500 w-8 text-right">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mini confetti ⭐✨                                                   */
/* ------------------------------------------------------------------ */
function Confetti({ show }: { show: boolean }) {
  if (!show) return null;
  const bits = Array.from({ length: 10 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {bits.map((_, i) => {
        const left = Math.random() * 80 + 10;
        const delay = Math.random() * 0.1;
        const rotate = Math.random() * 40 - 20;
        return (
          <div
            key={i}
            className="absolute top-1/2 text-lg animate-[float_700ms_ease-out_forwards]"
            style={{ left: `${left}%`, animationDelay: `${delay}s`, transform: `rotate(${rotate}deg)` }}
          >
            {i % 2 ? "⭐" : "✨"}
          </div>
        );
      })}
      <style>{`@keyframes float{to{transform:translateY(-60px);opacity:0}}`}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MAIN                                                                */
/* ------------------------------------------------------------------ */
export default function ReviewsPanel({ productId }: { productId: string }) {
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews?productId=${productId}`, { cache: "no-store" });
      const json = (await res.json()) as ReviewsResponse;
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [productId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, comment: comment.trim() || null }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to submit review.");
      }
      setComment("");
      setRating(0);
      setOk(true);
      await load();
      setTimeout(() => setOk(false), 800);
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
      setTimeout(() => setError(null), 2500);
    }
  }

  const average = data?.average ?? 0;
  const total = data?.total ?? 0;
  const reviews = data?.reviews ?? [];

  // para o “dial”
  const deg = (clamp(average) / 5) * 360;

  return (
    <section className="mt-10">
      {/* Cabeçalho */}
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-r from-slate-50 via-white to-cyan-50 p-5 ring-1 ring-black/5">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-200/30 blur-3xl" />
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              Ratings & Reviews
            </span>
          </h2>
          <div className="flex items-center gap-3 rounded-full border bg-white/70 px-3 py-1">
            <ReadOnlyStars value={average} />
            <span className="text-sm text-gray-700">
              <span className="font-semibold">{average.toFixed(1)}</span>/5
            </span>
            <span className="text-xs text-gray-500">({total})</span>
          </div>
        </div>
      </div>

      {/* Layout 2 colunas */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        {/* Formulário */}
        <form
          onSubmit={onSubmit}
          className="relative rounded-3xl border bg-white/80 p-5 shadow-sm ring-1 ring-black/5"
        >
          <Confetti show={ok} />
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm font-medium text-gray-700">Your rating</div>
            <div className="rounded-full border bg-white/70 px-3 py-1 text-xs text-gray-600">
              Ratings 0–5 are allowed
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <SelectStars value={rating} onChange={setRating} />
            <div className="rounded-xl border bg-white/70 px-3 py-1.5 text-xs text-gray-600">
              Selected: <span className="font-semibold">{rating}</span>/5
            </div>
          </div>

          <div className="mt-4 relative">
            <div className="pointer-events-none absolute left-3 top-3 text-gray-400">
              <MessageSquare className="h-4 w-4" />
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
              placeholder="Share more details about the product..."
              className="w-full resize-y rounded-2xl border bg-white/80 pl-10 pr-3 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={1000}
            />
            <div className="mt-1 text-xs text-gray-400 text-right">{comment.length}/1000</div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              disabled={submitting || rating < 0 || rating > 5}
              className="relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-medium text-white shadow-md transition hover:brightness-110 active:scale-[.98] disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Submit review
                </>
              )}
            </button>

            {error && <span className="text-sm text-red-600">{error}</span>}
            {ok && <span className="text-sm text-emerald-600">Thanks for your review!</span>}
          </div>
        </form>

        {/* Estatísticas */}
        <div className="rounded-3xl border bg-white/80 p-5 shadow-sm ring-1 ring-black/5">
          <div className="grid grid-cols-[auto_1fr] gap-5 items-center">
            {/* Dial circular */}
            <div className="relative h-28 w-28">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(#f59e0b ${deg}deg, #e5e7eb ${deg}deg)`,
                }}
              />
              <div className="absolute inset-2 rounded-full bg-white shadow-inner" />
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="text-2xl font-extrabold tracking-tight">{average.toFixed(1)}</div>
                  <div className="text-[10px] text-gray-500">/ 5</div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-600">Distribution</div>
              <div className="mt-3">
                <Distribution reviews={reviews} />
              </div>
              <div className="mt-3 text-xs text-gray-500 tabular-nums">
                {total} review{total === 1 ? "" : "s"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent reviews — compacto, com divide entre itens e sem “cards” pesados */}
      <div className="mt-6 rounded-3xl border bg-white/80 p-5 shadow-sm ring-1 ring-black/5">
        <div className="flex items-center gap-2 text-base font-semibold">
          <MessageCircle className="h-4 w-4 text-blue-600" />
          Recent reviews
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-gray-500">Loading…</div>
        ) : reviews.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">No reviews yet. Be the first!</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100">
            {reviews.map((r) => (
              <ReviewItem r={r} key={r.id} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
