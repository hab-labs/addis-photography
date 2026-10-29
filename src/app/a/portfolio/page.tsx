import { db } from "@/server/db/client";
import { INITIAL_PORTFOLIO } from "@/lib/api/mockData";
import { PublicPortfolioClient } from "./PublicPortfolioClient";
import type { PublicPortfolioItem } from "@/types";

export const dynamic = "force-dynamic";

async function getPortfolioItems(): Promise<PublicPortfolioItem[]> {
  try {
    await db.initialize();
    const result = await db.query(
      "SELECT * FROM portfolio ORDER BY created_at DESC"
    );
    if (result.rows && result.rows.length > 0) {
      return result.rows.map((row: any) => ({
        id: String(row.id),
        title: String(row.title || ""),
        category: (String(row.category || "PORTRAITS").toUpperCase()) as PublicPortfolioItem["category"],
        image_url: String(row.image_url || ""),
        caption: row.caption ? String(row.caption) : undefined,
        aspect_ratio: (row.aspect_ratio || "portrait") as any,
        featured: Boolean(row.featured ?? true),
        created_at: String(row.created_at || new Date().toISOString()),
      }));
    }
  } catch (error) {
    console.error("Failed to load portfolio items on server:", error);
  }
  return INITIAL_PORTFOLIO;
}

export default async function PublicPortfolioPage() {
  const items = await getPortfolioItems();
  return <PublicPortfolioClient initialItems={items} />;
}
