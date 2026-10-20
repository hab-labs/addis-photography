import Decimal from "decimal.js";
import { db } from "../db/client";
import { logAudit } from "./audit.service";

export interface PhotoTypeRecord {
  id: string;
  name: string;
  standard_price: string | null;
  active: boolean;
  turnaround_days: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export async function listPhotoTypes(includeInactive = false): Promise<PhotoTypeRecord[]> {
  const sql = includeInactive
    ? `SELECT * FROM photo_types ORDER BY name ASC`
    : `SELECT * FROM photo_types WHERE active = TRUE ORDER BY name ASC`;
  const res = await db.query<PhotoTypeRecord>(sql);
  return res.rows;
}

export async function getPhotoTypeById(id: string): Promise<PhotoTypeRecord | null> {
  const res = await db.query<PhotoTypeRecord>(`SELECT * FROM photo_types WHERE id = $1`, [id]);
  return res.rows[0] || null;
}

export async function getPhotoTypeByName(name: string): Promise<PhotoTypeRecord | null> {
  const clean = name.trim();
  const res = await db.query<PhotoTypeRecord>(
    `SELECT * FROM photo_types 
     WHERE LOWER(name) = LOWER($1) 
        OR LOWER(description) = LOWER($1) 
        OR LOWER(id) = LOWER($1) 
     LIMIT 1`,
    [clean]
  );
  return res.rows[0] || null;
}

export async function createPhotoType(
  input: {
    name: string;
    standard_price?: string | number | null;
    turnaround_days?: number;
    description?: string;
  },
  actor: { id: string; name: string; role: string }
): Promise<PhotoTypeRecord> {
  if (actor.role !== "admin") {
    throw new Error("Forbidden: Only administrators can add photo types.");
  }

  const cleanName = input.name.trim();
  if (!cleanName) throw new Error("Photo type name is required.");

  const existing = await getPhotoTypeByName(cleanName);
  if (existing) throw new Error(`Photo type "${cleanName}" already exists.`);

  const price =
    input.standard_price !== undefined && input.standard_price !== null && input.standard_price !== ""
      ? new Decimal(input.standard_price).toFixed(2)
      : null;

  const id = `pt-${Date.now()}`;
  await db.query(
    `INSERT INTO photo_types (id, name, standard_price, active, turnaround_days, description, created_at, updated_at)
     VALUES ($1, $2, $3, TRUE, $4, $5, NOW(), NOW())`,
    [id, cleanName, price, input.turnaround_days ?? 1, input.description || null]
  );

  await logAudit(actor, "PHOTO_TYPE_CREATED", "PhotoType", id, {
    name: cleanName,
    standard_price: price,
  });

  return (await getPhotoTypeById(id))!;
}

export async function updatePhotoType(
  id: string,
  input: {
    standard_price?: string | number | null;
    turnaround_days?: number;
    description?: string;
    active?: boolean;
  },
  actor: { id: string; name: string; role: string }
): Promise<PhotoTypeRecord> {
  if (actor.role !== "admin") {
    throw new Error("Forbidden: Only administrators can edit photo types and standard prices.");
  }

  const existing = await getPhotoTypeById(id);
  if (!existing) throw new Error("Photo type not found.");

  let price = existing.standard_price;
  if (input.standard_price !== undefined) {
    price =
      input.standard_price !== null && input.standard_price !== ""
        ? new Decimal(input.standard_price).toFixed(2)
        : null;
  }

  const turnaround = input.turnaround_days !== undefined ? input.turnaround_days : existing.turnaround_days;
  const description = input.description !== undefined ? input.description : existing.description;
  const active = input.active !== undefined ? input.active : existing.active;

  await db.query(
    `UPDATE photo_types SET standard_price = $1, turnaround_days = $2, description = $3, active = $4, updated_at = NOW() WHERE id = $5`,
    [price, turnaround, description, active, id]
  );

  await logAudit(actor, "PHOTO_TYPE_UPDATED", "PhotoType", id, {
    old: { standard_price: existing.standard_price, active: existing.active },
    new: { standard_price: price, active },
  });

  return (await getPhotoTypeById(id))!;
}

export const priceService = {
  getAllPhotoTypes: listPhotoTypes,
  listPhotoTypes,
  getPhotoTypeById,
  getPhotoTypeByName,
  createPhotoType: async (input: any, userIdOrActor?: string | { id: string; name: string; role: string }) => {
    const actor = typeof userIdOrActor === "string" ? { id: userIdOrActor, name: "Admin", role: "admin" } : (userIdOrActor || { id: "system", name: "Admin", role: "admin" });
    return createPhotoType({
      name: input.name,
      standard_price: input.standard_price ?? input.standard_unit_price,
      turnaround_days: input.turnaround_days,
      description: input.description,
    }, actor);
  },
  updatePhotoType: async (id: string, input: any, userIdOrActor?: string | { id: string; name: string; role: string }) => {
    const actor = typeof userIdOrActor === "string" ? { id: userIdOrActor, name: "Admin", role: "admin" } : (userIdOrActor || { id: "system", name: "Admin", role: "admin" });
    return updatePhotoType(id, {
      standard_price: input.standard_price ?? input.standard_unit_price,
      turnaround_days: input.turnaround_days,
      description: input.description,
      active: input.active,
    }, actor);
  },
};

