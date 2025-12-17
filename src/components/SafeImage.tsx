"use client";

import Image, { type ImageProps } from "next/image";
import React, { useMemo, useState } from "react";

type Props = Omit<ImageProps, "src"> & {
  src: string;
  fallbackSrc?: string;
};

function normalizeUrl(u: string) {
  if (!u) return "";
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}

export default function SafeImage({
  src,
  fallbackSrc = "/placeholder.png",
  alt,
  ...rest
}: Props) {
  const initial = useMemo(() => normalizeUrl(src) || fallbackSrc, [src, fallbackSrc]);
  const [currentSrc, setCurrentSrc] = useState(initial);

  return (
    <Image
      {...rest}
      src={currentSrc}
      alt={alt}
      onError={() => {
        // evita loop infinito se o placeholder também falhar
        setCurrentSrc((prev) => (prev === fallbackSrc ? prev : fallbackSrc));
      }}
    />
  );
}
