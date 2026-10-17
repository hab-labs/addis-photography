import { db } from "../db/client";
import { listAlbums } from "./album.service";

export interface StorageMetrics {
  total_capacity_gb: number;
  total_capacity_bytes: number;
  used_bytes: number;
  used_mb: number;
  remaining_bytes: number;
  remaining_gb: number;
  usage_percentage: number;
  is_warning: boolean; // >= 80%
  active_albums_count: number;
  expiring_albums: Array<{
    id: string;
    title: string;
    customer_name: string;
    size_mb: number;
    days_left: number;
    expires_at: string;
  }>;
}

export async function getStorageMetrics(): Promise<StorageMetrics> {
  const settingsRes = await db.query(
    `SELECT value FROM settings WHERE key = 'storage_config'`
  );
  let totalCapacityGb = 100;
  let alertThreshold = 80;

  if (settingsRes.rows.length > 0) {
    const val = typeof settingsRes.rows[0].value === "string"
      ? JSON.parse(settingsRes.rows[0].value)
      : settingsRes.rows[0].value;
    totalCapacityGb = val.total_capacity_gb || 100;
    alertThreshold = val.alert_threshold_percent || 80;
  }

  const totalCapacityBytes = totalCapacityGb * 1024 * 1024 * 1024;

  // Aggregate used media bytes
  const mediaRes = await db.query(
    `SELECT COALESCE(SUM(size_bytes), 0) as used_bytes FROM media WHERE status != 'failed'`
  );
  const usedBytes = Number(mediaRes.rows[0]?.used_bytes || 0);
  const usedMb = usedBytes / (1024 * 1024);
  const remainingBytes = Math.max(0, totalCapacityBytes - usedBytes);
  const remainingGb = remainingBytes / (1024 * 1024 * 1024);
  const usagePercentage = Number(((usedBytes / totalCapacityBytes) * 100).toFixed(2));
  const isWarning = usagePercentage >= alertThreshold;

  // Expiring albums
  const albums = await listAlbums();
  const now = Date.now();
  const expiring = albums
    .filter((a) => {
      const expTime = new Date(a.expires_at).getTime();
      const daysLeft = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));
      return daysLeft <= 30;
    })
    .map((a) => {
      const expTime = new Date(a.expires_at).getTime();
      const daysLeft = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));
      return {
        id: a.id,
        title: a.title,
        customer_name: a.customer_name,
        size_mb: Number((a.used_bytes / (1024 * 1024)).toFixed(1)),
        days_left: daysLeft,
        expires_at: a.expires_at,
      };
    })
    .sort((a, b) => a.days_left - b.days_left);

  return {
    total_capacity_gb: totalCapacityGb,
    total_capacity_bytes: totalCapacityBytes,
    used_bytes: usedBytes,
    used_mb: Number(usedMb.toFixed(1)),
    remaining_bytes: remainingBytes,
    remaining_gb: Number(remainingGb.toFixed(2)),
    usage_percentage: usagePercentage,
    is_warning: isWarning,
    active_albums_count: albums.length,
    expiring_albums: expiring,
  };
}

export const storageService = {
  getStorageOverview: getStorageMetrics,
  getStorageMetrics,
};

