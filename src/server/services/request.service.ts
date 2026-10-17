import { db } from "../db/client";
import { logAudit } from "./audit.service";
import { getCustomerById } from "./customer.service";

export interface RequestRecord {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string | null;
  order_id: string | null;
  description: string;
  status: "Received" | "In Progress" | "Ready" | "Delivered" | "Cancelled";
  due_date: string;
  is_overdue: boolean;
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export async function listRequests(filters?: {
  status?: string;
  overdue_only?: boolean;
}): Promise<RequestRecord[]> {
  const res = await db.query(
    `SELECT r.*, c.name as customer_name, c.phone as customer_phone,
            ua.name as assigned_to_name, uc.name as created_by_name
     FROM requests r
     JOIN customers c ON r.customer_id = c.id
     JOIN users uc ON r.created_by = uc.id
     LEFT JOIN users ua ON r.assigned_to = ua.id
     ORDER BY r.due_date ASC`
  );

  const now = Date.now();

  let records: RequestRecord[] = res.rows.map((row) => {
    const isTerminal = row.status === "Delivered" || row.status === "Cancelled";
    const dueTime = new Date(row.due_date).getTime();
    const isOverdue = !isTerminal && dueTime < now;

    return {
      id: row.id,
      customer_id: row.customer_id,
      customer_name: row.customer_name,
      customer_phone: row.customer_phone,
      order_id: row.order_id,
      description: row.description,
      status: row.status,
      due_date: row.due_date,
      is_overdue: isOverdue,
      assigned_to: row.assigned_to,
      assigned_to_name: row.assigned_to_name,
      created_by: row.created_by,
      created_by_name: row.created_by_name,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });

  if (filters?.status && filters.status !== "all") {
    records = records.filter((r) => r.status.toLowerCase() === filters.status!.toLowerCase());
  }

  if (filters?.overdue_only) {
    records = records.filter((r) => r.is_overdue);
  }

  return records;
}

export async function createRequest(
  input: {
    customer_id: string;
    order_id?: string | null;
    description: string;
    due_date: string;
    assigned_to?: string | null;
  },
  actor: { id: string; name: string }
): Promise<RequestRecord> {
  const customer = await getCustomerById(input.customer_id);
  if (!customer) throw new Error("Customer not found.");

  const cleanDesc = input.description.trim();
  if (!cleanDesc) throw new Error("Request description is required.");

  const reqId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  await db.query(
    `INSERT INTO requests (id, customer_id, order_id, description, status, due_date, assigned_to, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'Received', $5, $6, $7, NOW(), NOW())`,
    [
      reqId,
      input.customer_id,
      input.order_id || null,
      cleanDesc,
      input.due_date,
      input.assigned_to || null,
      actor.id,
    ]
  );

  await logAudit(actor, "REQUEST_CREATED", "Request", reqId, {
    customer: customer.name,
    description: cleanDesc,
  });

  const list = await listRequests();
  return list.find((r) => r.id === reqId)!;
}

export async function updateRequestStatus(
  id: string,
  newStatus: RequestRecord["status"],
  actor: { id: string; name: string }
): Promise<RequestRecord> {
  const list = await listRequests();
  const existing = list.find((r) => r.id === id);
  if (!existing) throw new Error("Request not found.");

  await db.query(
    `UPDATE requests SET status = $1, updated_at = NOW() WHERE id = $2`,
    [newStatus, id]
  );

  await logAudit(actor, "REQUEST_STATUS_UPDATED", "Request", id, {
    old_status: existing.status,
    new_status: newStatus,
  });

  const updatedList = await listRequests();
  return updatedList.find((r) => r.id === id)!;
}

export async function getRequestById(id: string): Promise<RequestRecord | null> {
  const list = await listRequests();
  return list.find((r) => r.id === id) || null;
}

export async function updateRequest(
  id: string,
  input: any,
  actor: { id: string; name: string }
): Promise<RequestRecord> {
  const existing = await getRequestById(id);
  if (!existing) throw new Error("Request not found.");

  const desc = input.description !== undefined ? input.description.trim() : existing.description;
  const status = input.status || existing.status;
  const dueDate = input.due_date || existing.due_date;
  const assignedTo = input.assigned_to !== undefined ? input.assigned_to : existing.assigned_to;

  await db.query(
    `UPDATE requests SET description = $1, status = $2, due_date = $3, assigned_to = $4, updated_at = NOW() WHERE id = $5`,
    [desc, status, dueDate, assignedTo, id]
  );

  await logAudit(actor, "REQUEST_UPDATED", "Request", id, { status, desc });
  return (await getRequestById(id))!;
}

export async function deleteRequest(
  id: string,
  actor: { id: string; name: string }
): Promise<{ success: boolean }> {
  await db.query("DELETE FROM requests WHERE id = $1", [id]);
  await logAudit(actor, "REQUEST_DELETED", "Request", id, {});
  return { success: true };
}

export const requestService = {
  listRequests: async (filters: any) => {
    return listRequests(filters);
  },
  getRequestById,
  createRequest: async (input: any, userIdOrActor?: string | { id: string; name: string }) => {
    const actor = typeof userIdOrActor === "string" ? { id: userIdOrActor, name: "Staff" } : (userIdOrActor || { id: "system", name: "Staff" });
    return createRequest(
      {
        customer_id: input.customer_id,
        order_id: input.order_id,
        description: input.description || input.title || "",
        due_date: input.due_date || new Date().toISOString(),
        assigned_to: input.assigned_to,
      },
      actor
    );
  },
  updateRequest: async (id: string, input: any, userIdOrActor?: string | { id: string; name: string }) => {
    const actor = typeof userIdOrActor === "string" ? { id: userIdOrActor, name: "Staff" } : (userIdOrActor || { id: "system", name: "Staff" });
    return updateRequest(id, input, actor);
  },
  updateRequestStatus: async (id: string, status: any, actor: { id: string; name: string }) => {
    return updateRequestStatus(id, status, actor);
  },
  deleteRequest: async (id: string, userIdOrActor?: string | { id: string; name: string }) => {
    const actor = typeof userIdOrActor === "string" ? { id: userIdOrActor, name: "Staff" } : (userIdOrActor || { id: "system", name: "Staff" });
    return deleteRequest(id, actor);
  },
};

