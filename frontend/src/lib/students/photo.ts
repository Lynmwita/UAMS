/**
 * Student profile photo helpers.
 *
 * One photo, used everywhere: the registrar uploads (or pastes a URL for) a
 * student's profile photo once, and that exact same photo is shown as the
 * student's avatar in the registry list AND printed on their Student ID Card
 * (on-screen preview and downloaded PDF).
 *
 * Accepted values:
 * - A data URL produced by the in-browser photo picker (image/jpeg, png or
 *   webp, base64). The picker downscales to a small square first, so these
 *   stay well under the cap below.
 * - An https:// URL (for example a Supabase Storage public URL), max 2048
 *   characters.
 */

export const MAX_PHOTO_DATA_URL_LENGTH = 1_000_000;
export const MAX_PHOTO_URL_LENGTH = 2048;

const DATA_URL_PATTERN = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export function isValidStudentPhoto(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (!v) return false;
  if (v.startsWith('data:image/')) {
    return v.length <= MAX_PHOTO_DATA_URL_LENGTH && DATA_URL_PATTERN.test(v);
  }
  if (v.startsWith('https://')) {
    return v.length <= MAX_PHOTO_URL_LENGTH && !/\s/.test(v);
  }
  return false;
}

/**
 * Reads the photo out of a request / form body.
 * Returns:
 * - undefined  -> no photo field was provided (leave any existing photo alone)
 * - null       -> photo field was provided empty (remove the photo)
 * - string     -> the photo value (caller must validate with isValidStudentPhoto)
 */
export function extractStudentPhoto(body: Record<string, unknown>): string | null | undefined {
  const raw = body.photo_url ?? body.avatar_url ?? body.profile_photo_url ?? body.photoUrl;
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== 'string') return null;
  const v = raw.trim();
  return v === '' ? null : v;
}

/** "Faith Wanjiku" -> "FW". Used when a student has no photo yet. */
export function initialsForName(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Browser-only: reads an image file, centre-crops it to a square and
 * downscales it to at most 512x512, returning a JPEG data URL.
 * This keeps one small photo that is fast to store, sync and print.
 */
export async function fileToStudentPhotoDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (JPG or PNG).');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('That photo is too large. Please choose one under 10 MB.');
  }
  const bitmap = await createImageBitmap(file);
  const size = Math.min(bitmap.width, bitmap.height, 512);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not process that photo.');
  const sx = (bitmap.width - Math.min(bitmap.width, bitmap.height)) / 2;
  const sy = (bitmap.height - Math.min(bitmap.width, bitmap.height)) / 2;
  const side = Math.min(bitmap.width, bitmap.height);
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Browser-only: captures the current frame from an HTMLVideoElement, centre-crops
 * to a square, downscales to at most 512x512, and returns a JPEG data URL.
 */
export function captureVideoFrameToDataUrl(video: HTMLVideoElement): string {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) {
    throw new Error('Camera stream is not ready yet. Please wait a moment and try again.');
  }
  const size = Math.min(w, h, 512);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not capture the photo.');
  const side = Math.min(w, h);
  const sx = (w - side) / 2;
  const sy = (h - side) / 2;
  ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.88);
}

// Aliases for unified staff and student photo helpers
export const isValidPhoto = isValidStudentPhoto;
export const fileToPhotoDataUrl = fileToStudentPhotoDataUrl;
export const extractPhoto = extractStudentPhoto;

