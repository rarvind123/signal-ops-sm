import "server-only";

import { fal } from "@fal-ai/client";

let configured = false;

export function isFalConfigured(): boolean {
  return Boolean(process.env.FAL_KEY?.trim() || process.env.FAL_API_KEY?.trim());
}

export function getFalKey(): string {
  const key = process.env.FAL_KEY?.trim() || process.env.FAL_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "FAL_KEY is not set. Add it to .env.local and Vercel env vars for image generation."
    );
  }
  return key;
}

export function configureFal(): void {
  if (configured) return;
  fal.config({ credentials: getFalKey() });
  configured = true;
}

export { fal };
