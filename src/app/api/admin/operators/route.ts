import { NextResponse } from "next/server";
import { requireAdmin, handleAuthError } from "@/server/auth/rbac";
import { db } from "@/server/db/client";
import { hashPassword } from "@/server/auth/crypto";
import { auditService } from "@/server/services/audit.service";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const res = await db.query(
      `SELECT u.id, u.name, u.username, u.email, u.phone, u.active, u.must_change_pw,
              u.created_at, u.updated_at, r.name as role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       ORDER BY u.created_at ASC`
    );

    return NextResponse.json({ users: res.rows });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json().catch(() => null);

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const roleName = body?.role === "admin" ? "admin" : "staff";

    if (!name || !username || !password) {
      return NextResponse.json(
        { error: "Name, username, and password are required." },
        { status: 400 }
      );
    }

    // Check duplicate username
    const existing = await db.query("SELECT id FROM users WHERE LOWER(username) = LOWER($1)", [username]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "Username already exists." }, { status: 409 });
    }

    const roleRes = await db.query("SELECT id FROM roles WHERE name = $1", [roleName]);
    const roleId = roleRes.rows[0]?.id || (roleName === "admin" ? "role-admin" : "role-staff");

    const pwHash = await hashPassword(password);
    const newId = `user-${Date.now()}`;

    await db.query(
      `INSERT INTO users (id, role_id, name, username, email, phone, password_hash, active, must_change_pw, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, FALSE, NOW(), NOW())`,
      [newId, roleId, name, username, email, phone, pwHash]
    );

    await auditService.log({
      user_id: admin.id,
      user_name: admin.name,
      action: "USER_CREATE",
      entity_type: "user",
      entity_id: newId,
      details: { username, role: roleName },
    });

    const user = {
      id: newId,
      name,
      username,
      email,
      phone,
      role: roleName,
      active: true,
      must_change_pw: false,
    };

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json().catch(() => null);

    const id = String(body?.id || "");
    if (!id) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    const currentRes = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    if (currentRes.rows.length === 0) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    const current = currentRes.rows[0];

    const name = typeof body?.name === "string" ? body.name.trim() : current.name;
    const username = typeof body?.username === "string" ? body.username.trim() : current.username;
    const email = typeof body?.email === "string" ? body.email.trim() : current.email;
    const phone = typeof body?.phone === "string" ? body.phone.trim() : current.phone;
    const active = typeof body?.active === "boolean" ? body.active : current.active;

    let roleId = current.role_id;
    if (body?.role) {
      const roleName = body.role === "admin" ? "admin" : "staff";
      const roleRes = await db.query("SELECT id FROM roles WHERE name = $1", [roleName]);
      roleId = roleRes.rows[0]?.id || (roleName === "admin" ? "role-admin" : "role-staff");
    }

    let pwHash = current.password_hash;
    if (typeof body?.password === "string" && body.password.trim()) {
      pwHash = await hashPassword(body.password.trim());
    }

    await db.query(
      `UPDATE users
       SET name = $1, username = $2, email = $3, phone = $4, role_id = $5,
           password_hash = $6, active = $7, updated_at = NOW()
       WHERE id = $8`,
      [name, username, email, phone, roleId, pwHash, active, id]
    );

    await auditService.log({
      user_id: admin.id,
      user_name: admin.name,
      action: "USER_UPDATE",
      entity_type: "user",
      entity_id: id,
      details: { username, active },
    });

    const updatedRole = roleId.includes("admin") ? "admin" : "staff";
    const user = {
      id,
      name,
      username,
      email,
      phone,
      role: updatedRole,
      active,
    };

    return NextResponse.json({ user });
  } catch (error) {
    return handleAuthError(error);
  }
}
