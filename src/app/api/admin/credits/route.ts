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
    const orRes = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
    });
    if (orRes.ok) {
      const data = (await orRes.json()) as {
        data?: { usage?: number; limit?: number | null };
      };
      const usage = data?.data?.usage ?? null;
      const limit = data?.data?.limit ?? null;
      const remaining = limit !== null && usage !== null ? limit - usage : null;

      if (remaining !== null && remaining < 2) {
        alerts.push({
          service: `OpenRouter (${SIGNALOPS_TM} AI)`,
          status: "critical",
          message: `Credit nearly exhausted: $${remaining.toFixed(2)} remaining. Top up at openrouter.ai/credits`,
        });
      } else if (remaining !== null && remaining < 10) {
        alerts.push({
          service: `OpenRouter (${SIGNALOPS_TM} AI)`,
          status: "low",
          message: `Credit running low: $${remaining.toFixed(2)} remaining. Consider topping up at openrouter.ai/credits`,
        });
      } else {
        const msg =
          remaining !== null
            ? `$${remaining.toFixed(2)} credit remaining`
            : "API key valid";
        alerts.push({
          service: `OpenRouter (${SIGNALOPS_TM} AI)`,
          status: "ok",
          message: msg,
        });
      }
    } else {
      alerts.push({
        service: `OpenRouter (${SIGNALOPS_TM} AI)`,
        status: "critical",
        message: `API key invalid (HTTP ${orRes.status}). Check at openrouter.ai/keys`,
      });
    }
  } catch {
    alerts.push({
      service: `OpenRouter (${SIGNALOPS_TM} AI)`,
      status: "unknown",
      message: "Could not reach OpenRouter API",
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
