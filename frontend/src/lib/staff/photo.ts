/**
 * Staff profile photo helpers.
 *
 * One photo per staff member, used everywhere in UAMS: the admin uploads it
 * once at registration (or later in Edit), and that exact same photo is
 * shown as the staff member's avatar in the staff list and on their details.
 *
 * Hub-sync ruling (2026-10-29): staff records NEVER sync to the Student Hub
 * (only timetable lecturer names do, as plain text), so staff photos are
 * UAMS-only by design. No feed changes needed.
 *
 * Accepted values (same caps as student photos):
 * - A data URL produced by the in-browser photo picker (image/jpeg, png or
 *   webp, base64). The picker downscales to a small square first.
 * - An https:// URL (for example a Supabase Storage public URL), max 2048
 *   characters.
 *
 * Durable home: public.users.avatar_url (TEXT) on the institutional path,
 * mirrored from the student photo pattern. Demo path keeps it on the
 * in-memory staff record.
 */

export const MAX_PHOTO_DATA_URL_LENGTH = 1_000_000;
export const MAX_PHOTO_URL_LENGTH = 2048;

const DATA_URL_PATTERN = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export function isValidStaffPhoto(value: unknown): value is string {
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
 * - string     -> the photo value (caller must validate with isValidStaffPhoto)
 */
export function extractStaffPhoto(body: Record<string, unknown>): string | null | undefined {
  const raw = body.photo_url ?? body.avatar_url ?? body.profile_photo_url ?? body.photoUrl;
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== 'string') return null;
  const v = raw.trim();
  return v === '' ? null : v;
}

/** "Jane Mwangi" -> "JM". Used when a staff member has no photo yet. */
export function initialsForStaffName(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Browser-only: reads an image file, centre-crops it to a square and
 * downscales it to at most 512x512, returning a JPEG data URL.
 */
export async function fileToStaffPhotoDataUrl(file: File): Promise<string> {
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
