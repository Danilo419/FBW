"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

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
  const [imgSrc, setImgSrc] = useState(safeSrc);

  const finalSrc = imgSrc || "/placeholder.png";
  const external = isExternalUrl(finalSrc);

  return (
    <div
      className={className}
      style={{ width: size, height: size, position: "relative" }}
    >
      <Image
        src={finalSrc}
        alt={alt}
        fill
        className="object-cover"
        sizes={`${size}px`}
        unoptimized={external}
        onError={() => {
          setImgSrc((prev) => (prev === "/placeholder.png" ? prev : "/placeholder.png"));
        }}
      />
    </div>
  );
}