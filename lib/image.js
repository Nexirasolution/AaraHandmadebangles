// Cloudinary CDN resizing — no server CPU involved.
// Non-Cloudinary URLs (e.g. /placeholder.png) are returned untouched.
//
//   resizeImage(url, 900)       -> max width 900, WebP/AVIF, auto quality
//   resizeImage(url, 96, 120)   -> exact 96x120 crop (for thumbnails)
export function resizeImage(url, width, height) {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }
  const crop = height ? `c_fill,g_auto,w_${width},h_${height}` : `c_limit,w_${width}`;
  return url.replace('/upload/', `/upload/f_auto,q_auto,${crop}/`);
}

// Ready-made srcSet for a list of widths.
export function buildSrcSet(url, widths) {
  return widths.map((w) => `${resizeImage(url, w)} ${w}w`).join(', ');
}