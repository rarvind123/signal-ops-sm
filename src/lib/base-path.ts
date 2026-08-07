/** App mount path on inventious.co (empty locally). Set NEXT_PUBLIC_BASE_PATH=/admode in production. */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

export function withBasePath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!BASE_PATH) return normalized;
  return `${BASE_PATH}${normalized}`;
}

export function apiUrl(path: string): string {
  return withBasePath(path.startsWith("/api") ? path : `/api${path.startsWith("/") ? path : `/${path}`}`);
}
