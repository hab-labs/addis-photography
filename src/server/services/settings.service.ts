import { db } from "../db/client";
import { logAudit } from "./audit.service";

export interface StudioSettingsPayload {
  studio_name: string;
  phone: string;
  address: string;
  email: string;
  receipt_footer: string;
  default_album_quota_mb: number;
  default_retention_days: number;
  max_photo_size_mb: number;
  max_video_size_mb: number;
  block_delivery_unpaid: boolean;
  accent_color?: string;
  logo_url?: string;
}

export async function getStudioSettings(): Promise<StudioSettingsPayload> {
  const res = await db.query(`SELECT value FROM settings WHERE key = 'studio_profile'`);
  if (res.rows.length === 0) {
    return {
      studio_name: "Addis Photography",
      phone: "+251973679744",
      address: "Jimma, Tsinat Building, 2nd Floor",
      email: "contact@addisphotography.et",
      receipt_footer:
        "Thank you for choosing Addis Photography! Please keep this receipt for order collection.",
      default_album_quota_mb: 1024,
      default_retention_days: 180,
      max_photo_size_mb: 25,
      max_video_size_mb: 500,
      block_delivery_unpaid: false,
      accent_color: "#D51E25",
      logo_url: "/addis-photography-logo.png",
    };
  }

  const data = typeof res.rows[0].value === "string" ? JSON.parse(res.rows[0].value) : res.rows[0].value;
  return data;
}

export async function updateStudioSettings(
  input: Partial<StudioSettingsPayload>,
  actor: { id: string; name: string; role: string }
): Promise<StudioSettingsPayload> {
  if (actor.role !== "admin") {
    throw new Error("Forbidden: Only administrators can update studio settings.");
  }

  const current = await getStudioSettings();
  const updated: StudioSettingsPayload = {
    ...current,
    ...input,
  };

  await db.query(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ('studio_profile', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [JSON.stringify(updated)]
  );

  await logAudit(actor, "SETTINGS_UPDATED", "Settings", "studio_profile", {
    updated_fields: Object.keys(input),
  });

  return updated;
}

export const settingsService = {
  getSettings: getStudioSettings,
  updateSettings: async (
    input: Partial<StudioSettingsPayload>,
    userIdOrActor?: string | { id: string; name: string; role: string }
  ) => {
    const actor =
      typeof userIdOrActor === "string"
        ? { id: userIdOrActor, name: "Admin", role: "admin" }
        : userIdOrActor || { id: "system", name: "Admin", role: "admin" };
    return updateStudioSettings(input, actor);
  },
};

