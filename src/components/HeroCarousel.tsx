"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

type Slide = {
  src: string;
  alt?: string;
  href?: string;
};

export default function HeroCarousel({
  slides,
  aspect = "aspect-[16/9]",
  intervalMs = 4000,
  showDots = true,
  className = "",
}: {
  slides: Slide[];
  aspect?: string;
  intervalMs?: number;
  showDots?: boolean;
  className?: string;
}) {
  const safeSlides = useMemo(
    () =>
      slides?.length
        ? slides
        : [{ src: "/placeholder.png", alt: "placeholder" }],
    [slides]
  );

  const [index, setIndex] = useState(0);

  /* ---------------- crossfade layers ---------------- */

  const [aSrc, setASrc] = useState(safeSlides[0].src);
  const [bSrc, setBSrc] = useState<string | null>(safeSlides[1]?.src ?? null);
  const [showB, setShowB] = useState(false);

  /* ---------------- keep state in sync if slides change ---------------- */

  useEffect(() => {
    setIndex(0);
    setASrc(safeSlides[0].src);
    setBSrc(safeSlides[1]?.src ?? null);
    setShowB(false);
  }, [safeSlides]);

  /* ---------------- navigation ---------------- */

  const go = useCallback(
    (target: number) => {
      if (target === index) return;

      const targetSrc = safeSlides[target]?.src;
      if (!targetSrc) return;

      const img = new window.Image();
      img.src = targetSrc;

      img.onload = () => {
        if (showB) setASrc(targetSrc);
        else setBSrc(targetSrc);

        requestAnimationFrame(() => {
          setShowB((v) => !v);
          setIndex(target);
        });
      };
    },
    [index, safeSlides, showB]
  );

  const prev = useCallback(() => {
    go((index - 1 + safeSlides.length) % safeSlides.length);
  }, [go, index, safeSlides.length]);

  const next = useCallback(() => {
    go((index + 1) % safeSlides.length);
  }, [go, index, safeSlides.length]);

  /* ---------------- autoplay ---------------- */

  useEffect(() => {
    if (safeSlides.length <= 1) return;

    const timer = setInterval(() => {
      go((index + 1) % safeSlides.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [go, index, intervalMs, safeSlides.length]);

  const current = safeSlides[index];

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    current.href ? (
      <a href={current.href} aria-label={current.alt || "slide link"}>
        {children}
      </a>
    ) : (
      <>{children}</>
    );

  /* ---------------- render ---------------- */

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl ${className}`}>
      <div className={`relative w-full ${aspect}`}>
        {/* Layer A */}
        <Wrapper>
          <Image
            key={`A-${aSrc}`}
            src={aSrc}
            alt={current.alt ?? ""}
            fill
            priority
            sizes="(min-width: 1024px) 1200px, 100vw"
            className={`object-cover transition-opacity duration-500 ${
              showB ? "opacity-0" : "opacity-100"
            }`}
          />
        </Wrapper>

        {/* Layer B */}
        {bSrc && (
          <Wrapper>
            <Image
              key={`B-${bSrc}`}
              src={bSrc}
              alt={current.alt ?? ""}
              fill
              sizes="(min-width: 1024px) 1200px, 100vw"
              className={`object-cover transition-opacity duration-500 ${
                showB ? "opacity-100" : "opacity-0"
              }`}
            />
          </Wrapper>
        )}

        {/* Controls */}
        {safeSlides.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous slide"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-white hover:bg-black/60"
            >
              ‹
            </button>

            <button
              type="button"
              onClick={next}
              aria-label="Next slide"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-white hover:bg-black/60"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Dots */}
      {showDots && safeSlides.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
          {safeSlides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => go(i)}
              className={`h-2 w-2 rounded-full transition ${
                i === index ? "bg-white" : "bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}