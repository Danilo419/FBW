"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type Slide = { src: string; alt?: string; href?: string };

export default function HeroCarousel({
  slides,
  aspect = "aspect-[16/9]",        // keep layout stable
  intervalMs = 4000,                // autoplay speed
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
    () => (slides?.length ? slides : [{ src: "/placeholder.png", alt: "placeholder" }]),
    [slides]
  );
  const [index, setIndex] = useState(0);
  const nextIndex = (index + 1) % safeSlides.length;

  // crossfade layers
  const [aSrc, setASrc] = useState(safeSlides[0].src);
  const [bSrc, setBSrc] = useState<string | null>(safeSlides[1]?.src ?? null);
  const [showB, setShowB] = useState(false);

  // autoplay
  useEffect(() => {
    if (safeSlides.length <= 1) return;
    const t = setInterval(() => go(nextIndex), intervalMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, safeSlides.length, intervalMs]);

  // preload + fade to target slide
  const go = (target: number) => {
    if (target === index) return;
    const targetSrc = safeSlides[target].src;
    const img = new window.Image();
    img.src = targetSrc;
    img.onload = () => {
      // choose layer to update
      if (showB) setASrc(targetSrc);
      else setBSrc(targetSrc);
      requestAnimationFrame(() => {
        setShowB((v) => !v);
        setIndex(target);
      });
    };
  };

  // manual navigation
  const prev = () => go((index - 1 + safeSlides.length) % safeSlides.length);
  const next = () => go((index + 1) % safeSlides.length);

  const current = safeSlides[index];
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    current.href ? (
      <a href={current.href} aria-label={current.alt || "slide link"}>
        {children}
      </a>
    ) : (
      <>{children}</>
    );

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl ${className}`}>
      {/* fixed aspect stops layout shift */}
      <div className={`relative w-full ${aspect}`}>
        {/* layer A */}
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

        {/* layer B */}
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

        {/* controls */}
        {safeSlides.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous slide"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-white hover:bg-black/60"
            >
              ‹
            </button>
            <button
              onClick={next}
              aria-label="Next slide"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-white hover:bg-black/60"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* dots */}
      {showDots && safeSlides.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
          {safeSlides.map((_, i) => (
            <button
              key={i}
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
