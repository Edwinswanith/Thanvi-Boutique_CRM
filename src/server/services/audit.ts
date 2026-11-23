import type { ClientSession } from "mongoose";
import { AuditLog } from "@/models/AuditLog";
import type { Actor } from "@/server/actor";

export interface AuditEntry {
  action: string;
  entity: string;
  entityId?: string;
  reference?: string;
  before?: unknown;
  after?: unknown;
}

const REDACTED_KEYS = new Set(["passwordHash", "password"]);

function redact(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value ?? null;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([k]) => !REDACTED_KEYS.has(k)),
  );
}

export async function writeAudit(actor: Actor | null, entry: AuditEntry, session?: ClientSession): Promise<void> {
  await AuditLog.create(
    [
      {
        actorId: actor?.id ?? null,
        actorName: actor?.name ?? "system",
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? "",
        reference: entry.reference ?? "",
        before: redact(entry.before),
        after: redact(entry.after),
      },
    ],
    { session },
  );
}
