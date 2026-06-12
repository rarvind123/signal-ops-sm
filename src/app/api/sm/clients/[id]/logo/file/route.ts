import { NextResponse } from "next/server";
import { readSmFile, relativePathFromPublicUrl } from "@/lib/sm/file-storage";
import { firstValidLogoUrl, resolveLogoFromSet } from "@/lib/sm/logo-url";
import { smRouteHandler } from "@/lib/sm/api-auth";
import { getClient, getClientLogoUrl } from "@/lib/sm/store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

async function loadLogoBytes(url: string): Promise<Buffer | null> {
  const relative = relativePathFromPublicUrl(url);
  if (relative) {
    try {
      return await readSmFile(relative);
    } catch {
      return null;
    }
  }
  if (!url.startsWith("http")) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function GET(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const client = await getClient(id);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const brightnessRaw = searchParams.get("brightness");
    const brightness = brightnessRaw ? Number(brightnessRaw) : undefined;
    const format = searchParams.get("format") ?? undefined;

    const candidates: (string | null | undefined)[] = [
      resolveLogoFromSet(client.logos, {
        format,
        brightness: Number.isFinite(brightness) ? brightness : undefined,
      }),
      await getClientLogoUrl(id),
      client.logos?.primary,
      client.logo_url,
      client.logos?.dark,
      client.logos?.white,
      client.logos?.symbol,
    ];

    let bytes: Buffer | null = null;
    for (const url of candidates) {
      if (!firstValidLogoUrl(url)) continue;
      bytes = await loadLogoBytes(url);
      if (bytes) break;
    }

    if (!bytes) {
      return NextResponse.json({ error: "Logo not found" }, { status: 404 });
    }

    const contentType =
      bytes[0] === 0x89 && bytes[1] === 0x50
        ? "image/png"
        : bytes[0] === 0xff && bytes[1] === 0xd8
          ? "image/jpeg"
          : bytes[0] === 0x3c || (bytes[0] === 0xef && bytes[1] === 0xbb)
            ? "image/svg+xml"
            : "image/png";

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  });
}
