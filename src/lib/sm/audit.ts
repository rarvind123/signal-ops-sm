import "server-only";

import { supabase } from "@/lib/supabase";
import type { SMAuditEvent } from "@/types/sm";

function mapAuditEvent(row: Record<string, unknown>): SMAuditEvent {
  return {
    id: String(row.id),
    entity_type: String(row.entity_type),
    entity_id: String(row.entity_id),
    action: String(row.action),
    actor: row.actor ? String(row.actor) : undefined,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: String(row.created_at),
  };
}

export async function logAuditEvent(input: {
  entity_type: string;
  entity_id: string;
  action: string;
  actor?: string;
  metadata?: Record<string, unknown>;
}): Promise<SMAuditEvent | null> {
  try {
    const { data, error } = await supabase
      .from("sm_audit_events")
      .insert({
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        action: input.action,
        actor: input.actor ?? null,
        metadata: input.metadata ?? {},
      })
      .select("*")
      .single();
    if (error) {
      console.warn("[audit] log failed:", error.message);
      return null;
    }
    return mapAuditEvent(data as Record<string, unknown>);
  } catch (e) {
    console.warn("[audit] log failed:", e);
    return null;
  }
}

export async function listAuditEvents(
  entityType: string,
  entityId: string,
  limit = 50
): Promise<SMAuditEvent[]> {
  const { data, error } = await supabase
    .from("sm_audit_events")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("[audit] list failed:", error.message);
    return [];
  }
  return (data ?? []).map((row) => mapAuditEvent(row as Record<string, unknown>));
}
