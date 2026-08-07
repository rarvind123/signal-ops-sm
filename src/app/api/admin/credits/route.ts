import { NextResponse } from "next/server";
import { SIGNALOPS_TM } from "@/lib/sm/ui";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

const ADMIN_KEY = "Mumbai";

type AlertStatus = "ok" | "low" | "critical" | "unknown";

type ServiceAlert = {
  service: string;
  status: AlertStatus;
  message: string;
};

export async function GET(req: Request) {
  const auth = req.headers.get("x-admin-key");
  if (auth !== ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alerts: ServiceAlert[] = [];

  try {
    const replicateRes = await fetch("https://api.replicate.com/v1/account", {
      headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` },
    });
    if (replicateRes.ok) {
      alerts.push({
        service: "Replicate (FLUX)",
        status: "ok",
        message: "API key valid. Check billing at replicate.com/account/billing",
      });
    } else {
      alerts.push({
        service: "Replicate (FLUX)",
        status: "critical",
        message: `API key invalid or expired (HTTP ${replicateRes.status}). Renew at replicate.com/account/api-tokens`,
      });
    }
  } catch {
    alerts.push({
      service: "Replicate (FLUX)",
      status: "unknown",
      message: "Could not reach Replicate API",
    });
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (apiKey) {
      alerts.push({
        service: `Anthropic (${SIGNALOPS_TM} AI)`,
        status: "ok",
        message: "API key configured. Check usage at console.anthropic.com",
      });
    } else {
      alerts.push({
        service: `Anthropic (${SIGNALOPS_TM} AI)`,
        status: "critical",
        message: "ANTHROPIC_API_KEY is not set in environment variables",
      });
    }
  } catch {
    alerts.push({
      service: `Anthropic (${SIGNALOPS_TM} AI)`,
      status: "unknown",
      message: "Could not check Anthropic configuration",
    });
  }

  try {
    const { data: buckets, error } = await getSupabase().storage.listBuckets();
    if (error) throw error;
    const smBucket = buckets?.find((b) => b.name === "sm-assets");
    alerts.push({
      service: "Supabase Storage",
      status: smBucket ? "ok" : "critical",
      message: smBucket ? "sm-assets bucket active" : "sm-assets bucket not found",
    });
  } catch {
    alerts.push({
      service: "Supabase Storage",
      status: "unknown",
      message: "Could not check storage",
    });
  }

  return NextResponse.json({ alerts });
}
