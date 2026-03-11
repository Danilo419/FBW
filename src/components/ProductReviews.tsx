"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
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
  createdAt: string;
  user?: ReviewUser | null;
  imageUrls?: string[] | null;
};

type ReviewsResponse = { reviews: Review[]; average: number; total: number };

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
const clamp = (n: number, min = 0, max = 5) => Math.max(min, Math.min(max, n));

function initials(name?: string | null) {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/);
  const i1 = parts[0]?.[0] ?? "";
  const i2 = parts[1]?.[0] ?? "";
  return (i1 + i2).toUpperCase();
}

function normalizeUrl(u?: string | null) {
  if (!u) return "";
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}

function isExternalUrl(u: string) {
  return /^https?:\/\//i.test(u) || u.startsWith("//");
}

function isBlobUrl(u: string) {
  return u.startsWith("blob:");
}

function canUseUnoptimized(u: string) {
  return isExternalUrl(u) || isBlobUrl(u);
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
  const t = useTranslations("ProductReviews");
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
              aria-label={t("starAria", { count: idx })}
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

      <span className="text-sm text-gray-500">{t("clickStar")}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Review Item                                                        */
/* ------------------------------------------------------------------ */
function ReviewItem({
  r,
  onImageClick,
  timeAgoLabel,
  anonymousLabel,
  openImageAria,
}: {
  r: Review;
  onImageClick: (urls: string[], index: number) => void;
  timeAgoLabel: (iso: string) => string;
  anonymousLabel: string;
  openImageAria: (index: number, total: number) => string;
}) {
  const name = r.user?.name || anonymousLabel;
  const photo = normalizeUrl(r.user?.image || null);

  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        {photo ? (
          <div className="relative h-10 w-10 overflow-hidden rounded-full ring-1 ring-black/5">
            <Image
              src={photo}
              alt={name}
              fill
              sizes="40px"
              className="object-cover"
              unoptimized={canUseUnoptimized(photo)}
            />
          </div>
        ) : (
          <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-gray-50 to-gray-100 text-gray-600 ring-1 ring-black/5">
            <span className="text-xs font-semibold">{initials(name)}</span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{name}</span>
            <ReadOnlyStars value={r.rating} />
            <span className="ml-auto text-xs text-gray-500">{timeAgoLabel(r.createdAt)}</span>
          </div>

          {r.comment && <p className="mt-1 break-words text-sm text-gray-700">{r.comment}</p>}

          {r.imageUrls && r.imageUrls.length > 0 && (
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {r.imageUrls.map((url, i) => {
                const safeUrl = normalizeUrl(url);

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onImageClick(r.imageUrls!, i)}
                    className="group block focus:outline-none"
                    aria-label={openImageAria(i + 1, r.imageUrls!.length)}
                  >
                    <div className="relative h-24 w-full overflow-hidden rounded-lg ring-1 ring-black/10">
                      <Image
                        src={safeUrl}
                        alt={`Review image ${i + 1}`}
                        fill
                        sizes="(max-width: 640px) 33vw, 25vw"
                        className="object-cover transition group-hover:brightness-110"
                        unoptimized={canUseUnoptimized(safeUrl)}
                      />
                    </div>
                  </button>
                );
              })}
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
            <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 ring-1 ring-black/5">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-8 text-right text-xs tabular-nums text-gray-500">{pct}%</span>
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
  const t = useTranslations("ProductReviews");

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
  const current = normalizeUrl(urls[index]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="fixed z-[90] rounded-full bg-white/95 p-2 shadow ring-1 ring-black/10 hover:brightness-105"
        aria-label={t("close")}
        style={{
          right: "max(1rem, env(safe-area-inset-right))",
          top: "max(1rem, env(safe-area-inset-top))",
        }}
      >
        <X className="h-5 w-5" />
      </button>

      {urls.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="fixed left-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 shadow ring-1 ring-black/10 hover:brightness-110 sm:inline-flex"
            aria-label={t("previousImage")}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="fixed right-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 shadow ring-1 ring-black/10 hover:brightness-110 sm:inline-flex"
            aria-label={t("nextImage")}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <div className="relative inline-flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <div className="relative h-[70vh] w-[95vw] max-w-[95vw] sm:h-[85vh] sm:w-[85vw]">
            <Image
              src={current}
              alt={t("reviewImage")}
              fill
              className="select-none object-contain"
              sizes="95vw"
              draggable={false}
              unoptimized={canUseUnoptimized(current)}
            />
          </div>

          {urls.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPrev();
                }}
                className="absolute left-2 top-1/2 rounded-full bg-white/90 p-2 shadow ring-1 ring-black/10 hover:brightness-110 sm:hidden"
                aria-label={t("previousImage")}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNext();
                }}
                className="absolute right-2 top-1/2 rounded-full bg-white/90 p-2 shadow ring-1 ring-black/10 hover:brightness-110 sm:hidden"
                aria-label={t("nextImage")}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
        </div>

        {urls.length > 1 && (
          <div className="mt-3 grid w-full grid-cols-6 justify-items-center gap-2 sm:grid-cols-8 md:grid-cols-10">
            {urls.map((u, i) => {
              const safeUrl = normalizeUrl(u);

              return (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className={`overflow-hidden rounded-lg ring-2 ${
                    i === index ? "ring-blue-500" : "ring-transparent"
                  }`}
                  aria-label={t("goToImage", { number: i + 1 })}
                >
                  <div className="relative h-14 w-20">
                    <Image
                      src={safeUrl}
                      alt={`Thumb ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                      draggable={false}
                      unoptimized={canUseUnoptimized(safeUrl)}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MAIN                                                               */
/* ------------------------------------------------------------------ */
export default function ProductReviews({ productId }: { productId: string }) {
  const t = useTranslations("ProductReviews");

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

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxUrls, setLightboxUrls] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filePreviews = useMemo(() => {
    return files.map((file) => ({
      key: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      url: URL.createObjectURL(file),
    }));
  }, [files]);

  useEffect(() => {
    return () => {
      for (const preview of filePreviews) URL.revokeObjectURL(preview.url);
    };
  }, [filePreviews]);

  const timeAgo = useCallback(
    (iso: string) => {
      const d = new Date(iso);
      const diff = Date.now() - d.getTime();
      const s = Math.floor(diff / 1000);

      if (s < 60) return t("secondsAgo", { count: s });
      const m = Math.floor(s / 60);
      if (m < 60) return t("minutesAgo", { count: m });
      const h = Math.floor(m / 60);
      if (h < 24) return t("hoursAgo", { count: h });
      const dd = Math.floor(h / 24);
      if (dd < 30) return t("daysAgo", { count: dd });

      return d.toLocaleDateString();
    },
    [t]
  );

  const openLightbox = useCallback((urls: string[], index: number) => {
    setLightboxUrls(urls);
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  const prevImage = useCallback(() => {
    setLightboxIndex((i) => (i - 1 + lightboxUrls.length) % lightboxUrls.length);
  }, [lightboxUrls.length]);

  const nextImage = useCallback(() => {
    setLightboxIndex((i) => (i + 1) % lightboxUrls.length);
  }, [lightboxUrls.length]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as ReviewsResponse;
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const addFiles = useCallback(
    (incoming: File[]) => {
      const MAX = 4;
      const MAX_MB = 5;
      const errs: string[] = [];

      setFiles((prev) => {
        const cleaned = incoming.filter((f) => {
          const okType = /^image\//.test(f.type);
          const okSize = f.size <= MAX_MB * 1024 * 1024;

          if (!okType) errs.push(t("fileNotImage", { name: f.name }));
          if (!okSize) errs.push(t("fileTooLarge", { name: f.name, size: MAX_MB }));

          return okType && okSize;
        });

        const existingKey = new Set(prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`));
        const unique = cleaned.filter((f) => !existingKey.has(`${f.name}-${f.size}-${f.lastModified}`));

        const next = [...prev, ...unique].slice(0, MAX);

        if (prev.length + unique.length > MAX) {
          errs.push(t("maxImages", { count: MAX }));
        }

        return next;
      });

      if (errs.length) {
        setError(errs.join(" "));
        setTimeout(() => setError(null), 3500);
      }
    },
    [t]
  );

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

    try {
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

      return urls;
    } finally {
      setUploading(false);
    }
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
      setUploadPct(0);
      setOk(true);

      await load();
      setTimeout(() => setOk(false), 800);
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e && "message" in e && typeof (e as { message?: unknown }).message === "string"
          ? (e as { message: string }).message
          : t("somethingWentWrong");

      setError(msg);
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
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-r from-slate-50 via-white to-cyan-50 p-5 ring-1 ring-black/5">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-200/30 blur-3xl"
        />

        <div className="sm:pr-44">
          <h2 className="flex items-center text-lg font-semibold tracking-tight">
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              {t("title")}
            </span>
          </h2>

          <div className="mt-3 flex items-center gap-3 rounded-full border bg-white/70 px-3 py-1 shadow-sm sm:hidden">
            <ReadOnlyStars value={average} />
            <span className="text-sm text-gray-700">
              <span className="font-semibold">{average.toFixed(1)}</span>/5
            </span>
            <span className="text-xs text-gray-500">({total})</span>
          </div>

          <p className="mt-2 text-xs text-gray-600">{t("loginRequired")}</p>
        </div>

        <div className="absolute right-5 top-1/2 hidden -translate-y-1/2 items-center gap-3 rounded-full border bg-white/70 px-3 py-1 shadow-sm sm:flex">
          <ReadOnlyStars value={average} />
          <span className="text-sm text-gray-700">
            <span className="font-semibold">{average.toFixed(1)}</span>/5
          </span>
          <span className="text-xs text-gray-500">({total})</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <form onSubmit={onSubmit} className="relative rounded-3xl border bg-white/80 p-5 shadow-sm ring-1 ring-black/5">
          <Confetti show={ok} />

          <div className="flex items-center justify-between gap-4">
            <div className="text-sm font-medium text-gray-700">{t("yourRating")}</div>
            <div className="rounded-full border bg-white/70 px-3 py-1 text-xs text-gray-600">
              {t("ratingAllowed")}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <SelectStars value={rating} onChange={setRating} />
            <div className="rounded-xl border bg-white/70 px-3 py-1.5 text-xs text-gray-600">
              {t("selected")} <span className="font-semibold">{rating}</span>/5
            </div>
          </div>

          <div className="relative mt-4">
            <div className="pointer-events-none absolute left-3 top-3 text-gray-400">
              <MessageSquare className="h-4 w-4" />
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
              placeholder={t("shareDetails")}
              className="w-full resize-y rounded-2xl border bg-white/80 py-3 pl-10 pr-3 outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={1000}
            />

            <div className="mt-1 text-right text-xs text-gray-400">{comment.length}/1000</div>
          </div>

          <div className="mt-4">
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={[
                "relative block cursor-pointer rounded-2xl border-2 border-dashed px-4 py-5 transition",
                "bg-gradient-to-r from-slate-50/60 to-cyan-50/40",
                dragOver ? "border-blue-500 bg-blue-50/60" : "border-gray-200 hover:border-blue-300",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <UploadCloud className={dragOver ? "h-5 w-5 text-blue-600" : "h-5 w-5 text-gray-500"} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-700">
                    {t("addImages")} <span className="font-normal text-gray-500">{t("imagesOptional")}</span>
                  </div>

                  <div className="mt-1 text-xs text-gray-500">
                    {t("dragDrop")}{" "}
                    <button
                      type="button"
                      onClick={openPicker}
                      className="font-medium text-blue-600 underline decoration-dotted hover:text-blue-700"
                    >
                      {t("browse")}
                    </button>
                    .
                  </div>

                  {filePreviews.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                      {filePreviews.map((preview, i) => (
                        <div key={preview.key} className="group relative">
                          <div className="relative h-24 w-full overflow-hidden rounded-xl ring-1 ring-black/10">
                            <Image
                              src={preview.url}
                              alt="preview"
                              fill
                              sizes="(max-width: 640px) 33vw, 25vw"
                              className="object-cover"
                              unoptimized
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => setFiles((arr) => arr.filter((_, j) => j !== i))}
                            className="absolute -right-2 -top-2 rounded-full bg-white p-1 shadow ring-1 ring-black/10 opacity-90 group-hover:opacity-100"
                            aria-label={t("removeImage")}
                            title={t("remove")}
                          >
                            <X className="h-3.5 w-3.5 text-gray-700" />
                          </button>

                          <div className="mt-1 truncate text-[11px] text-gray-500">{preview.name}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {uploading && (
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100 ring-1 ring-black/5">
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
                    <ImageIcon className="h-4 w-4" /> {t("choose")}
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
              <span>{t("selectedCount", { count: files.length })}</span>
              {error && <span className="text-red-600">{error}</span>}
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              disabled={submitting || rating <= 0 || rating > 5 || uploading}
              className="relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-medium text-white shadow-md transition hover:brightness-110 active:scale-[.98] disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {t("sending")}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> {t("submitReview")}
                </>
              )}
            </button>

            {ok && <span className="text-sm text-emerald-600">{t("thanks")}</span>}
          </div>
        </form>

        <div className="rounded-3xl border bg-white/80 p-5 shadow-sm ring-1 ring-black/5">
          <div className="grid grid-cols-[auto_1fr] items-center gap-5">
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
              <div className="text-sm text-gray-600">{t("distribution")}</div>
              <div className="mt-3">
                <Distribution reviews={reviews} />
              </div>
              <div className="mt-3 text-xs tabular-nums text-gray-500">{t("reviewCount", { count: total })}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border bg-white/80 p-5 shadow-sm ring-1 ring-black/5">
        <div className="flex items-center gap-2 text-base font-semibold">
          <MessageCircle className="h-4 w-4 text-blue-600" />
          {t("recentReviews")}
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-gray-500">{t("loading")}</div>
        ) : reviews.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">{t("noReviews")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100">
            {reviews.map((r) => (
              <ReviewItem
                r={r}
                key={r.id}
                onImageClick={openLightbox}
                timeAgoLabel={timeAgo}
                anonymousLabel={t("anonymous")}
                openImageAria={(index, totalImages) => t("openImageAria", { index, total: totalImages })}
              />
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