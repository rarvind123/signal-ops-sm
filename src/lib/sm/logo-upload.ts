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
