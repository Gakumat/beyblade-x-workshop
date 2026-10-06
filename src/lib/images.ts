// Public URL for a stored image path like "pixel/dran-sword-blade.png".
// With Supabase: the public 'parts' bucket. Without (local dev): served from .cache/img by /dev-img.
export function imgUrl(p: string | null | undefined): string | null {
  if (!p) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base}/storage/v1/object/public/parts/${p}` : `/dev-img/${p}`;
}
