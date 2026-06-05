import { NextResponse } from "next/server";
import { smRouteHandler } from "@/lib/sm/api-auth";
import { saveSmUpload } from "@/lib/sm/file-storage";
import { getClient } from "@/lib/sm/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return smRouteHandler(req, async () => {
    const formData = await req.formData();
    const file = formData.get("file");
    const clientId = String(formData.get("client_id") ?? "").trim();

    if (!(file instanceof File)) {
      throw new Error("file is required");
    }
    if (!clientId) {
      throw new Error("client_id is required");
    }

    const client = await getClient(clientId);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const saved = await saveSmUpload(clientId, file, "brief");
    return { url: saved.publicUrl, metadata: saved.metadata };
  });
}
