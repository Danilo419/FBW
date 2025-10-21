import Image, { ImageProps } from "next/image";
import { resolveImage } from "@/lib/resolveImage";

/**
 * Componente global que resolve automaticamente imagens .webp
 * e usa /placeholder.png se faltar algo.
 */
export default function FWImage({ src, alt, ...rest }: Omit<ImageProps, "src"> & { src: string | null | undefined }) {
  const resolved = resolveImage(src ?? "/placeholder.png");
  return <Image src={resolved} alt={alt} {...rest} />;
}
