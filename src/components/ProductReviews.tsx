"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Star,
  MessageSquare,
  Send,
  Loader2,
  Sparkles,
  MessageCircle,
  X,
  Image as ImageIcon,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

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
  imageUrls?: string[] | null;
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
/* Read-only stars                                                    */
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
            <Star className="absolute inset-0 text-gray-300" width={size} height={size} fill="currentColor" />
            <Star
              className="absolute inset-0 text-amber-500"
              width={size}
              height={size}
              fill="currentColor"
              style={{ clipPath: `inset(0 ${100 - filled * 100}% 0 0)` }}
            />
            <Star className="absolute inset-0 text-amber-700/25" width={size} height={size} fill="none" />
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Selector de estrelas                                               */
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
    <div className="inline-flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
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
              <Star width={size} height={size} className={active ? "text-amber-500" : "text-gray-300"} fill="currentColor" />
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
/* Review Item                                                        */
/* ------------------------------------------------------------------ */
function ReviewItem({ r, onImageClick }: { r: Review; onImageClick: (urls: string[], index: number) => void }) {
  const name = r.user?.name || "Anonymous";
  const photo = r.user?.image || null;

  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        {photo ? (
          <img src={photo} alt={name} width={40} height={40} className="h-10 w-10 rounded-full object-cover ring-1 ring-black/5" />
        ) : (
          <div className="h-10 w-10 rounded-full grid place-items-center bg-gradient-to-br from-gray-50 to-gray-100 text-gray-600 ring-1 ring-black/5">
            <span className="text-xs font-semibold">{initials(name)}</span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate">{name}</span>
            <ReadOnlyStars value={r.rating} />
            <span className="ml-auto text-xs text-gray-500">{timeAgo(r.createdAt)}</span>
          </div>
          {r.comment && <p className="mt-1 text-sm text-gray-700 break-words">{r.comment}</p>}

          {r.imageUrls && r.imageUrls.length > 0 && (
            <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {r.imageUrls.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onImageClick(r.imageUrls!, i)}
                  className="group block focus:outline-none"
                  aria-label={`Open image ${i + 1} of ${r.imageUrls!.length}`}
                >
                  <img
                    src={url}
                    alt={`Review image ${i + 1}`}
                    className="h-24 w-full object-cover rounded-lg ring-1 ring-black/10 group-hover:brightness-110 transition"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Distribution bars                                                  */
/* ------------------------------------------------------------------ */
function Distribution({ reviews }: { reviews: Review[] }) {
  const totals = useMemo(() => {
    const acc = [0, 0, 0, 0, 0, 0];
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
              <div className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs tabular-nums text-gray-500 w-8 text-right">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Confetti                                                           */
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
/* Lightbox                                                           */
/* ------------------------------------------------------------------ */
function Lightbox({
  urls,
  index,
  onClose,
  onPrev,
  onNext,
  setIndex,
}: {
  urls: string[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  setIndex: (i: number) => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  if (!urls.length) return null;
  const current = urls[index];

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Botão fechar FIXO ao viewport */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="fixed z-[90] rounded-full bg-white/95 p-2 shadow ring-1 ring-black/10 hover:brightness-105"
        aria-label="Close"
        style={{
          right: "max(1rem, env(safe-area-inset-right))",
          top: "max(1rem, env(safe-area-inset-top))",
        }}
      >
        <X className="h-5 w-5" />
      </button>

      {/* SETAS FORA DA IMAGEM – nas laterais do ecrã */}
      {urls.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="fixed left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow ring-1 ring-black/10 hover:brightness-110"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="fixed right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow ring-1 ring-black/10 hover:brightness-110"
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* contentor */}
      <div className="relative inline-flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        {/* Imagem (ajusta ao viewport) */}
        <div className="relative">
          <img
            src={current}
            alt="Review image"
            className="block w-auto h-auto max-w-[95vw] max-h-[85vh] object-contain select-none"
            draggable={false}
          />
        </div>

        {/* Thumbnails */}
        {urls.length > 1 && (
          <div className="mt-3 grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 w-full justify-items-center">
            {urls.map((u, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`rounded-lg overflow-hidden ring-2 ${i === index ? "ring-blue-500" : "ring-transparent"}`}
                aria-label={`Go to image ${i + 1}`}
              >
                <img src={u} className="h-14 w-20 object-cover" alt={`Thumb ${i + 1}`} draggable={false} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MAIN                                                               */
/* ------------------------------------------------------------------ */
export default function ReviewsPanel({ productId }: { productId: string }) {
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxUrls, setLightboxUrls] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = useCallback((urls: string[], index: number) => {
    setLightboxUrls(urls);
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);
  const prevImage = useCallback(
    () => setLightboxIndex((i) => (i - 1 + lightboxUrls.length) % lightboxUrls.length),
    [lightboxUrls.length]
  );
  const nextImage = useCallback(
    () => setLightboxIndex((i) => (i + 1) % lightboxUrls.length),
    [lightboxUrls.length]
  );

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews?productId=${productId}`, { cache: "no-store" });
      const json = (await res.json()) as ReviewsResponse;
      setData(json);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [productId]);

  /* upload helpers */
  function addFiles(incoming: File[]) {
    const MAX = 4;
    const MAX_MB = 5;
    const errs: string[] = [];

    const cleaned = incoming.filter((f) => {
      const okType = /^image\//.test(f.type);
      const okSize = f.size <= MAX_MB * 1024 * 1024;
      if (!okType) errs.push(`"${f.name}" não é uma imagem.`);
      if (!okSize) errs.push(`"${f.name}" ultrapassa ${MAX_MB}MB.`);
      return okType && okSize;
    });

    const existingKey = new Set(files.map((f) => `${f.name}-${f.size}`));
    const unique = cleaned.filter((f) => !existingKey.has(`${f.name}-${f.size}`));

    const next = [...files, ...unique].slice(0, MAX);
    if (files.length + unique.length > MAX) errs.push(`Máximo de ${MAX} imagens.`);
    if (errs.length) {
      setError(errs.join(" "));
      setTimeout(() => setError(null), 3500);
    }
    setFiles(next);
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files || []));
    e.currentTarget.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files || []));
  }

  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  function openPicker() {
    inputRef.current?.click();
  }

  async function getSignature() {
    const r = await fetch("/api/reviews/upload-signature", { method: "POST" });
    if (!r.ok) throw new Error("Failed to get upload signature");
    return (await r.json()) as {
      timestamp: number;
      folder: string;
      signature: string;
      cloudName: string;
      apiKey: string;
    };
  }

  async function uploadDirect(selected: File[]): Promise<string[]> {
    if (!selected.length) return [];
    setUploading(true);
    setUploadPct(0);

    const { timestamp, folder, signature, cloudName, apiKey } = await getSignature();
    const urls: string[] = [];
    let done = 0;

    for (const file of selected) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", apiKey);
      fd.append("timestamp", String(timestamp));
      fd.append("signature", signature);
      fd.append("folder", folder);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json?.secure_url) {
        throw new Error(json?.error?.message || "Cloudinary upload failed");
      }

      urls.push(json.secure_url as string);
      done += 1;
      setUploadPct(Math.round((done / selected.length) * 100));
    }

    setUploading(false);
    setUploadPct(100);
    return urls;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setOk(false);
    try {
      const imageUrls = await uploadDirect(files);

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, comment: comment.trim(), imageUrls }),
      });

      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {}
        throw new Error(msg);
      }

      setComment("");
      setFiles([]);
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
  const deg = (clamp(average) / 5) * 360;

  return (
    <section className="mt-10">
      {/* Cabeçalho */}
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-r from-slate-50 via-white to-cyan-50 p-5 ring-1 ring-black/5">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-200/30 blur-3xl" />

        <div className="sm:pr-44">
          <h2 className="text-lg font-semibold tracking-tight flex items-center">
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              Ratings & Reviews
            </span>
          </h2>

          {/* Pill MOBILE */}
          <div className="mt-3 flex items-center gap-3 rounded-full border bg-white/70 px-3 py-1 shadow-sm sm:hidden">
            <ReadOnlyStars value={average} />
            <span className="text-sm text-gray-700">
              <span className="font-semibold">{average.toFixed(1)}</span>/5
            </span>
            <span className="text-xs text-gray-500">({total})</span>
          </div>

          <p className="mt-2 text-xs text-gray-600">
            You must have an account and be logged in to make a review.
          </p>
        </div>

        {/* Pill DESKTOP/TABLET */}
        <div className="hidden sm:flex absolute right-5 top-1/2 -translate-y-1/2 items-center gap-3 rounded-full border bg-white/70 px-3 py-1 shadow-sm">
          <ReadOnlyStars value={average} />
          <span className="text-sm text-gray-700">
            <span className="font-semibold">{average.toFixed(1)}</span>/5
          </span>
          <span className="text-xs text-gray-500">({total})</span>
        </div>
      </div>

      {/* Layout 2 colunas */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        {/* Formulário */}
        <form onSubmit={onSubmit} className="relative rounded-3xl border bg-white/80 p-5 shadow-sm ring-1 ring-black/5">
          <Confetti show={ok} />

          <div className="flex items-center justify-between gap-4">
            <div className="text-sm font-medium text-gray-700">Your rating</div>
            <div className="rounded-full border bg-white/70 px-3 py-1 text-xs text-gray-600">Ratings 0–5 are allowed</div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <SelectStars value={rating} onChange={setRating} />
            <div className="rounded-xl border bg-white/70 px-3 py-1.5 text-xs text-gray-600">
              Selected: <span className="font-semibold">{rating}</span>/5
            </div>
          </div>

          {/* Comment */}
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

          {/* Dropzone estilizado */}
          <div className="mt-4">
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={[
                "block rounded-2xl border-2 border-dashed px-4 py-5 cursor-pointer transition relative",
                "bg-gradient-to-r from-slate-50/60 to-cyan-50/40",
                dragOver ? "border-blue-500 bg-blue-50/60" : "border-gray-200 hover:border-blue-300",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <UploadCloud className={dragOver ? "h-5 w-5 text-blue-600" : "h-5 w-5 text-gray-500"} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-700">
                    Add images <span className="font-normal text-gray-500">(optional, up to 4 · max 5 MB each)</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Drag & drop here or{" "}
                    <button
                      type="button"
                      onClick={openPicker}
                      className="underline decoration-dotted font-medium text-blue-600 hover:text-blue-700"
                    >
                      browse
                    </button>
                    .
                  </div>

                  {files.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {files.map((f, i) => (
                        <div key={i} className="relative group">
                          <img
                            src={URL.createObjectURL(f)}
                            alt="preview"
                            className="h-24 w-full object-cover rounded-xl ring-1 ring-black/10"
                          />
                          <button
                            type="button"
                            onClick={() => setFiles((arr) => arr.filter((_, j) => j !== i))}
                            className="absolute -top-2 -right-2 p-1 rounded-full bg-white shadow ring-1 ring-black/10 opacity-90 group-hover:opacity-100"
                            aria-label="Remove image"
                            title="Remove"
                          >
                            <X className="h-3.5 w-3.5 text-gray-700" />
                          </button>
                          <div className="mt-1 truncate text-[11px] text-gray-500">{f.name}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {uploading && (
                    <div className="mt-3 h-2 w-full rounded-full bg-gray-100 overflow-hidden ring-1 ring-black/5">
                      <div className="h-full bg-blue-500 transition-all" style={{ width: `${uploadPct}%` }} />
                    </div>
                  )}
                </div>
                <div className="ml-auto shrink-0">
                  <button
                    type="button"
                    onClick={openPicker}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-3 py-2 text-xs font-medium text-white shadow-md hover:brightness-110"
                  >
                    <ImageIcon className="h-4 w-4" /> Choose
                  </button>
                </div>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={onFileInput}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
              />
            </label>

            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>{files.length}/4 selected</span>
              {error && <span className="text-red-600">{error}</span>}
            </div>
          </div>

          {/* Submit */}
          <div className="mt-5 flex items-center gap-3">
            <button
              disabled={submitting || rating <= 0 || rating > 5 || uploading}
              className="relative inline-flex items-centered gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-medium text-white shadow-md transition hover:brightness-110 active:scale-[.98] disabled:opacity-60"
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

            {ok && <span className="text-sm text-emerald-600">Thanks for your review!</span>}
          </div>
        </form>

        {/* Estatísticas */}
        <div className="rounded-3xl border bg-white/80 p-5 shadow-sm ring-1 ring-black/5">
          <div className="grid grid-cols-[auto_1fr] gap-5 items-center">
            <div className="relative h-28 w-28">
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: `conic-gradient(#f59e0b ${deg}deg, #e5e7eb ${deg}deg)` }}
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

      {/* Recent reviews */}
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
              <ReviewItem r={r} key={r.id} onImageClick={openLightbox} />
            ))}
          </ul>
        )}
      </div>

      {lightboxOpen && (
        <Lightbox
          urls={lightboxUrls}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prevImage}
          onNext={nextImage}
          setIndex={setLightboxIndex}
        />
      )}
    </section>
  );
}
