import { NextResponse } from "next/server";
import { getAuthUser } from "@/server/auth/rbac";
import { runRetentionCleanupJob } from "@/server/jobs/expiry-cleanup.job";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "addis-retention-cron-secret";

  let authorized = false;
  let actorId = "system-cron";

  if (authHeader && authHeader === `Bearer ${cronSecret}`) {
    authorized = true;
  } else {
    // Or check admin session
    const user = await getAuthUser(request);
    if (user && user.role === "admin") {
      authorized = true;
      actorId = user.id;
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runRetentionCleanupJob(actorId);
  return NextResponse.json({ success: true, result });
}

export async function GET(request: Request) {
  return POST(request);
}
