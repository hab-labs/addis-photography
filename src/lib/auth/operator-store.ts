import { createHash } from "node:crypto";
import { INITIAL_USERS } from "@/lib/api/mockData";
import { DEMO_PASSWORDS } from "@/lib/auth/config";
import type { User, UserRole } from "@/types";

interface OperatorRecord extends User {
  passwordHash: string;
}

const operators = new Map<string, OperatorRecord>(
  INITIAL_USERS.map((user) => [
    user.username,
    {
      ...user,
      passwordHash: createHash("sha256").update(DEMO_PASSWORDS[user.username] || "").digest("hex"),
    },
  ]),
);

export function listOperators(): User[] {
  return Array.from(operators.values()).map(({ passwordHash: _passwordHash, ...user }) => user);
}

export function createOperator(input: {
  name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  role?: UserRole;
}): User {
  const username = input.username.trim().toLowerCase();
  if (!input.name.trim() || !username || !input.email.trim() || input.password.length < 8) {
    throw new Error("Name, username, email, and a password of at least 8 characters are required.");
  }
  if (!/^[a-z0-9._-]+$/.test(username)) {
    throw new Error("Username may only contain lowercase letters, numbers, dots, underscores, and hyphens.");
  }
  if (Array.from(operators.values()).some((operator) => operator.username === username || operator.email.toLowerCase() === input.email.trim().toLowerCase())) {
    throw new Error("An operator with this username or email already exists.");
  }

  const user: User = {
    id: `usr-${Date.now()}`,
    name: input.name.trim(),
    username,
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    role: input.role || "staff",
    is_active: true,
    created_at: new Date().toISOString(),
  };

  operators.set(username, {
    ...user,
    passwordHash: createHash("sha256").update(input.password).digest("hex"),
  });
  return user;
}

export function authenticateOperator(usernameOrEmail: string, password: string): User | undefined {
  const normalized = usernameOrEmail.trim().toLowerCase();
  const operator = Array.from(operators.values()).find(
    (candidate) => candidate.username === normalized || candidate.email.toLowerCase() === normalized || candidate.phone === usernameOrEmail.trim(),
  );
  if (!operator || !operator.is_active) return undefined;

  const passwordHash = createHash("sha256").update(password).digest("hex");
  return passwordHash === operator.passwordHash
    ? (({ passwordHash: _passwordHash, ...user }) => user)(operator)
    : undefined;
}

export function updateOperator(id: string, input: {
  name: string;
  username: string;
  email: string;
  phone: string;
  role: UserRole;
  password?: string;
}): User {
  const current = Array.from(operators.values()).find((operator) => operator.id === id);
  if (!current) throw new Error("Operator not found.");

  const username = input.username.trim().toLowerCase();
  const duplicate = Array.from(operators.values()).find(
    (operator) => operator.id !== id && (operator.username === username || operator.email.toLowerCase() === input.email.trim().toLowerCase()),
  );
  if (!input.name.trim() || !username || !input.email.trim()) throw new Error("Name, username, and email are required.");
  if (!/^[a-z0-9._-]+$/.test(username)) throw new Error("Username contains invalid characters.");
  if (duplicate) throw new Error("Another operator already uses this username or email.");
  if (input.password !== undefined && input.password.length < 8) throw new Error("Password must be at least 8 characters.");

  const updated: OperatorRecord = {
    ...current,
    id,
    name: input.name.trim(),
    username,
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    role: input.role,
    passwordHash: input.password
      ? createHash("sha256").update(input.password).digest("hex")
      : current.passwordHash,
  };
  operators.delete(current.username);
  operators.set(username, updated);
  const { passwordHash: _passwordHash, ...user } = updated;
  return user;
}
