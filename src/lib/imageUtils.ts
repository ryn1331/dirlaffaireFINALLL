/**
 * Client-side image compression & WebP conversion
 * - Resizes to max 1200px (main) or 400px (thumbnail)
 * - Converts to WebP with quality control
 * - Keeps output under ~250 KB
 */

interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "webp" | "jpeg";
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<{ blob: Blob; width: number; height: number }> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.82,
    format = "webp",
  } = options;

  const img = await loadImage(file);

  let { width, height } = img;

  // Scale down proportionally
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d")!;
  // Smooth scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);

  const mimeType = format === "webp" ? "image/webp" : "image/jpeg";

  // Try at target quality, reduce if still too large
  let currentQuality = quality;
  let blob: Blob;

  do {
    blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b!),
        mimeType,
        currentQuality
      );
    });
    currentQuality -= 0.08;
  } while (blob.size > 300 * 1024 && currentQuality > 0.3);

  return { blob, width, height };
}

export async function compressThumbnail(file: File): Promise<Blob> {
  const { blob } = await compressImage(file, {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.7,
    format: "webp",
  });
  return blob;
}

/**
 * Full upload pipeline:
 * 1. Compress to WebP (max 1200px, <300KB)
 * 2. Generate thumbnail (400px)
 * 3. Upload both to storage
 * Returns the main image path
 */
export async function processAndUploadImage(
  file: File,
  bucket: string,
  folder: string,
  uploadFn: (path: string, blob: Blob, contentType: string) => Promise<void>
): Promise<string> {
  const timestamp = Date.now();
  const mainPath = `${folder}/${timestamp}.webp`;
  const thumbPath = `${folder}/${timestamp}_thumb.webp`;

  // Process in parallel
  const [main, thumb] = await Promise.all([
    compressImage(file),
    compressThumbnail(file),
  ]);

  // Upload in parallel
  await Promise.all([
    uploadFn(mainPath, main.blob, "image/webp"),
    uploadFn(thumbPath, thumb, "image/webp"),
  ]);

  return mainPath;
}
