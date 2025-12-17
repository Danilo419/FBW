"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

function isExternalUrl(u: string) {
  return /^https?:\/\//i.test(u) || u.startsWith("//");
}
function normalizeUrl(u?: string | null) {
  if (!u) return "";
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}

export default function OrderItemThumb({
  src,
  alt,
  size = 56,
  className = "",
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  const safeSrc = useMemo(() => normalizeUrl(src) || "/placeholder.png", [src]);
  const external = useMemo(() => isExternalUrl(safeSrc), [safeSrc]);
  const [current, setCurrent] = useState(safeSrc);

  useEffect(() => {
    setCurrent(safeSrc);
  }, [safeSrc]);

  if (external) {
    return (
      <div className={className} style={{ width: size, height: size }}>
        <img
          src={current}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => {
            setCurrent((prev) => (prev === "/placeholder.png" ? prev : "/placeholder.png"));
          }}
        />
      </div>
    );
  }

  return (
    <div className={className} style={{ width: size, height: size }}>
      <Image src={safeSrc} alt={alt} fill className="object-cover" sizes={`${size}px`} />
    </div>
  );
}
