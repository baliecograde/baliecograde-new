const THUMBNAIL_SIZE = 160;
const THUMBNAIL_QUALITY = 0.7;

export async function createThumbnailDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, THUMBNAIL_SIZE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is not available');

    context.drawImage(bitmap, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', THUMBNAIL_QUALITY);
  } finally {
    bitmap.close();
  }
}
