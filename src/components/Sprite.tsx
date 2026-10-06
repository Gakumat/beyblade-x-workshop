import { imgUrl } from "@/lib/images";

/** A baked pixel-art sprite, or a "?" block when there's no image. */
export function Sprite({ src, alt, size = 96, className = "" }: { src: string | null; alt: string; size?: number; className?: string }) {
  const url = imgUrl(src);
  if (!url)
    return (
      <div
        className={`grid place-items-center bg-muted text-muted-foreground font-display ${className}`}
        style={{ width: size, height: size, fontSize: size / 3 }}
        aria-label={alt}
      >
        ?
      </div>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} width={size} height={size} loading="lazy" className={`sprite object-contain ${className}`} style={{ width: size, height: size }} />;
}
