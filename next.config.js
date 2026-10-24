/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-hosting: `next build` produces .next/standalone with only the files
  // needed to run, so the server starts fast and uses less memory.
  // Start it with: node .next/standalone/server.js
  output: 'standalone',

  // Gzip responses (turn off if Nginx / Cloudflare already compresses for you).
  compress: true,

  // Don't advertise "X-Powered-By: Next.js".
  poweredByHeader: false,

  images: {
    // Skip Next's built-in image resizer. On your own server every image
    // would be resized by sharp using your CPU. Images are served as they are
    // (use Cloudinary URL transforms for sizing instead).
    // This also removes the old wildcard `hostname: '**'` patterns, which let
    // anyone use your server as a free image-resizing proxy.
    unoptimized: true,
  },

  eslint: { ignoreDuringBuilds: true },

  async headers() {
    return [
      {
        // Static images / fonts in /public: cache for a day, then refresh in
        // the background. (/_next/static is already cached forever by Next.)
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff2)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;