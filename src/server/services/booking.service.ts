import { db } from "../db/client";
import { INITIAL_BOOKINGS } from "@/lib/api/mockData";
import type { Booking, BookingStatus } from "@/types";

let memoryBookings: Booking[] = [...INITIAL_BOOKINGS];

function mapRowToBooking(row: any): Booking {
  return {
    id: String(row.id),
    booking_reference: String(row.booking_reference),
    customer_name: String(row.customer_name),
    customer_phone: String(row.customer_phone),
    service_type: String(row.service_type),
    photo_type_id: row.photo_type_id ? String(row.photo_type_id) : undefined,
    preferred_date: String(row.preferred_date),
    preferred_time_slot: row.preferred_time_slot ? String(row.preferred_time_slot) : undefined,
    location_preference: row.location_preference || "studio",
    notes: row.notes ? String(row.notes) : undefined,
    status: (row.status || "pending") as BookingStatus,
    estimated_price: row.estimated_price ? String(row.estimated_price) : undefined,
    created_at: typeof row.created_at === "object" && row.created_at instanceof Date
      ? row.created_at.toISOString()
      : String(row.created_at || new Date().toISOString()),
    updated_at: row.updated_at
      ? typeof row.updated_at === "object" && row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at)
      : undefined,
    source: row.source || "online",
    assigned_photographer: row.assigned_photographer ? String(row.assigned_photographer) : undefined,
  };
}

export async function listBookings(filters?: {
  status?: string;
  search?: string;
  date?: string;
}): Promise<Booking[]> {
  try {
    await db.initialize();
    await ensureBookingTable();

    let sql = `SELECT * FROM bookings WHERE 1=1`;
    const params: any[] = [];

    if (filters?.status && filters.status !== "all") {
      params.push(filters.status);
      sql += ` AND status = $${params.length}`;
    }

    if (filters?.date) {
      params.push(filters.date);
      sql += ` AND preferred_date = $${params.length}`;
    }

    if (filters?.search) {
      params.push(`%${filters.search.toLowerCase().trim()}%`);
      sql += ` AND (LOWER(customer_name) LIKE $${params.length} OR customer_phone LIKE $${params.length} OR LOWER(booking_reference) LIKE $${params.length} OR LOWER(service_type) LIKE $${params.length})`;
    }

    sql += ` ORDER BY preferred_date ASC, created_at DESC`;

    const res = await db.query(sql, params);
    if (res && Array.isArray(res.rows)) {
      return res.rows.map(mapRowToBooking);
    }
  } catch (err) {
    console.warn("DB listBookings query notice:", err);
  }

  // Fallback for isolated test environments without database URL
  let list = [...memoryBookings];
  if (filters?.status && filters.status !== "all") {
    list = list.filter((b) => b.status === filters.status);
  }
  if (filters?.date) {
    list = list.filter((b) => b.preferred_date === filters.date);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase().trim();
    list = list.filter(
      (b) =>
        b.customer_name.toLowerCase().includes(q) ||
        b.customer_phone.includes(q) ||
        b.booking_reference.toLowerCase().includes(q) ||
        b.service_type.toLowerCase().includes(q)
    );
  }
  return list;
}

export async function getBookingById(id: string): Promise<Booking | null> {
  try {
    await db.initialize();
    await ensureBookingTable();
    const query = id.trim();
    const res = await db.query(
      `SELECT * FROM bookings WHERE id = $1 OR LOWER(booking_reference) = LOWER($1) OR customer_phone = $1 LIMIT 1`,
      [query]
    );
    if (res.rows && res.rows.length > 0) {
      return mapRowToBooking(res.rows[0]);
    }
  } catch (err) {
    console.warn("DB getBookingById query notice:", err);
  }

  const all = await listBookings();
  return (
    all.find(
      (b) =>
        b.id === id ||
        b.booking_reference.toLowerCase() === id.toLowerCase() ||
        b.customer_phone === id
    ) || null
  );
}

export async function createBooking(data: {
  customer_name: string;
  customer_phone: string;
  service_type: string;
  photo_type_id?: string;
  preferred_date: string;
  preferred_time_slot?: string;
  location_preference?: "studio" | "outdoor" | "event_venue";
  notes?: string;
  status?: BookingStatus;
  estimated_price?: string;
  source?: "online" | "walk_in" | "phone";
  assigned_photographer?: string;
}): Promise<Booking> {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const newBooking: Booking = {
    id: `bk-${Date.now()}-${randomSuffix}`,
    booking_reference: `BK-${randomSuffix}`,
    customer_name: data.customer_name.trim(),
    customer_phone: data.customer_phone.trim(),
    service_type: data.service_type.trim(),
    photo_type_id: data.photo_type_id,
    preferred_date: data.preferred_date,
    preferred_time_slot: data.preferred_time_slot || "Morning (09:00 - 12:00)",
    location_preference: data.location_preference || "studio",
    notes: data.notes?.trim() || undefined,
    status: data.status || "pending",
    estimated_price: data.estimated_price,
    created_at: new Date().toISOString(),
    source: data.source || "online",
    assigned_photographer: data.assigned_photographer,
  };

  memoryBookings = [newBooking, ...memoryBookings];

  try {
    await db.initialize();
    await ensureBookingTable();
    const res = await db.query(
      `INSERT INTO bookings (
        id, booking_reference, customer_name, customer_phone, service_type,
        photo_type_id, preferred_date, preferred_time_slot, location_preference,
        notes, status, estimated_price, created_at, source, assigned_photographer
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        newBooking.id,
        newBooking.booking_reference,
        newBooking.customer_name,
        newBooking.customer_phone,
        newBooking.service_type,
        newBooking.photo_type_id || null,
        newBooking.preferred_date,
        newBooking.preferred_time_slot || null,
        newBooking.location_preference || "studio",
        newBooking.notes || null,
        newBooking.status,
        newBooking.estimated_price || null,
        newBooking.created_at,
        newBooking.source,
        newBooking.assigned_photographer || null,
      ]
    );
    if (res.rows && res.rows.length > 0) {
      return mapRowToBooking(res.rows[0]);
    }
  } catch (err) {
    console.warn("DB createBooking insert notice:", err);
  }

  return newBooking;
}

export async function updateBooking(
  id: string,
  updates: Partial<Booking>
): Promise<Booking | null> {
  try {
    await db.initialize();
    await ensureBookingTable();
    const res = await db.query(
      `UPDATE bookings SET
        status = COALESCE($1, status),
        preferred_date = COALESCE($2, preferred_date),
        preferred_time_slot = COALESCE($3, preferred_time_slot),
        notes = COALESCE($4, notes),
        assigned_photographer = COALESCE($5, assigned_photographer),
        updated_at = NOW()
       WHERE id = $6 OR LOWER(booking_reference) = LOWER($6)
       RETURNING *`,
      [
        updates.status || null,
        updates.preferred_date || null,
        updates.preferred_time_slot || null,
        updates.notes || null,
        updates.assigned_photographer || null,
        id,
      ]
    );
    if (res.rows && res.rows.length > 0) {
      return mapRowToBooking(res.rows[0]);
    }
  } catch (err) {
    console.warn("DB updateBooking query notice:", err);
  }

  const index = memoryBookings.findIndex(
    (b) => b.id === id || b.booking_reference.toLowerCase() === id.toLowerCase()
  );
  if (index === -1) return null;

  const updated: Booking = {
    ...memoryBookings[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  memoryBookings[index] = updated;
  return updated;
}

export async function deleteBooking(id: string): Promise<boolean> {
  memoryBookings = memoryBookings.filter(
    (b) => b.id !== id && b.booking_reference.toLowerCase() !== id.toLowerCase()
  );
  try {
    await db.initialize();
    await ensureBookingTable();
    await db.query(
      `DELETE FROM bookings WHERE id = $1 OR LOWER(booking_reference) = LOWER($1)`,
      [id]
    );
  } catch {}
  return true;
}

let tableEnsured = false;
async function ensureBookingTable() {
  if (tableEnsured) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(64) PRIMARY KEY,
        booking_reference VARCHAR(32) NOT NULL UNIQUE,
        customer_name VARCHAR(120) NOT NULL,
        customer_phone VARCHAR(32) NOT NULL,
        service_type VARCHAR(120) NOT NULL,
        photo_type_id VARCHAR(64) NULL,
        preferred_date VARCHAR(32) NOT NULL,
        preferred_time_slot VARCHAR(64) NULL,
        location_preference VARCHAR(32) DEFAULT 'studio',
        notes TEXT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        estimated_price VARCHAR(32) NULL,
        source VARCHAR(32) NOT NULL DEFAULT 'online',
        assigned_photographer VARCHAR(120) NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NULL
      );
      CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference);
      CREATE INDEX IF NOT EXISTS idx_bookings_preferred_date ON bookings(preferred_date);
    `);
    tableEnsured = true;
  } catch {
    tableEnsured = false;
  }
}

export const bookingService = {
  listBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
};
