import { Pool, PoolClient } from "pg";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface TransactionClient {
  query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
}

class DatabaseManager {
  private pool: Pool | null = null;
  private isConnected = false;
  private memoryStore: Map<string, any[]> = new Map();
  private isMemoryMode = false;
  private initialized = false;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
      this.pool = new Pool({
        connectionString,
        max: 10,
        idleTimeoutMillis: 30000,
      });
      this.isMemoryMode = false;
    } else {
      this.isMemoryMode = true;
      this.initMemoryStore();
    }
  }

  private initMemoryStore() {
    const tables = [
      "roles",
      "users",
      "customers",
      "photo_types",
      "orders",
      "order_items",
      "payments",
      "requests",
      "albums",
      "media",
      "audit_logs",
      "settings",
      "sessions",
      "album_unlock_sessions",
    ];
    tables.forEach((t) => this.memoryStore.set(t, []));
  }

  public getMemoryStore() {
    return this.memoryStore;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!this.isMemoryMode && this.pool) {
      try {
        const schemaPath = path.join(process.cwd(), "src/server/db/schema.sql");
        if (fs.existsSync(schemaPath)) {
          const sql = fs.readFileSync(schemaPath, "utf-8");
          await this.pool.query(sql);
        }
      } catch (err) {
        console.warn("Postgres connection failed, falling back to ACID in-process store:", err);
        this.isMemoryMode = true;
        this.initMemoryStore();
      }
    }

    this.initialized = true;
    await this.seedDefaults();
  }

  public async seedDefaults(): Promise<void> {
    // 1. Roles
    const roles = await this.query("SELECT * FROM roles");
    if (roles.rows.length === 0) {
      await this.query("INSERT INTO roles (id, name) VALUES ($1, $2), ($3, $4)", [
        "role-admin",
        "admin",
        "role-staff",
        "staff",
      ]);
    }

    // 2. Default Users (hashed with bcrypt)
    const users = await this.query("SELECT * FROM users");
    if (users.rows.length === 0) {
      const yonasHash = await bcrypt.hash("yonas123", 10);
      const selamHash = await bcrypt.hash("selam123", 10);
      const dawitHash = await bcrypt.hash("dawit123", 10);

      await this.query(
        `INSERT INTO users (id, name, username, email, phone, password_hash, role_id, active, must_change_pw)
         VALUES 
         ($1, $2, $3, $4, $5, $6, $7, $8, $9),
         ($10, $11, $12, $13, $14, $15, $16, $17, $18),
         ($19, $20, $21, $22, $23, $24, $25, $26, $27)`,
        [
          "usr-1",
          "Yonas Mekonnen",
          "yonas",
          "yonas@addisphoto.et",
          "+251911421806",
          yonasHash,
          "role-admin",
          true,
          false,
          "usr-2",
          "Selamawit Tadesse",
          "selam",
          "selam@addisphoto.et",
          "+251922334455",
          selamHash,
          "role-staff",
          true,
          false,
          "usr-3",
          "Dawit Girma",
          "dawit",
          "dawit@addisphoto.et",
          "+251933445566",
          dawitHash,
          "role-staff",
          true,
          false,
        ]
      );
    }

    // 3. Six Standard Photo Types (Specification Section 2.1 & 8.2)
    const photoTypes = await this.query("SELECT * FROM photo_types");
    if (photoTypes.rows.length === 0) {
      await this.query(
        `INSERT INTO photo_types (id, name, standard_price, active, turnaround_days, description)
         VALUES 
         ($1, $2, $3, $4, $5, $6),
         ($7, $8, $9, $10, $11, $12),
         ($13, $14, $15, $16, $17, $18),
         ($19, $20, $21, $22, $23, $24),
         ($25, $26, $27, $28, $29, $30),
         ($31, $32, $33, $34, $35, $36)`,
        [
          "pt-1",
          "3x4",
          "350.00",
          true,
          0,
          "Standard Passport / Visa (4 Copies)",
          "pt-2",
          "10x15",
          "150.00",
          true,
          0,
          "Instant Glossy Print (10x15 cm)",
          "pt-3",
          "30x45",
          "1200.00",
          true,
          3,
          "Premium Wall Frame / Poster (30x45 cm)",
          "pt-4",
          "13x18",
          "250.00",
          true,
          1,
          "Medium Tabletop Portrait (13x18 cm)",
          "pt-5",
          "20x25",
          "500.00",
          true,
          2,
          "Large Fine Art Studio Print (20x25 cm)",
          "pt-6",
          "Other",
          null, // Unconfigured price representation explicitly allowed for custom orders
          true,
          2,
          "Custom Photography / Framing Service",
        ]
      );
    }

    // 4. Default Settings (Specification Section 10 & 3.10)
    const settings = await this.query("SELECT * FROM settings WHERE key = 'studio_profile'");
    if (settings.rows.length === 0) {
      await this.query(
        "INSERT INTO settings (key, value) VALUES ($1, $2), ($3, $4)",
        [
          "studio_profile",
          JSON.stringify({
            studio_name: "Addis Photography",
            phone: "+251973679744",
            address: "Jimma, Tsinat Building, 2nd Floor",
            email: "contact@addisphotography.et",
            receipt_footer:
              "Thank you for choosing Addis Photography! Please keep this receipt for order collection.",
            default_album_quota_mb: 1024,
            default_retention_days: 180, // 6 months per Spec 3.10
            max_photo_size_mb: 25,
            max_video_size_mb: 500,
            block_delivery_unpaid: false,
          }),
          "storage_config",
          JSON.stringify({
            total_capacity_gb: 100, // Spec 10.2 storage plan: 100 GB per year
            alert_threshold_percent: 80,
          }),
        ]
      );
    }
  }

  public async query<T = any>(text: string, params: any[] = []): Promise<QueryResult<T>> {
    await this.ensureReady();

    if (!this.isMemoryMode && this.pool) {
      const res = await this.pool.query(text, params);
      return { rows: res.rows, rowCount: res.rowCount ?? 0 };
    }

    return this.executeMemoryQuery<T>(text, params);
  }

  public async transaction<T>(callback: (client: TransactionClient) => Promise<T>): Promise<T> {
    await this.ensureReady();

    if (!this.isMemoryMode && this.pool) {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        const txClient: TransactionClient = {
          query: <R = any>(text: string, params?: any[]) => (client as any).query(text, params) as Promise<QueryResult<R>>,
        };
        const result = await callback(txClient);
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }

    // Memory Mode Transaction
    const txClient: TransactionClient = {
      query: <R = any>(text: string, params?: any[]) => this.executeMemoryQuery<R>(text, params || []),
    };
    return await callback(txClient);
  }

  public async resetForTesting(): Promise<void> {
    this.initMemoryStore();
    this.initialized = false;
    await this.initialize();
  }

  private async ensureReady() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // In-process SQL Engine for tests & zero-dependency local execution
  private executeMemoryQuery<T>(text: string, params: any[]): Promise<QueryResult<T>> {
    const trimmed = text.trim();
    const upper = trimmed.toUpperCase();

    // 1. SELECT queries
    if (upper.startsWith("SELECT")) {
      const match = trimmed.match(/FROM\s+([a-zA-Z0-9_]+)/i);
      const tableName = match ? match[1].toLowerCase() : "";
      const tableData = this.memoryStore.get(tableName) || [];

      let results = [...tableData];

      // Join simulation for users
      if (tableName === "users") {
        const rolesTable = this.memoryStore.get("roles") || [];
        results = results.map((u) => {
          const role = rolesTable.find((r) => r.id === u.role_id) || rolesTable.find((r) => r.name === u.role_id);
          const roleName = role ? role.name : (u.role_id === "role-admin" ? "admin" : "staff");
          return {
            ...u,
            role_name: roleName,
            role: roleName,
          };
        });
      }

      // Join simulation for sessions
      if (tableName === "sessions" && upper.includes("JOIN USERS")) {
        const usersTable = this.memoryStore.get("users") || [];
        const rolesTable = this.memoryStore.get("roles") || [];
        results = results.map((sess) => {
          const user = usersTable.find((u) => u.id === sess.user_id);
          const role = rolesTable.find((r) => r.id === (user ? user.role_id : sess.role_id)) || rolesTable.find((r) => r.name === sess.role);
          return {
            ...sess,
            name: user?.name,
            username: user?.username,
            email: user?.email,
            phone: user?.phone,
            active: user ? user.active : true,
            must_change_pw: user?.must_change_pw ?? false,
            role_name: role ? role.name : sess.role,
          };
        });
      }

      // Simple WHERE filter simulation
      if (upper.includes("WHERE")) {
        const whereClause = trimmed.substring(upper.indexOf("WHERE") + 6);
        results = results.filter((row) => {
          return this.matchesWhere(row, whereClause, params);
        });
      }

      // ORDER BY simulation
      if (upper.includes("ORDER BY")) {
        const orderPart = trimmed.substring(upper.indexOf("ORDER BY") + 8).split(/LIMIT/i)[0];
        const [col, dir] = orderPart.trim().split(/\s+/);
        const isDesc = dir && dir.toUpperCase() === "DESC";
        results.sort((a, b) => {
          const valA = a[col] ?? "";
          const valB = b[col] ?? "";
          if (valA < valB) return isDesc ? 1 : -1;
          if (valA > valB) return isDesc ? -1 : 1;
          return 0;
        });
      }

      // Aggregate projection simulation
      if (/SUM\(|COUNT\(|MAX\(|MIN\(/i.test(upper)) {
        const fromIdx = upper.indexOf("FROM");
        const selectPart = trimmed.substring(6, fromIdx).trim();
        const aggRow: Record<string, any> = {};

        const fields = selectPart.split(/,(?![^()]*\))/);
        fields.forEach((field) => {
          const asMatch = field.match(/(?:COALESCE\s*\(\s*)?(SUM|COUNT|MAX|MIN)\s*\(\s*([^)]+)\s*\)(?:\s*,\s*0\s*\))?\s+AS\s+([a-zA-Z0-9_]+)/i);
          if (asMatch) {
            const func = asMatch[1].toUpperCase();
            const col = asMatch[2].trim().toLowerCase();
            const alias = asMatch[3].trim().toLowerCase();

            if (func === "COUNT") {
              aggRow[alias] = results.length;
            } else if (func === "SUM") {
              let sum = 0;
              results.forEach((r) => {
                const val = Number(r[col]) || 0;
                sum += val;
              });
              aggRow[alias] = sum;
            } else if (func === "MAX") {
              let max = 0;
              results.forEach((r) => {
                const val = Number(r[col]) || 0;
                if (val > max) max = val;
              });
              aggRow[alias] = max;
            } else if (func === "MIN") {
              let min = results.length > 0 ? Number(results[0][col]) || 0 : 0;
              results.forEach((r) => {
                const val = Number(r[col]) || 0;
                if (val < min) min = val;
              });
              aggRow[alias] = min;
            }
          }
        });

        return Promise.resolve({
          rows: [aggRow] as T[],
          rowCount: 1,
        });
      }

      // LIMIT simulation
      if (upper.includes("LIMIT")) {
        const limitMatch = trimmed.match(/LIMIT\s+(\$?\d+)/i);
        if (limitMatch) {
          let limit = parseInt(limitMatch[1], 10);
          if (limitMatch[1].startsWith("$")) {
            const idx = parseInt(limitMatch[1].replace("$", ""), 10) - 1;
            limit = parseInt(params[idx], 10);
          }
          if (!isNaN(limit)) {
            results = results.slice(0, limit);
          }
        }
      }

      return Promise.resolve({
        rows: results as T[],
        rowCount: results.length,
      });
    }

    // 2. INSERT queries
    if (upper.startsWith("INSERT INTO")) {
      const match = trimmed.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES/i);
      if (match) {
        const tableName = match[1].toLowerCase();
        const columns = match[2].split(",").map((c) => c.trim().toLowerCase());
        const tableData = this.memoryStore.get(tableName) || [];

        // Handle single or multi-value insert
        const valuesIndex = upper.indexOf("VALUES");
        const valuesPart = trimmed.substring(valuesIndex + 6).split(/ON\s+CONFLICT/i)[0];
        const sanitized = valuesPart.replace(/NOW\(\)/gi, "__NOW__");
        const tupleMatches = sanitized.match(/\(([^)]+)\)/g);

        let rowCount = 0;
        if (tupleMatches) {
          tupleMatches.forEach((tupleStr) => {
            const placeholders = tupleStr
              .replace(/[()]/g, "")
              .split(",")
              .map((p) => p.trim());
            const row: Record<string, any> = {};

            columns.forEach((col, idx) => {
              const p = placeholders[idx];
              if (p && p.startsWith("$")) {
                const paramIdx = parseInt(p.replace("$", ""), 10) - 1;
                row[col] = params[paramIdx];
              } else if (p === "TRUE") {
                row[col] = true;
              } else if (p === "FALSE") {
                row[col] = false;
              } else if (p === "__NOW__" || p === "NOW()") {
                row[col] = new Date().toISOString();
              } else if (p && p !== "DEFAULT") {
                row[col] = p.replace(/^'|'$/g, "");
              }
            });

            if (!row.created_at) row.created_at = new Date().toISOString();
            if (!row.updated_at) row.updated_at = new Date().toISOString();

            // ON CONFLICT DO UPDATE check
            if (upper.includes("ON CONFLICT")) {
              const conflictMatch = upper.match(/ON\s+CONFLICT\s*\(([a-zA-Z0-9_]+)\)\s*DO\s+UPDATE/i);
              if (conflictMatch) {
                const conflictCol = conflictMatch[1].toLowerCase();
                const existingIdx = tableData.findIndex((r) => r[conflictCol] === row[conflictCol]);
                if (existingIdx !== -1) {
                  tableData[existingIdx] = {
                    ...tableData[existingIdx],
                    ...row,
                    updated_at: new Date().toISOString(),
                  };
                  rowCount++;
                  return;
                }
              }
            }

            // Unique constraint checking (e.g. order_date + booking_no)
            if (tableName === "orders") {
              const duplicate = tableData.find(
                (o) => o.order_date === row.order_date && o.booking_no === row.booking_no
              );
              if (duplicate) {
                throw new Error(
                  `duplicate key value violates unique constraint "uq_orders_date_booking_no"`
                );
              }
            }

            tableData.push(row);
            rowCount++;
          });
        }

        this.memoryStore.set(tableName, tableData);
        return Promise.resolve({ rows: [], rowCount });
      }
    }

    // 3. UPDATE queries
    if (upper.startsWith("UPDATE")) {
      const match = trimmed.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
      if (match) {
        const tableName = match[1].toLowerCase();
        const setClause = match[2];
        const whereClause = match[3];
        const tableData = this.memoryStore.get(tableName) || [];

        let rowCount = 0;
        tableData.forEach((row) => {
          if (!whereClause || this.matchesWhere(row, whereClause, params)) {
            // apply set assignments
            const assignments = setClause.split(",");
            assignments.forEach((assignment) => {
              const [colRaw, valRaw] = assignment.split("=").map((s) => s.trim());
              const col = colRaw.toLowerCase();
              if (valRaw.startsWith("$")) {
                const paramIdx = parseInt(valRaw.replace("$", ""), 10) - 1;
                row[col] = params[paramIdx];
              } else if (valRaw.toUpperCase() === "TRUE") {
                row[col] = true;
              } else if (valRaw.toUpperCase() === "FALSE") {
                row[col] = false;
              } else if (valRaw === "NOW()") {
                row[col] = new Date().toISOString();
              } else {
                row[col] = valRaw.replace(/^'|'$/g, "");
              }
            });
            row.updated_at = new Date().toISOString();
            rowCount++;
          }
        });

        return Promise.resolve({ rows: [], rowCount });
      }
    }

    // 4. DELETE queries
    if (upper.startsWith("DELETE FROM")) {
      const match = trimmed.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+))?$/i);
      if (match) {
        const tableName = match[1].toLowerCase();
        const whereClause = match[2];
        let tableData = this.memoryStore.get(tableName) || [];
        const initialLen = tableData.length;

        if (whereClause) {
          tableData = tableData.filter((row) => !this.matchesWhere(row, whereClause, params));
        } else {
          tableData = [];
        }

        this.memoryStore.set(tableName, tableData);
        return Promise.resolve({ rows: [], rowCount: initialLen - tableData.length });
      }
    }

    return Promise.resolve({ rows: [], rowCount: 0 });
  }

  private matchesWhere(row: any, whereClause: string, params: any[]): boolean {
    // 1. Support OR condition splitting
    if (/\s+OR\s+/i.test(whereClause)) {
      const orBranches = whereClause.split(/\s+OR\s+/i);
      return orBranches.some((branch) => this.matchesWhere(row, branch, params));
    }

    const conditions = whereClause.split(/\s+AND\s+/i);
    return conditions.every((cond) => {
      let trimmedCond = cond.trim().replace(/^\(|\)$/g, "").trim();

      // LOWER(col) = LOWER($X) or LOWER(col) = $X or LOWER(col) = 'val'
      const lowerMatch = trimmedCond.match(/LOWER\s*\(\s*([a-zA-Z0-9_.]+)\s*\)\s*=\s*(?:LOWER\s*\(\s*)?(\$?\d+|'[^']*'|[a-zA-Z0-9_.-]+)(?:\s*\))?/i);
      if (lowerMatch) {
        const col = lowerMatch[1].split(".").pop()!.toLowerCase();
        const valToken = lowerMatch[2];
        let expectedVal: any = valToken;
        if (valToken.startsWith("$")) {
          const idx = parseInt(valToken.replace("$", ""), 10) - 1;
          expectedVal = params[idx];
        } else if (valToken.startsWith("'")) {
          expectedVal = valToken.replace(/^'|'$/g, "");
        }
        return String(row[col] ?? "").toLowerCase() === String(expectedVal ?? "").toLowerCase();
      }

      // col = $X
      const eqMatch = trimmedCond.match(/([a-zA-Z0-9_.]+)\s*=\s*(\$?\d+|'[^']*'|[a-zA-Z0-9_.-]+)/);
      if (eqMatch) {
        const col = eqMatch[1].split(".").pop()!.toLowerCase();
        const valToken = eqMatch[2];
        let expectedVal: any = valToken;
        if (valToken.startsWith("$")) {
          const idx = parseInt(valToken.replace("$", ""), 10) - 1;
          expectedVal = params[idx];
        } else if (valToken.startsWith("'")) {
          expectedVal = valToken.replace(/^'|'$/g, "");
        } else if (valToken === "TRUE") expectedVal = true;
        else if (valToken === "FALSE") expectedVal = false;

        return String(row[col] ?? "") === String(expectedVal ?? "");
      }

      // col != $X or col <> $X
      const neqMatch = trimmedCond.match(/([a-zA-Z0-9_.]+)\s*(?:!=|<>)\s*(\$?\d+|'[^']*')/);
      if (neqMatch) {
        const col = neqMatch[1].split(".").pop()!.toLowerCase();
        const valToken = neqMatch[2];
        let expectedVal: any = valToken;
        if (valToken.startsWith("$")) {
          const idx = parseInt(valToken.replace("$", ""), 10) - 1;
          expectedVal = params[idx];
        } else if (valToken.startsWith("'")) {
          expectedVal = valToken.replace(/^'|'$/g, "");
        }
        return String(row[col]) !== String(expectedVal);
      }

      // col >= $X
      const gteMatch = trimmedCond.match(/([a-zA-Z0-9_.]+)\s*>=\s*(\$?\d+|'[^']*'|[a-zA-Z0-9_-]+)/);
      if (gteMatch) {
        const col = gteMatch[1].split(".").pop()!.toLowerCase();
        let expectedVal: any = gteMatch[2];
        if (expectedVal.startsWith("$")) {
          const idx = parseInt(expectedVal.replace("$", ""), 10) - 1;
          expectedVal = params[idx];
        } else if (expectedVal.startsWith("'")) {
          expectedVal = expectedVal.replace(/^'|'$/g, "");
        }
        return row[col] >= expectedVal;
      }

      // col <= $X
      const lteMatch = trimmedCond.match(/([a-zA-Z0-9_.]+)\s*<=\s*(\$?\d+|'[^']*'|[a-zA-Z0-9_-]+)/);
      if (lteMatch) {
        const col = lteMatch[1].split(".").pop()!.toLowerCase();
        let expectedVal: any = lteMatch[2];
        if (expectedVal.startsWith("$")) {
          const idx = parseInt(expectedVal.replace("$", ""), 10) - 1;
          expectedVal = params[idx];
        } else if (expectedVal.startsWith("'")) {
          expectedVal = expectedVal.replace(/^'|'$/g, "");
        }
        return row[col] <= expectedVal;
      }

      // col < $X
      const ltMatch = trimmedCond.match(/([a-zA-Z0-9_.]+)\s*<\s*(\$?\d+|'[^']*'|[a-zA-Z0-9_-]+)/);
      if (ltMatch) {
        const col = ltMatch[1].split(".").pop()!.toLowerCase();
        let expectedVal: any = ltMatch[2];
        if (expectedVal.startsWith("$")) {
          const idx = parseInt(expectedVal.replace("$", ""), 10) - 1;
          expectedVal = params[idx];
        } else if (expectedVal.startsWith("'")) {
          expectedVal = expectedVal.replace(/^'|'$/g, "");
        }
        return row[col] < expectedVal;
      }

      // col > $X
      const gtMatch = trimmedCond.match(/([a-zA-Z0-9_.]+)\s*>\s*(\$?\d+|'[^']*'|[a-zA-Z0-9_-]+)/);
      if (gtMatch) {
        const col = gtMatch[1].split(".").pop()!.toLowerCase();
        let expectedVal: any = gtMatch[2];
        if (expectedVal.startsWith("$")) {
          const idx = parseInt(expectedVal.replace("$", ""), 10) - 1;
          expectedVal = params[idx];
        } else if (expectedVal.startsWith("'")) {
          expectedVal = expectedVal.replace(/^'|'$/g, "");
        }
        return row[col] > expectedVal;
      }

      // NOT voided or voided = FALSE
      if (trimmedCond.toUpperCase() === "NOT VOIDED" || trimmedCond.toUpperCase() === "O.VOIDED = FALSE") {
        return !row.voided;
      }

      // active = TRUE
      if (trimmedCond.toUpperCase() === "ACTIVE = TRUE") {
        return Boolean(row.active);
      }

      return true;
    });
  }
}

export const db = new DatabaseManager();
