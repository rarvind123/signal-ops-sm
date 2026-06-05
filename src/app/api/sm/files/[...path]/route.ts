import { NextResponse } from "next/server";
import path from "path";
import { readSmFile } from "@/lib/sm/file-storage";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { path: segments } = await context.params;
    const relativePath = segments.join("/");
    const ext = path.extname(relativePath).toLowerCase();
    const contentType =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".webp"
            ? "image/webp"
            : "application/octet-stream";

    const bytes = await readSmFile(relativePath);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "File not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
