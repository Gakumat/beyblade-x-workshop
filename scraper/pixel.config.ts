// Tunables for the pixel-art look. Change these, then run `npm run pixelate` (add `-- --preview` for a contact sheet).
export const pixelConfig = {
  /** Long edge of the sprite before upscaling, in pixels. Smaller = chunkier. */
  spriteSize: 48,
  /** Nearest-neighbour upscale factor for the stored PNG. */
  upscale: 6,
  /** Max colours per sprite. 16 ≈ SNES sprite, 32 = a little richer. */
  colours: 20,
  /** 'diffusion' = Floyd–Steinberg (libimagequant), 'bayer4' / 'bayer8' = ordered dithering, 'none'. */
  dither: "bayer4" as "diffusion" | "bayer4" | "bayer8" | "none",
  /** Strength of ordered dithering (0–64). */
  bayerSpread: 24,
  /** Diffusion strength for libimagequant (0–1). */
  diffusion: 0.6,
  /** Colour distance from the corner colour that counts as background (0–441). */
  bgThreshold: 38,
  /** Alpha below this becomes fully transparent, above becomes opaque. */
  alphaCutoff: 110,
  /** Draw a 1px dark outline around the sprite, like classic game sprites. */
  outline: true,
  outlineColour: [20, 16, 36] as [number, number, number],
};
export type PixelConfig = typeof pixelConfig;
