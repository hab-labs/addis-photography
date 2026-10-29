import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { INITIAL_PORTFOLIO } from "@/lib/api/mockData";

export async function GET() {
  try {
    await db.initialize();
    const result = await db.query(
      "SELECT * FROM portfolio ORDER BY created_at DESC"
    );

    if (result.rows.length === 0) {
      // Seed initial showcase if empty
      for (const item of INITIAL_PORTFOLIO) {
        await db.query(
          `INSERT INTO portfolio (id, title, category, image_url, caption, aspect_ratio, featured, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO NOTHING`,
          [
            item.id,
            item.title,
            item.category,
            item.image_url,
            item.caption || null,
            item.aspect_ratio || "portrait",
            item.featured ?? true,
            item.created_at || new Date().toISOString(),
          ]
        );
      }
      const seeded = await db.query(
        "SELECT * FROM portfolio ORDER BY created_at DESC"
      );
      return NextResponse.json({ portfolio: seeded.rows });
    }

    return NextResponse.json({ portfolio: result.rows });
  } catch (error: any) {
    console.error("GET /api/portfolio error:", error);
    return NextResponse.json({ portfolio: INITIAL_PORTFOLIO });
  }
}

export async function POST(request: Request) {
  try {
    await db.initialize();
    const body = await request.json().catch(() => null);

    if (!body || !body.title || !body.image_url) {
      return NextResponse.json(
        { error: "Title and image are required." },
        { status: 400 }
      );
    }

    const id = body.id || `port-${Date.now()}`;
    const title = String(body.title).trim();
    const category = String(body.category || "PORTRAITS").toUpperCase();
    const image_url = String(body.image_url).trim();
    const caption = body.caption ? String(body.caption).trim() : null;
    const aspect_ratio = body.aspect_ratio || "portrait";
    const featured = body.featured !== undefined ? Boolean(body.featured) : true;
    const created_at = new Date().toISOString();

    await db.query(
      `INSERT INTO portfolio (id, title, category, image_url, caption, aspect_ratio, featured, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         category = EXCLUDED.category,
         image_url = EXCLUDED.image_url,
         caption = EXCLUDED.caption,
         aspect_ratio = EXCLUDED.aspect_ratio,
         featured = EXCLUDED.featured`,
      [id, title, category, image_url, caption, aspect_ratio, featured, created_at]
    );

    const newItem = {
      id,
      title,
      category,
      image_url,
      caption,
      aspect_ratio,
      featured,
      created_at,
    };

    return NextResponse.json({ item: newItem }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/portfolio error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to save portfolio item." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await db.initialize();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Item ID is required." }, { status: 400 });
    }

    await db.query("DELETE FROM portfolio WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/portfolio error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete portfolio item." },
      { status: 500 }
    );
  }
}
