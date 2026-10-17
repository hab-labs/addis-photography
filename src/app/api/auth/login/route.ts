import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { verifyPassword } from "@/server/auth/crypto";
import { rateLimiter } from "@/server/auth/rate-limiter";
import { createSession, setSessionCookie, AuthenticatedUser } from "@/server/auth/session";
import { auditService } from "@/server/services/audit.service";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const userAgent = request.headers.get("user-agent") || "";

  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 }
    );
  }

  // 1. Sliding window rate limit check (5 attempts -> 15 min lock)
  const rateKey = `login:${ip}:${username.toLowerCase()}`;
  const rateCheck = rateLimiter.isBlocked(rateKey);
  if (rateCheck.blocked) {
    const minutesLeft = Math.ceil(rateCheck.retryAfterSeconds / 60);
    return NextResponse.json(
      { error: `Too many failed login attempts. Account locked. Please try again in ${minutesLeft} minute(s).` },
      { status: 429 }
    );
  }

  // 2. Fetch user from database (support username, email, or phone)
  const res = await db.query(
    `SELECT u.*, r.name as role_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE LOWER(u.username) = LOWER($1) OR LOWER(u.email) = LOWER($1) OR u.phone = $1`,
    [username]
  );

  if (res.rows.length === 0) {
    rateLimiter.recordFailure(rateKey);
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  }

  const userRow = res.rows[0];

  if (!userRow.active) {
    return NextResponse.json(
      { error: "This account has been deactivated. Please contact an administrator." },
      { status: 403 }
    );
  }

  // 3. Bcrypt password verification
  const isValid = await verifyPassword(password, userRow.password_hash);
  if (!isValid) {
    rateLimiter.recordFailure(rateKey);
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  }

  // Reset rate limiter on successful authentication
  rateLimiter.reset(rateKey);

  // 4. Create cryptographically secure session
  const roleName = userRow.role_name || (userRow.role_id === "role-admin" ? "admin" : "staff");
  const sessionId = await createSession(userRow.id, roleName, ip, userAgent);

  const authUser: AuthenticatedUser = {
    id: userRow.id,
    name: userRow.name,
    username: userRow.username,
    email: userRow.email,
    phone: userRow.phone,
    role: (roleName === "admin" ? "admin" : "staff") as "admin" | "staff",
    active: userRow.active,
    must_change_pw: userRow.must_change_pw,
  };

  // 5. Audit log
  await auditService.log({
    user_id: userRow.id,
    user_name: userRow.name,
    action: "USER_LOGIN",
    entity_type: "auth",
    entity_id: userRow.id,
    details: { ip, userAgent },
  });

  const response = NextResponse.json({ user: authUser });
  setSessionCookie(response, sessionId);

  return response;
}
