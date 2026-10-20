import fs from "node:fs";
import path from "node:path";
import { db } from "../db/client";
import { logAudit } from "./audit.service";
import { generateRandomToken, hashPin } from "../auth/crypto";
import { getCustomerById, createCustomer, searchCustomers } from "./customer.service";

export interface AlbumRecord {
  id: string;
  customer_id: string;
  customer_name: string;
  title: string;
  occasion: string;
  event_date: string;
  visibility: "Public" | "Private";
  pin_set: boolean;
  token: string;
  allow_download: boolean;
  allow_zip: boolean;
  expires_at: string;
  quota_mb: number;
  used_bytes: number;
  file_count: number;
  status: "Draft" | "Processing" | "Active" | "Expiring" | "Expired" | "Deleted";
  cover_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export async function listAlbums(): Promise<AlbumRecord[]> {
  const res = await db.query(
    `SELECT a.*, COALESCE(c.name, 'Customer') as customer_name
     FROM albums a
     LEFT JOIN customers c ON a.customer_id = c.id
     WHERE a.status != 'Deleted'
     ORDER BY a.created_at DESC`
  );

  const now = Date.now();

  const albums: AlbumRecord[] = await Promise.all(
    res.rows.map(async (row) => {
      // Calculate media usage
      const mediaRes = await db.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(size_bytes), 0) as used_bytes
         FROM media WHERE album_id = $1 AND status != 'failed'`,
        [row.id]
      );

      const coverRes = await db.query(
        `SELECT path_web FROM media WHERE album_id = $1 AND type = 'photo' AND status = 'ready' LIMIT 1`,
        [row.id]
      );

      const expTime = new Date(row.expires_at).getTime();
      let status = row.status;
      if (status !== "Draft" && status !== "Processing") {
        if (expTime < now) {
          status = "Expired";
        } else if (expTime - now < 14 * 24 * 60 * 60 * 1000) {
          status = "Expiring";
        } else {
          status = "Active";
        }
      }

      return {
        id: row.id,
        customer_id: row.customer_id,
        customer_name: row.customer_name,
        title: row.title,
        occasion: row.occasion || "General",
        event_date: typeof row.event_date === "string" ? row.event_date.split("T")[0] : row.event_date,
        visibility: row.visibility,
        pin_set: Boolean(row.pin_hash),
        token: row.token,
        allow_download: Boolean(row.allow_download),
        allow_zip: Boolean(row.allow_zip),
        expires_at: row.expires_at,
        quota_mb: row.quota_mb || 1024,
        used_bytes: Number(mediaRes.rows[0]?.used_bytes || 0),
        file_count: Number(mediaRes.rows[0]?.count || 0),
        status,
        cover_url: coverRes.rows[0]?.path_web || null,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    })
  );

  return albums;
}

export async function getAlbumById(idOrToken: string): Promise<AlbumRecord | null> {
  const direct = await db.query(
    `SELECT a.*, COALESCE(c.name, 'Customer') as customer_name
     FROM albums a
     LEFT JOIN customers c ON a.customer_id = c.id
     WHERE (a.id = $1 OR a.token = $1) AND a.status != 'Deleted'
     LIMIT 1`,
    [idOrToken]
  );
  if (direct.rows.length > 0) {
    const row = direct.rows[0];
    const mediaRes = await db.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(size_bytes), 0) as used_bytes
       FROM media WHERE album_id = $1 AND status != 'failed'`,
      [row.id]
    );
    const coverRes = await db.query(
      `SELECT path_web FROM media WHERE album_id = $1 AND type = 'photo' AND status = 'ready' LIMIT 1`,
      [row.id]
    );
    const expTime = new Date(row.expires_at).getTime();
    let status = row.status;
    const now = Date.now();
    if (status !== "Draft" && status !== "Processing") {
      if (expTime < now) status = "Expired";
      else if (expTime - now < 14 * 24 * 60 * 60 * 1000) status = "Expiring";
      else status = "Active";
    }
    return {
      id: row.id,
      customer_id: row.customer_id,
      customer_name: row.customer_name,
      title: row.title,
      occasion: row.occasion || "General",
      event_date: typeof row.event_date === "string" ? row.event_date.split("T")[0] : row.event_date,
      visibility: row.visibility,
      pin_set: Boolean(row.pin_hash),
      token: row.token,
      allow_download: Boolean(row.allow_download),
      allow_zip: Boolean(row.allow_zip),
      expires_at: row.expires_at,
      quota_mb: row.quota_mb || 1024,
      used_bytes: Number(mediaRes.rows[0]?.used_bytes || 0),
      file_count: Number(mediaRes.rows[0]?.count || 0),
      status,
      cover_url: coverRes.rows[0]?.path_web || null,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  const albums = await listAlbums();
  return albums.find((a) => a.id === idOrToken || a.token === idOrToken) || null;
}

export async function getAlbumByToken(token: string): Promise<AlbumRecord | null> {
  return getAlbumById(token);
}

export async function createAlbum(
  input: {
    id?: string;
    customer_id?: string;
    customer_name?: string;
    order_id?: string;
    title: string;
    occasion?: string;
    event_date?: string;
    visibility?: "Public" | "Private" | string;
    pin?: string;
    token?: string;
    allow_download?: boolean;
    allow_zip?: boolean;
    quota_mb?: number;
    retention_days?: number;
    expires_at?: string;
  },
  actor: { id: string; name?: string } | string
): Promise<AlbumRecord> {
  const actorObj: { id: string; name: string } =
    typeof actor === "string"
      ? { id: actor, name: "Staff" }
      : { id: actor?.id || "system", name: actor?.name || "Staff" };

  let customerId = input.customer_id;
  let customer = customerId ? await getCustomerById(customerId) : null;
  if (!customer && input.customer_name) {
    const custRes = await createCustomer(
      { name: input.customer_name },
      actorObj as any,
      true
    );
    customerId = custRes.customer.id;
    customer = custRes.customer as any;
  }
  if (!customer) {
    const customers = await searchCustomers();
    if (customers.length > 0) {
      customerId = customers[0].id;
      customer = customers[0] as any;
    } else {
      const custRes = await createCustomer({ name: input.customer_name || "Studio Client" }, actorObj as any, true);
      customerId = custRes.customer.id;
      customer = custRes.customer as any;
    }
  }

  const cleanTitle = input.title.trim();
  if (!cleanTitle) throw new Error("Album title is required.");

  const isPrivate = input.visibility === "Private" || input.visibility === "private" || Boolean(input.pin);
  let pinHash: string | null = null;

  if (isPrivate) {
    if (!input.pin || !/^\d{4,6}$/.test(input.pin)) {
      throw new Error("A private album requires a 4 to 6 digit numeric PIN.");
    }
    pinHash = hashPin(input.pin);
  }

  // Token: Cryptographically secure 32+ characters or provided token
  const token = input.token && input.token.trim() ? input.token.trim() : generateRandomToken(32);
  const albumId =
    input.id && input.id.trim()
      ? input.id.trim()
      : `alb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const retentionDays = input.retention_days || 180; // Default 6 months
  const expiresAt = input.expires_at || new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const eventDate = input.event_date ? new Date(input.event_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

  await db.query(
    `INSERT INTO albums (id, customer_id, title, occasion, event_date, visibility, pin_hash, token, allow_download, allow_zip, expires_at, quota_mb, status, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Draft', $13, NOW(), NOW())`,
    [
      albumId,
      customerId,
      cleanTitle,
      input.occasion || "General",
      eventDate,
      isPrivate ? "Private" : "Public",
      pinHash,
      token,
      Boolean(input.allow_download),
      Boolean(input.allow_zip),
      expiresAt,
      input.quota_mb || 1024,
      actorObj.id,
    ]
  );

  await logAudit(actorObj, "ALBUM_CREATED", "Album", albumId, {
    title: cleanTitle,
    customer: customer?.name || "Customer",
    visibility: isPrivate ? "Private" : "Public",
    token,
  });

  return (await getAlbumById(albumId))!;
}

export async function updateAlbumAccess(
  id: string,
  input: {
    visibility?: "Public" | "Private";
    pin?: string;
    allow_download?: boolean;
    allow_zip?: boolean;
  },
  actor: { id: string; name: string }
): Promise<AlbumRecord> {
  const existing = await getAlbumById(id);
  if (!existing) throw new Error("Album not found.");

  const visibility = input.visibility || existing.visibility;
  let pinHash: string | null = null;
  if (visibility === "Private") {
    if (input.pin) {
      if (!/^\d{4,6}$/.test(input.pin)) {
        throw new Error("Private albums require a 4 to 6 digit numeric PIN.");
      }
      pinHash = hashPin(input.pin);
    }
  }

  await db.query(
    `UPDATE albums SET visibility = $1, pin_hash = $2, allow_download = $3, allow_zip = $4, updated_at = NOW() WHERE id = $5`,
    [
      input.visibility,
      pinHash,
      input.allow_download !== undefined ? input.allow_download : existing.allow_download,
      input.allow_zip !== undefined ? input.allow_zip : existing.allow_zip,
      id,
    ]
  );

  // Specification 3.10 & 10.3: Switching to private or changing PIN IMMEDIATELY revokes all active unlock sessions
  await db.query(`DELETE FROM album_unlock_sessions WHERE album_id = $1`, [id]);

  await logAudit(actor, "ALBUM_ACCESS_UPDATED", "Album", id, {
    visibility: input.visibility,
    pin_changed: Boolean(pinHash),
    allow_download: input.allow_download,
  });

  return (await getAlbumById(id))!;
}

export async function extendAlbumRetention(
  id: string,
  days: number = 30,
  actor: { id: string; name: string }
): Promise<AlbumRecord> {
  const existing = await getAlbumById(id);
  if (!existing) throw new Error("Album not found.");

  const currentExp = new Date(existing.expires_at).getTime();
  const base = currentExp > Date.now() ? currentExp : Date.now();
  const nextExp = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();

  await db.query(`UPDATE albums SET expires_at = $1, updated_at = NOW() WHERE id = $2`, [
    nextExp,
    id,
  ]);

  await logAudit(actor, "ALBUM_RETENTION_EXTENDED", "Album", id, {
    days,
    previous_expiry: existing.expires_at,
    new_expiry: nextExp,
  });

  return (await getAlbumById(id))!;
}

export async function deleteAlbum(
  id: string,
  actor: { id: string; name: string; role: string }
): Promise<void> {
  if (actor.role !== "admin") {
    throw new Error("Forbidden: Only administrators can delete albums.");
  }

  const existing = await getAlbumById(id);
  if (!existing) throw new Error("Album not found.");

  // Delete physical files
  const mediaList = await db.query(`SELECT path_web, path_thumb FROM media WHERE album_id = $1`, [
    id,
  ]);
  mediaList.rows.forEach((m) => {
    if (m.path_web && fs.existsSync(m.path_web)) {
      try {
        fs.unlinkSync(m.path_web);
      } catch {}
    }
    if (m.path_thumb && fs.existsSync(m.path_thumb)) {
      try {
        fs.unlinkSync(m.path_thumb);
      } catch {}
    }
  });

  // Delete records
  await db.query(`DELETE FROM media WHERE album_id = $1`, [id]);
  await db.query(`DELETE FROM album_unlock_sessions WHERE album_id = $1`, [id]);
  await db.query(`DELETE FROM albums WHERE id = $1`, [id]);

  await logAudit(actor, "ALBUM_DELETED", "Album", id, {
    title: existing.title,
    customer: existing.customer_name,
  });
}

export const albumService = {
  listAlbums: async (filters?: any) => {
    let list = await listAlbums();
    if (filters?.customer_id) list = list.filter((a) => a.customer_id === filters.customer_id);
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(
        (a) => a.title.toLowerCase().includes(s) || a.customer_name.toLowerCase().includes(s)
      );
    }
    return list.map((a) => ({ ...a, public_token: a.token }));
  },
  getAlbumById: async (id: string) => {
    const a = await getAlbumById(id);
    return a ? { ...a, public_token: a.token } : null;
  },
  getAlbumByToken,
  createAlbum: async (input: any, userIdOrActor?: string | { id: string; name: string }) => {
    const actor =
      typeof userIdOrActor === "string"
        ? { id: userIdOrActor, name: "Staff" }
        : userIdOrActor || { id: "system", name: "Staff" };
    const a = await createAlbum(
      {
        customer_id: input.customer_id,
        title: input.title,
        occasion: input.occasion,
        event_date: input.event_date || new Date().toISOString(),
        visibility: input.visibility === "public" ? "Public" : "Private",
        pin: input.pin,
        allow_download: input.allow_download,
        allow_zip: input.allow_zip,
        quota_mb: input.quota_mb,
        retention_days: input.retention_days,
      },
      actor
    );
    return { ...a, public_token: a.token };
  },
  updateAlbum: async (id: string, input: any, userIdOrActor?: string | { id: string; name: string }) => {
    const actor =
      typeof userIdOrActor === "string"
        ? { id: userIdOrActor, name: "Staff" }
        : userIdOrActor || { id: "system", name: "Staff" };
    const a = await updateAlbumAccess(
      id,
      {
        visibility:
          input.visibility === "public" ? "Public" : input.visibility === "private" ? "Private" : undefined,
        pin: input.pin,
        allow_download: input.allow_download,
        allow_zip: input.allow_zip,
      },
      actor
    );
    return { ...a, public_token: a.token };
  },
  extendRetention: async (
    id: string,
    days: number = 30,
    userIdOrActor?: string | { id: string; name: string }
  ) => {
    const actor =
      typeof userIdOrActor === "string"
        ? { id: userIdOrActor, name: "Staff" }
        : userIdOrActor || { id: "system", name: "Staff" };
    const a = await extendAlbumRetention(id, days, actor);
    return { ...a, public_token: a.token };
  },
  deleteAlbum: async (
    id: string,
    userIdOrActor?: string | { id: string; name: string; role: string }
  ) => {
    const actor =
      typeof userIdOrActor === "string"
        ? { id: userIdOrActor, name: "Admin", role: "admin" }
        : userIdOrActor || { id: "system", name: "Admin", role: "admin" };
    await deleteAlbum(id, actor);
    return { success: true };
  },
};

