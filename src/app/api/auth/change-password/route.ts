import { NextResponse } from "next/server";
import { requireAuth, handleAuthError } from "@/server/auth/rbac";
import { db } from "@/server/db/client";
import { hashPassword, verifyPassword } from "@/server/auth/crypto";
import { auditService } from "@/server/services/audit.service";

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json().catch(() => null);

    const currentPassword = typeof body?.current_password === "string" ? body.current_password : "";
    const newPassword = typeof body?.new_password === "string" ? body.new_password : "";

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // Verify current password unless done by admin resetting someone else
    const targetUserId = body?.target_user_id && user.role === "admin" ? body.target_user_id : user.id;

    if (targetUserId === user.id) {
      const userRes = await db.query("SELECT password_hash FROM users WHERE id = $1", [user.id]);
      if (userRes.rows.length === 0) {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }

      const isValid = await verifyPassword(currentPassword, userRes.rows[0].password_hash);
      if (!isValid) {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
      }
    }

    const newHash = await hashPassword(newPassword);

    await db.query(
      `UPDATE users
       SET password_hash = $1, must_change_pw = FALSE, updated_at = NOW()
       WHERE id = $2`,
      [newHash, targetUserId]
    );

    await auditService.log({
      user_id: user.id,
      user_name: user.name,
      action: "USER_PASSWORD_CHANGE",
      entity_type: "user",
      entity_id: targetUserId,
      details: { changed_by_admin: targetUserId !== user.id },
    });

    const response = NextResponse.json({ success: true, message: "Password updated successfully." });
    if (targetUserId === user.id) {
      response.cookies.delete("addis_must_change_pw");
    }
    return response;
  } catch (error) {
    return handleAuthError(error);
  }
}
