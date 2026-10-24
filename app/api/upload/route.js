import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

// ── Limits ────────────────────────────────────────────────────────────────
const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // phone photos can be 8–12 MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // videos are buffered in memory — keep modest
const MAX_IMAGE_WIDTH = 1920;             // matches the recommended banner width
const WEBP_QUALITY = 80;
const MAX_INPUT_PIXELS = 80_000_000;      // guards against decompression bombs

// These stay as uploaded (re-encoding would break animation / vector data).
const PASSTHROUGH_IMAGES = new Set(['image/gif', 'image/svg+xml']);

// One long-lived client, created once per server process.
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// sharp is loaded once, lazily. If it isn't installed the route still works
// and uploads the original file (run `npm i sharp` to enable compression).
let sharpPromise;
function getSharp() {
  if (!sharpPromise) {
    sharpPromise = import('sharp').then((m) => m.default || m).catch(() => null);
  }
  return sharpPromise;
}

function safeExt(name) {
  return name?.includes('.')
    ? name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5)
    : '';
}

export async function POST(req) {
  let formData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid upload' }, { status: 400 });
  }

  const file = formData.get('file');
  const rawFolder = formData.get('folder') || 'uploads';

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file' }, { status: 400 });
  }

  const type = file.type || '';
  const isImage = type.startsWith('image/');
  const isVideo = type.startsWith('video/');

  if (!isImage && !isVideo) {
    return NextResponse.json({ error: 'Only images and videos can be uploaded' }, { status: 415 });
  }

  // Check the size BEFORE reading the file into memory.
  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File too large (max ${Math.round(maxBytes / 1024 / 1024)} MB)` },
      { status: 413 }
    );
  }

  // Keep the folder to safe path characters (no "..", no leading/trailing slashes)
  const folder = String(rawFolder)
    .replace(/[^a-zA-Z0-9/_-]/g, '')
    .split('/')
    .filter(Boolean)
    .join('/') || 'uploads';

  let body = Buffer.from(await file.arrayBuffer());
  let contentType = type || 'application/octet-stream';
  let ext = safeExt(file.name);

  // ── Compress images: resize to max width, fix phone rotation, convert to WebP.
  // A 5 MB phone photo typically becomes ~150–300 KB, which is what makes the
  // storefront fast. Done once at upload so the server never does it per visit.
  if (isImage && !PASSTHROUGH_IMAGES.has(type)) {
    const sharp = await getSharp();
    if (sharp) {
      try {
        body = await sharp(body, { failOn: 'none', limitInputPixels: MAX_INPUT_PIXELS })
          .rotate() // apply EXIF orientation, then strip metadata (incl. GPS)
          .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
          .webp({ quality: WEBP_QUALITY })
          .toBuffer();
        contentType = 'image/webp';
        ext = 'webp';
      } catch (err) {
        console.error('Image processing failed:', err);
        return NextResponse.json({ error: 'Invalid or unsupported image' }, { status: 400 });
      }
    }
  }

  // R2 serves objects by exact key, so keep the extension on everything.
  const key = `${folder}/${randomUUID()}${ext ? `.${ext}` : ''}`;

  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
        // The key is a random UUID and is never overwritten, so browsers and
        // Cloudflare's CDN can cache it for a year without re-checking.
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    return NextResponse.json({
      url: `${process.env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`,
      publicId: key, // same shape as before; this is the object key
    });
  } catch (err) {
    console.error('R2 upload failed:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}