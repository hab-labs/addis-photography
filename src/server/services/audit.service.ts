import { db } from "../db/client";

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  user_name: string;
  action: string;
  entity: string;
  entity_id: string;
  details: Record<string, any>;
  ip_address: string | null;
  created_at: string;
}

export async function logAudit(
  actor: { id?: string | null; name: string },
  action: string,
  entity: string,
  entityId: string,
  details: Record<string, any> = {},
  ipAddress: string | null = null
): Promise<void> {
  const logId = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  await db.query(
    `INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details, ip_address, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
    [
      logId,
      actor.id || null,
      actor.name,
      action,
      entity,
      entityId,
      JSON.stringify(details),
      ipAddress,
    ]
  );
}

export async function getAuditLogs(limit: number = 100): Promise<AuditLogEntry[]> {
  const res = await db.query(
    `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return res.rows.map((row) => ({
    ...row,
    details: typeof row.details === "string" ? JSON.parse(row.details) : row.details,
  }));
}

export const auditService = {
  log: async (params: {
    user_id?: string | null;
    user_name?: string;
    action: string;
    entity_type?: string;
    entity?: string;
    entity_id: string;
    details?: Record<string, any>;
    ip_address?: string | null;
  }) => {
    return logAudit(
      { id: params.user_id, name: params.user_name || "System" },
      params.action,
      params.entity_type || params.entity || "system",
      params.entity_id,
      params.details || {},
      params.ip_address || null
    );
  },
  getLogs: async (filters?: { user_id?: string; action?: string; limit?: number; offset?: number }) => {
    return getAuditLogs(filters?.limit || 100);
  },
};

