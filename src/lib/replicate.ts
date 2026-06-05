import "server-only";

import Replicate from "replicate";

let client: Replicate | null = null;

export function isReplicateConfigured(): boolean {
  return Boolean(process.env.REPLICATE_API_TOKEN?.trim());
}

export function getReplicate(): Replicate {
  const token = process.env.REPLICATE_API_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "REPLICATE_API_TOKEN is not set. Add it to .env.local for SM image generation."
    );
  }
  if (!client) client = new Replicate({ auth: token });
  return client;
}

export const replicate = getReplicate;
