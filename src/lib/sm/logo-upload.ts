export const MAX_LOGO_FILE_BYTES = 2 * 1024 * 1024; // 2 MB — Vercel upload limit safe margin

export const LOGO_UPLOAD_HINT =
  "PNG or SVG with a transparent background works best. Keep the file under 2 MB — larger files may fail to upload or appear as a broken image in creatives.";

export const LOGO_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateLogoUpload(input: {
  size: number;
  type: string;
  name?: string;
}): { ok: true } | { ok: false; message: string } {
  const allowedTypes = new Set([
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/svg+xml",
  ]);
  const extOk = Boolean(input.name?.match(/\.(png|jpe?g|webp|svg)$/i));
  if (!allowedTypes.has(input.type) && !extOk) {
    return { ok: false, message: "Use PNG, JPG, WebP, or SVG for your logo." };
  }
  if (input.size === 0) {
    return { ok: false, message: "That file is empty. Choose a different image." };
  }
  if (input.size > MAX_LOGO_FILE_BYTES) {
    return {
      ok: false,
      message: `This file is ${formatFileSize(input.size)}. Logo must be under ${formatFileSize(MAX_LOGO_FILE_BYTES)}. Resize or re-export a smaller version — oversized logos often fail to render in creatives.`,
    };
  }
  return { ok: true };
}

export function validateLogoFile(file: File): { ok: true } | { ok: false; message: string } {
  return validateLogoUpload({
    size: file.size,
    type: file.type,
    name: file.name,
  });
}

export type LogoValidationStatus = "idle" | "checking" | "valid" | "invalid";

export interface LogoValidationState {
  status: LogoValidationStatus;
  url?: string;
  message?: string;
}

/** Decode-check a local file in the browser before upload. */
export async function verifyLocalLogoFile(
  file: File
): Promise<{ ok: true } | { ok: false; message: string }> {
  const check = validateLogoFile(file);
  if (!check.ok) return check;

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (img.naturalWidth < 2 || img.naturalHeight < 2) {
        resolve({
          ok: false,
          message: "This image is too small or empty to use as a logo.",
        });
      } else {
        resolve({ ok: true });
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        ok: false,
        message:
          "This file cannot be displayed as an image. Try PNG or SVG with a transparent background.",
      });
    };
    img.src = objectUrl;
  });
}

/** Confirm a hosted logo URL actually renders (post-upload). */
export async function verifyRemoteLogoUrl(
  url: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth < 2 || img.naturalHeight < 2) {
        resolve({
          ok: false,
          message: "Logo preview failed — the file may be corrupted. Re-upload a PNG or SVG.",
        });
      } else {
        resolve({ ok: true });
      }
    };
    img.onerror = () => {
      resolve({
        ok: false,
        message:
          "Logo could not be loaded. Re-upload a file under 2 MB (PNG or SVG recommended).",
      });
    };
    img.src = url;
  });
}
