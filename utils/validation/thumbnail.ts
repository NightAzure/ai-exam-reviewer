// Allowed raster MIME types for data: URLs — SVG is intentionally excluded
// because it can embed <script> tags and event handlers.
const ALLOWED_DATA_MIME = /^data:image\/(jpeg|jpg|png|gif|webp|avif);base64,/i;

/**
 * Returns true if the value is safe to store as a thumbnail URL.
 * Accepts:
 *   - null / undefined / empty string  (clears the thumbnail)
 *   - https:// URLs
 *   - data:image/<raster type>;base64,... URLs (no SVG)
 */
export const isValidThumbnailUrl = (value: string | null | undefined): boolean => {
  if (!value) return true;

  // Allow safe external URLs only over HTTPS
  if (value.startsWith("https://")) return true;

  // Allow raster data URLs
  if (ALLOWED_DATA_MIME.test(value)) return true;

  return false;
};
