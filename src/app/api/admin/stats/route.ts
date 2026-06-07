import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

const COST_PER_IMAGE_USD = 0.04;
const COST_PER_SIGNALOPS_USD = 0.02;

const ADMIN_KEY = "Mumbai";

export async function GET(req: Request) {
  const auth = req.headers.get("x-admin-key");
  if (auth !== ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();

  const { data: assets } = await supabase
    .from("sm_generated_assets")
    .select("id, status, created_at, request_id")
    .eq("status", "done");

  const { data: requests } = await supabase
    .from("sm_creative_requests")
    .select("id, client_id, created_at, status");

  const { data: clients } = await supabase
    .from("sm_clients")
    .select("id, name, created_at");

  const { data: perClientRaw } = await supabase
    .from("sm_generated_assets")
    .select(
      `
      id,
      status,
      sm_creative_requests!inner(client_id)
    `
    )
    .eq("status", "done");

  const clientMap: Record<
    string,
    { name: string; images: number; signalops_runs: number }
  > = {};

  (clients ?? []).forEach((c) => {
    clientMap[c.id] = { name: c.name, images: 0, signalops_runs: 0 };
  });

  (perClientRaw ?? []).forEach((a) => {
    const row = a as {
      sm_creative_requests?: { client_id?: string } | { client_id?: string }[];
    };
    const rel = row.sm_creative_requests;
    const clientId = Array.isArray(rel) ? rel[0]?.client_id : rel?.client_id;
    if (clientId && clientMap[clientId]) {
      clientMap[clientId].images += 1;
    }
  });

  (requests ?? []).forEach((r) => {
    if (r.client_id && clientMap[r.client_id]) {
      clientMap[r.client_id].signalops_runs += 1;
    }
  });

  const totalImages = (assets ?? []).length;
  const totalRequests = (requests ?? []).length;
  const totalClients = (clients ?? []).length;

  const totalImageCost = totalImages * COST_PER_IMAGE_USD;
  const totalSignalopsCost = totalRequests * COST_PER_SIGNALOPS_USD;
  const totalCost = totalImageCost + totalSignalopsCost;

  const clientStats = Object.entries(clientMap)
    .map(([id, data]) => ({
      client_id: id,
      name: data.name,
      images_generated: data.images,
      signalops_runs: data.signalops_runs,
      estimated_cost_usd: (
        data.images * COST_PER_IMAGE_USD +
        data.signalops_runs * COST_PER_SIGNALOPS_USD
      ).toFixed(2),
    }))
    .sort((a, b) => b.images_generated - a.images_generated);

  return NextResponse.json({
    summary: {
      total_clients: totalClients,
      total_images_generated: totalImages,
      total_signalops_runs: totalRequests,
      total_cost_usd: totalCost.toFixed(2),
      image_cost_usd: totalImageCost.toFixed(2),
      signalops_cost_usd: totalSignalopsCost.toFixed(2),
    },
    per_client: clientStats,
  });
}
