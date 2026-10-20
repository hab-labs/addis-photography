import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../db/client";
import { migrateExcelBookings, ExcelRowInput } from "../services/migration.service";
import { createOrder, getOrderById, updateOrderStatus, voidOrder, getStudioTodayDate } from "../services/order.service";
import { recordPayment, voidPayment } from "../services/payment.service";
import { createPhotoType, updatePhotoType, listPhotoTypes } from "../services/price.service";
import { getDailyReport, getRangeReport } from "../services/report.service";
import { createAlbum, updateAlbumAccess, getAlbumById, extendAlbumRetention } from "../services/album.service";
import { handleChunkUpload, finalizeChunkedUpload, listMediaForAlbum } from "../services/media.service";
import { getPublicAlbumView, unlockPrivateAlbum, isAlbumSessionUnlocked } from "../services/public-viewer.service";
import { getStorageMetrics } from "../services/storage.service";
import { runRetentionCleanupJob } from "../jobs/expiry-cleanup.job";
import { getAuditLogs } from "../services/audit.service";
import { rateLimiter } from "../auth/rate-limiter";
import { hashPin } from "../auth/crypto";
import { createZipArchive } from "../utils/zip";
import fs from "fs";
import path from "path";

import { createCustomer } from "../services/customer.service";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { POST as changePasswordHandler } from "@/app/api/auth/change-password/route";
import { middleware } from "@/middleware";
import { NextRequest } from "next/server";

describe("Addis Photography - Specification Acceptance Tests (Section 15)", () => {
  const adminActor = { id: "usr-1", name: "Yonas Mekonnen", role: "admin" };
  const staffActor = { id: "usr-2", name: "Selamawit Tadesse", role: "staff" };

  async function getOrCreateTestCustomer() {
    const existing = await db.query("SELECT id FROM customers LIMIT 1");
    if (existing.rows.length > 0) return existing.rows[0];
    const created = await createCustomer({ name: "Abebe Test", phone: "+251911999900" }, staffActor);
    return created.customer;
  }

  beforeEach(async () => {
    await db.resetForTesting();
    rateLimiter.clear();
  });

  // Test Case 1: Excel rows 8-10 grouping
  it("Test Case 1 (FR-1, FR-4): Excel Rows 8-10 grouping into 1 customer and 1 order with 3 items", async () => {
    const rows: ExcelRowInput[] = [
      {
        row_number: 8,
        date: "2026-03-01",
        booking_no: 1,
        customer_name: "Almaz Kebede",
        phone: "0911223344",
        photo_type: "10x15",
        quantity: 2,
        unit_price: 150,
        paid: 300,
        payment_method: "Telebirr",
      },
      {
        row_number: 9,
        date: "2026-03-01",
        booking_no: 1,
        customer_name: "Almaz Kebede",
        phone: "0911223344",
        photo_type: "30x45",
        quantity: 1,
        unit_price: 800,
        paid: 0,
      },
      {
        row_number: 10,
        date: "2026-03-01",
        booking_no: 1,
        customer_name: "Almaz Kebede",
        phone: "0911223344",
        photo_type: "3x4",
        quantity: 4,
        unit_price: 50,
        paid: 0,
      },
    ];

    const summary = await migrateExcelBookings(rows, adminActor);
    expect(summary.total_rows_read).toBe(3);
    expect(summary.orders_created).toBe(1);
    expect(summary.items_created).toBe(3);
    expect(summary.customers_created).toBe(1);
    expect(summary.repaired_phones.length).toBe(3);
    expect(summary.repaired_phones[0].normalized).toBe("+251911223344");
  });

  // Test Case 2: Daily booking numbers 1 and 2 for consecutive bookings on the same studio day
  it("Test Case 2 (FR-6): Daily booking numbers 1 and 2 assigned consecutively on same studio day", async () => {
    const today = getStudioTodayDate();

    const order1 = await createOrder(
      {
        customer_name: "Customer One",
        customer_phone: "0911000001",
        order_date: today,
        items: [{ photo_type_name: "10x15", quantity: 1, unit_price: "150.00" }],
      },
      staffActor
    );

    const order2 = await createOrder(
      {
        customer_name: "Customer Two",
        customer_phone: "0911000002",
        order_date: today,
        items: [{ photo_type_name: "10x15", quantity: 1, unit_price: "150.00" }],
      },
      staffActor
    );

    expect(order1.booking_no).toBe(1);
    expect(order2.booking_no).toBe(2);
  });

  // Test Case 3: Next studio day resets booking number to 1
  it("Test Case 3 (FR-6): Subsequent calendar day in Africa/Addis_Ababa resets booking number to 1", async () => {
    const day1 = "2026-10-01";
    const day2 = "2026-10-02";

    const orderDay1 = await createOrder(
      {
        customer_name: "Client Day One",
        customer_phone: "0911111111",
        order_date: day1,
        items: [{ photo_type_name: "10x15", quantity: 1, unit_price: "150.00" }],
      },
      staffActor
    );

    const orderDay2 = await createOrder(
      {
        customer_name: "Client Day Two",
        customer_phone: "0911222222",
        order_date: day2,
        items: [{ photo_type_name: "10x15", quantity: 1, unit_price: "150.00" }],
      },
      staffActor
    );

    expect(orderDay1.booking_no).toBe(1);
    expect(orderDay2.booking_no).toBe(1);
  });

  // Test Case 4: Overpayment rejection on the server
  it("Test Case 4 (FR-8): Server-side overpayment rejection", async () => {
    const order = await createOrder(
      {
        customer_name: "Overpayment Test",
        customer_phone: "0911333333",
        items: [{ photo_type_name: "10x15", quantity: 2, unit_price: "500.00" }], // Total = 1000.00
      },
      adminActor
    );

    expect(order.order_total).toBe("1000.00");
    expect(order.balance_amount).toBe("1000.00");

    await expect(
      recordPayment(
        {
          order_id: order.id,
          amount: "1500.00",
          method: "Cash",
        },
        staffActor
      )
    ).rejects.toThrow(/overpayment rejected/i);
  });

  // Test Case 5: Exact balance completion with partial payments
  it("Test Case 5 (FR-8): Deposit followed by balance payment reaches exactly zero balance", async () => {
    const order = await createOrder(
      {
        customer_name: "Installment Customer",
        customer_phone: "0911444444",
        items: [{ photo_type_name: "10x15", quantity: 1, unit_price: "1000.00" }],
        initial_payment: { amount: "400.00", method: "Cash" },
      },
      adminActor
    );

    expect(order.paid_amount).toBe("400.00");
    expect(order.balance_amount).toBe("600.00");

    const updated = await recordPayment(
      {
        order_id: order.id,
        amount: "600.00",
        method: "Telebirr",
      },
      staffActor
    );

    expect(updated.paid_amount).toBe("1000.00");
    expect(updated.balance_amount).toBe("0.00");
  });

  // Test Case 6: Unconfigured price photo type order creation
  it("Test Case 6 (FR-5): Photo type with null standard price requires manual unit price", async () => {
    const customType = await createPhotoType(
      {
        name: "Custom Panoramic Print",
        standard_price: null,
      },
      adminActor
    );

    expect(customType.standard_price).toBeNull();

    const order = await createOrder(
      {
        customer_name: "Custom Print Buyer",
        customer_phone: "0911555555",
        items: [{ photo_type_name: customType.name, quantity: 2, unit_price: "450.00" }],
      },
      staffActor
    );

    expect(order.order_total).toBe("900.00");
    expect(order.items[0].unit_price).toBe("450.00");
  });

  // Test Case 7: Admin-only price override & audit log recording
  it("Test Case 7 (FR-5, FR-7): Admin changes standard price and creates audit log", async () => {
    const photoTypes = await listPhotoTypes();
    const targetType = photoTypes.find((pt) => pt.name === "10x15") || photoTypes[0];

    await updatePhotoType(targetType.id, { standard_price: "185.00" }, adminActor);

    const logs = await getAuditLogs(10);
    const priceLog = logs.find((l) => l.action === "PHOTO_TYPE_UPDATED");

    expect(priceLog).toBeDefined();
    expect(priceLog?.details.new.standard_price).toBe("185.00");
  });

  // Test Case 8: Order delivery balance warning confirmation
  it("Test Case 8 (FR-9): Delivering unpaid order requires balance confirmation", async () => {
    const order = await createOrder(
      {
        customer_name: "Delivery Balance Test",
        customer_phone: "0911666666",
        items: [{ photo_type_name: "10x15", quantity: 1, unit_price: "500.00" }],
      },
      adminActor
    );

    // Attempting delivery without acknowledging balance fails
    await expect(
      updateOrderStatus(order.id, "Delivered", staffActor, false)
    ).rejects.toThrow(/outstanding balance/i);

    // Acknowledging balance allows delivery
    const delivered = await updateOrderStatus(order.id, "Delivered", staffActor, true);
    expect(delivered.status).toBe("Delivered");
  });

  // Test Case 9: Order voiding by Admin requires mandatory reason
  it("Test Case 9 (FR-10): Only admin can void order with mandatory reason, preserving booking number", async () => {
    const order = await createOrder(
      {
        customer_name: "Void Order Test",
        customer_phone: "0911777777",
        items: [{ photo_type_name: "10x15", quantity: 1, unit_price: "200.00" }],
      },
      adminActor
    );

    const bookingNo = order.booking_no;

    // Staff cannot void
    await expect(voidOrder(order.id, "Customer cancelled", staffActor as any)).rejects.toThrow(/forbidden/i);

    // Empty reason fails
    await expect(voidOrder(order.id, "", adminActor)).rejects.toThrow(/mandatory reason/i);

    const voided = await voidOrder(order.id, "Client changed mind before printing", adminActor);
    expect(voided.voided).toBe(true);
    expect(voided.void_reason).toBe("Client changed mind before printing");
    expect(voided.booking_no).toBe(bookingNo); // Booking number preserved
  });

  // Test Case 10: Payment voiding by Admin recalculates balance
  it("Test Case 10 (FR-8, FR-10): Voiding payment restores outstanding balance", async () => {
    const order = await createOrder(
      {
        customer_name: "Void Payment Test",
        customer_phone: "0911888888",
        items: [{ photo_type_name: "10x15", quantity: 1, unit_price: "750.00" }],
        initial_payment: { amount: "750.00", method: "Cash" },
      },
      adminActor
    );

    expect(order.balance_amount).toBe("0.00");
    const paymentId = order.payments[0].id;

    const afterVoid = await voidPayment(paymentId, "Bounced check / refund", adminActor);
    expect(afterVoid.paid_amount).toBe("0.00");
    expect(afterVoid.balance_amount).toBe("750.00");
  });

  // Test Case 11: Booking-date vs Payment-date financial reporting separation
  it("Test Case 11 (FR-15, FR-16): Booking-date view separates from payment-date cash collections", async () => {
    const day1 = "2026-03-10";
    const day5 = "2026-03-15";

    // Order created on Day 1 with 300 deposit
    const order = await createOrder(
      {
        customer_name: "Reporting Test Client",
        customer_phone: "0911999999",
        order_date: day1,
        items: [{ photo_type_name: "10x15", quantity: 1, unit_price: "1000.00" }],
        initial_payment: { amount: "300.00", method: "Cash" },
      },
      adminActor
    );

    // Debt collected on Day 5
    await recordPayment(
      {
        order_id: order.id,
        amount: "700.00",
        method: "Telebirr",
        payment_date: day5,
      },
      staffActor
    );

    // Day 1 Report: Booking total_value = 1000, total_paid on day 1 orders = 1000, cash_received_today = 300
    const day1Report = await getDailyReport(day1);
    expect(day1Report.total_value).toBe("1000.00");
    expect(day1Report.cash_received_today).toBe("300.00");

    // Day 5 Report: No bookings created today, cash_received_today = 700.00
    const day5Report = await getDailyReport(day5);
    expect(day5Report.bookings_count).toBe(0);
    expect(day5Report.total_value).toBe("0.00");
    expect(day5Report.cash_received_today).toBe("700.00");
  });

  // Test Case 12: Private album PIN creation (4-6 digits) & hash storage
  it("Test Case 12 (FR-20): Private album requires 4-6 digit numeric PIN and stores hash", async () => {
    const customer = await getOrCreateTestCustomer();

    // Invalid PIN (<4 digits) fails
    await expect(
      createAlbum(
        {
          customer_id: customer.id,
          title: "Invalid PIN Album",
          event_date: "2026-03-20",
          visibility: "Private",
          pin: "12",
        },
        staffActor
      )
    ).rejects.toThrow(/4 to 6 digit/i);

    const validAlbum = await createAlbum(
      {
        customer_id: customer.id,
        title: "Secure Wedding Album",
        event_date: "2026-03-20",
        visibility: "Private",
        pin: "4829",
      },
      staffActor
    );

    expect(validAlbum.pin_set).toBe(true);

    const rawDb = await db.query("SELECT pin_hash FROM albums WHERE id = $1", [validAlbum.id]);
    expect(rawDb.rows[0].pin_hash).toBe(hashPin("4829"));
  });

  // Test Case 13: 5 failed PIN attempts triggers 15-minute lockout
  it("Test Case 13 (FR-21): 5 failed PIN attempts activates 15-minute rate limit lockout", async () => {
    const customer = await getOrCreateTestCustomer();
    const album = await createAlbum(
      {
        customer_id: customer.id,
        title: "Rate Limit Album",
        event_date: "2026-03-21",
        visibility: "Private",
        pin: "9999",
      },
      staffActor
    );

    const testIp = "192.168.1.55";

    // 4 failed attempts
    for (let i = 0; i < 4; i++) {
      const res = await unlockPrivateAlbum(album.token, "0000", testIp);
      expect(res.success).toBe(false);
      expect(res.retryAfterSeconds).toBeUndefined();
    }

    // 5th failed attempt triggers 15-minute lock (900 seconds)
    const fifthAttempt = await unlockPrivateAlbum(album.token, "0000", testIp);
    expect(fifthAttempt.success).toBe(false);
    expect(fifthAttempt.retryAfterSeconds).toBe(900);

    // Subsequent attempt is blocked even with correct PIN
    const blockedAttempt = await unlockPrivateAlbum(album.token, "9999", testIp);
    expect(blockedAttempt.success).toBe(false);
    expect(blockedAttempt.error).toMatch(/rate limit active/i);
  });

  // Test Case 14: Correct PIN generates 24-hr unlock session token
  it("Test Case 14 (FR-21): Valid PIN generates 24-hr unlock token", async () => {
    const customer = await getOrCreateTestCustomer();
    const album = await createAlbum(
      {
        customer_id: customer.id,
        title: "Unlock Token Album",
        event_date: "2026-03-22",
        visibility: "Private",
        pin: "5544",
      },
      staffActor
    );

    const result = await unlockPrivateAlbum(album.token, "5544", "10.0.0.1");
    expect(result.success).toBe(true);
    expect(result.unlockToken).toBeDefined();

    const isUnlocked = await isAlbumSessionUnlocked(album.id, result.unlockToken);
    expect(isUnlocked).toBe(true);
  });

  // Test Case 15: Changing PIN or switching to Private immediately revokes unlock sessions
  it("Test Case 15 (FR-20, FR-22): Changing PIN immediately invalidates all active unlock sessions", async () => {
    const customer = await getOrCreateTestCustomer();
    const album = await createAlbum(
      {
        customer_id: customer.id,
        title: "Session Revocation Album",
        event_date: "2026-03-23",
        visibility: "Private",
        pin: "1122",
      },
      staffActor
    );

    const unlock = await unlockPrivateAlbum(album.token, "1122", "10.0.0.2");
    expect(await isAlbumSessionUnlocked(album.id, unlock.unlockToken)).toBe(true);

    // Admin updates PIN
    await updateAlbumAccess(album.id, { visibility: "Private", pin: "3344" }, adminActor);

    // Old unlock session is immediately revoked
    const isStillUnlocked = await isAlbumSessionUnlocked(album.id, unlock.unlockToken);
    expect(isStillUnlocked).toBe(false);
  });

  // Test Case 16: Public viewer respects allow_download = false
  it("Test Case 16 (FR-23): Public album view reflects allow_download = false", async () => {
    const customer = await getOrCreateTestCustomer();
    const album = await createAlbum(
      {
        customer_id: customer.id,
        title: "No Downloads Allowed Album",
        event_date: "2026-03-24",
        visibility: "Public",
        allow_download: false,
      },
      staffActor
    );

    const view = await getPublicAlbumView(album.token);
    expect(view.status).toBe("active");
    expect(view.album?.allow_download).toBe(false);
  });

  // Test Case 17: Staff user accessing /api/reports returns 403 Forbidden
  it("Test Case 17 (FR-17, FR-35): Staff user receives 403 Forbidden for financial reports", async () => {
    const request = new Request("http://localhost:3000/api/reports/daily");
    // requireAdmin with staff role must throw AuthError with 403
    const { requireAdmin } = await import("../auth/rbac");

    const mockRequest = {
      headers: new Headers({
        cookie: "addis_session_id=mock_staff_session",
      }),
    } as unknown as Request;

    // Simulate staff session in DB
    await db.query(
      `INSERT INTO sessions (id, user_id, role, expires_at, created_at)
       VALUES ('mock_staff_session', 'usr-2', 'staff', NOW() + INTERVAL '1 hour', NOW())`
    );

    await expect(requireAdmin(mockRequest)).rejects.toThrow(/forbidden.*administrator/i);
  });

  // Test Case 18: Chunked upload assembly into media storage directory
  it("Test Case 18 (FR-25): Assembles multi-chunk upload into complete media file", async () => {
    const customer = await getOrCreateTestCustomer();
    const album = await createAlbum(
      {
        customer_id: customer.id,
        title: "Chunk Upload Album",
        event_date: "2026-03-25",
        visibility: "Public",
      },
      staffActor
    );

    const uploadId = `test_up_${Date.now()}`;
    const chunk0 = Buffer.from("Addis Photography ");
    const chunk1 = Buffer.from("Chunk Assembly Test");

    await handleChunkUpload(uploadId, 0, chunk0);
    await handleChunkUpload(uploadId, 1, chunk1);

    const media = await finalizeChunkedUpload(
      album.id,
      uploadId,
      2,
      "test_photo.jpg",
      chunk0.length + chunk1.length,
      "image/jpeg",
      staffActor
    );

    expect(media.album_id).toBe(album.id);
    expect(media.original_name).toBe("test_photo.jpg");
    expect(media.status).toBe("ready");

    const mediaList = await listMediaForAlbum(album.id);
    expect(mediaList.length).toBe(1);
  });

  // Test Case 19: Storage capacity alert triggers at 80% usage
  it("Test Case 19 (FR-33): Storage metrics trigger is_warning = true at 80% capacity", async () => {
    // Set 1 GB storage with 80% threshold
    await db.query(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ('storage_config', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [JSON.stringify({ total_capacity_gb: 1, alert_threshold_percent: 80 })]
    );

    // Insert 850 MB of media records (85% of 1GB)
    const bytes850Mb = 850 * 1024 * 1024;
    await db.query(
      `INSERT INTO media (id, album_id, type, original_name, path_web, size_bytes, mime_type, status, created_at)
       VALUES ('med-bulk', 'alb-test', 'photo', 'bulk.jpg', '/test', $1, 'image/jpeg', 'ready', NOW())`,
      [bytes850Mb]
    );

    const metrics = await getStorageMetrics();
    expect(metrics.usage_percentage).toBeGreaterThanOrEqual(80);
    expect(metrics.is_warning).toBe(true);
  });

  // Test Case 20: 7-day grace period cleanup permanently purges expired album media
  it("Test Case 20 (FR-34): 7-day grace period retention cleanup job purges expired album media", async () => {
    const customer = await getOrCreateTestCustomer();

    // Create album expired 10 days ago (past the 7-day grace period)
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const expiredAlbum = await createAlbum(
      {
        customer_id: customer.id,
        title: "Purge Eligible Album",
        event_date: "2025-01-01",
        retention_days: 1,
      },
      staffActor
    );

    await db.query(`UPDATE albums SET expires_at = $1 WHERE id = $2`, [tenDaysAgo, expiredAlbum.id]);

    // Create album expired 2 days ago (within 7-day grace period -> should NOT be purged)
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const graceAlbum = await createAlbum(
      {
        customer_id: customer.id,
        title: "Grace Period Protected Album",
        event_date: "2025-01-01",
        retention_days: 1,
      },
      staffActor
    );

    await db.query(`UPDATE albums SET expires_at = $1 WHERE id = $2`, [twoDaysAgo, graceAlbum.id]);

    const cleanupResult = await runRetentionCleanupJob();
    expect(cleanupResult.purged_albums).toBeGreaterThanOrEqual(1);

    // Expired album is gone
    const fetchedExpired = await getAlbumById(expiredAlbum.id);
    expect(fetchedExpired).toBeNull();

    // Grace album is preserved
    const fetchedGrace = await getAlbumById(graceAlbum.id);
    expect(fetchedGrace).toBeDefined();
  });

  it("authenticates seeded users and sets both addis_session_id and addis_auth_role cookies", async () => {
    // 1. Admin login with username
    const reqYonas = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "yonas", password: "yonas123" }),
    });
    const resYonas = await loginHandler(reqYonas);
    expect(resYonas.status).toBe(200);
    const dataYonas = await resYonas.json();
    expect(dataYonas.user.username).toBe("yonas");
    expect(dataYonas.user.role).toBe("admin");

    const cookieHeader = resYonas.headers.get("set-cookie") || "";
    expect(cookieHeader).toContain("addis_session_id=");
    expect(cookieHeader).toContain("addis_auth_role=admin");

    // 2. Staff login with username
    const reqSelam = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "selam", password: "selam123" }),
    });
    const resSelam = await loginHandler(reqSelam);
    expect(resSelam.status).toBe(200);
    const dataSelam = await resSelam.json();
    expect(dataSelam.user.username).toBe("selam");
    expect(dataSelam.user.role).toBe("staff");

    const staffCookies = resSelam.headers.get("set-cookie") || "";
    expect(staffCookies).toContain("addis_session_id=");
    expect(staffCookies).toContain("addis_auth_role=staff");

    // 3. Login with email
    const reqEmail = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "yonas@addisphoto.et", password: "yonas123" }),
    });
    const resEmail = await loginHandler(reqEmail);
    expect(resEmail.status).toBe(200);

    // 4. Bad password fails with 401
    const reqBad = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "yonas", password: "wrongpassword" }),
    });
    const resBad = await loginHandler(reqBad);
    expect(resBad.status).toBe(401);
  });

  it("locks account after 5 failed login attempts for 15 minutes (HTTP 429)", async () => {
    const testUser = "dawit";
    for (let i = 0; i < 4; i++) {
      const req = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: testUser, password: "wrongpassword" }),
      });
      const res = await loginHandler(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toMatch(/attempt.*remaining/i);
    }

    // 5th failed attempt triggers 15-minute lockout (HTTP 429)
    const req5 = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: testUser, password: "wrongpassword" }),
    });
    const res5 = await loginHandler(req5);
    expect(res5.status).toBe(429);
    const data5 = await res5.json();
    expect(data5.error).toMatch(/locked for 15 minutes/i);

    // Subsequent attempt is blocked immediately even with the correct password
    const reqBlocked = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: testUser, password: "dawit123" }),
    });
    const resBlocked = await loginHandler(reqBlocked);
    expect(resBlocked.status).toBe(429);
  });

  it("enforces first-time login password change requirement and cookie lifecycle", async () => {
    // 1. Mark user as needing password change
    await db.query("UPDATE users SET must_change_pw = TRUE WHERE username = 'selam'");

    // 2. Login returns must_change_pw: true and sets addis_must_change_pw cookie
    const req = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "selam", password: "selam123" }),
    });
    const res = await loginHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.must_change_pw).toBe(true);

    const cookies = res.headers.get("set-cookie") || "";
    expect(cookies).toContain("addis_must_change_pw=true");

    const sessionMatch = cookies.match(/addis_session_id=([^;]+)/);
    const sessionId = sessionMatch ? sessionMatch[1] : "";

    // 3. User updates their password
    const changeReq = new Request("http://localhost:3000/api/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `addis_session_id=${sessionId}`,
      },
      body: JSON.stringify({
        current_password: "selam123",
        new_password: "selamNewPassword2026",
      }),
    });
    const changeRes = await changePasswordHandler(changeReq);
    expect(changeRes.status).toBe(200);

    // 4. Verify in DB that must_change_pw is now FALSE
    const dbUser = await db.query("SELECT must_change_pw FROM users WHERE username = 'selam'");
    expect(dbUser.rows[0].must_change_pw).toBe(false);

    // 5. User can now log in with their new password
    const newLoginReq = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "selam", password: "selamNewPassword2026" }),
    });
    const newLoginRes = await loginHandler(newLoginReq);
    expect(newLoginRes.status).toBe(200);
    const newLoginData = await newLoginRes.json();
    expect(newLoginData.user.must_change_pw).toBe(false);
  });

  it("middleware enforces route protection and role-based redirects", () => {
    // Unauthenticated request to /today -> redirects to /login?next=/today
    const unauthReq = new NextRequest("http://localhost:3000/today");
    const unauthRes = middleware(unauthReq);
    expect(unauthRes.headers.get("location")).toBe("http://localhost:3000/login?next=%2Ftoday");

    // Authenticated request to /today -> allowed
    const authStaffReq = new NextRequest("http://localhost:3000/today", {
      headers: { cookie: "addis_session_id=valid-sess; addis_auth_role=staff" },
    });
    const authStaffRes = middleware(authStaffReq);
    expect(authStaffRes.headers.get("location")).toBeNull();

    // Staff visiting /admin/users -> redirected to /today
    const staffAdminReq = new NextRequest("http://localhost:3000/admin/users", {
      headers: { cookie: "addis_session_id=valid-sess; addis_auth_role=staff" },
    });
    const staffAdminRes = middleware(staffAdminReq);
    expect(staffAdminRes.headers.get("location")).toBe("http://localhost:3000/today");

    // Admin visiting /admin/users -> allowed
    const adminReq = new NextRequest("http://localhost:3000/admin/users", {
      headers: { cookie: "addis_session_id=valid-sess; addis_auth_role=admin" },
    });
    const adminRes = middleware(adminReq);
    expect(adminRes.headers.get("location")).toBeNull();

    // Already-authenticated user visiting /login -> redirected to /today
    const loginReq = new NextRequest("http://localhost:3000/login", {
      headers: { cookie: "addis_session_id=valid-sess; addis_auth_role=staff" },
    });
    const loginRes = middleware(loginReq);
    expect(loginRes.headers.get("location")).toBe("http://localhost:3000/today");

    // User with must_change_pw attempting to visit /today -> redirected to /login?change_password=1
    const mustChangeReq = new NextRequest("http://localhost:3000/today", {
      headers: { cookie: "addis_session_id=valid-sess; addis_auth_role=staff; addis_must_change_pw=true" },
    });
    const mustChangeRes = middleware(mustChangeReq);
    expect(mustChangeRes.headers.get("location")).toContain("change_password=1");
  });

  // Test Case 21: Dedicated Phase 8 Specification Test Fixture (12/08/2026 - 13/08/2026)
  it("Test Case 21 (Spec Phase 8 Fixture): 12/08/2026 orders 1-3, cash collections, debt payment on 13/08/2026, and overpayment rejection", async () => {
    const day1 = "2026-08-12";
    const day2 = "2026-08-13";

    // Order 1: 3x4 Qty 4 @ 50 = 200, paid 200 Cash
    const order1 = await createOrder(
      {
        customer_name: "Customer Order One",
        customer_phone: "0911000001",
        order_date: day1,
        items: [{ photo_type_name: "3x4", quantity: 4, unit_price: "50.00" }],
        payment: { amount: "200.00", method: "Cash" },
      },
      adminActor
    );

    // Order 2: 10x15 Qty 3 @ 80 = 240, paid 160 Telebirr
    const order2 = await createOrder(
      {
        customer_name: "Customer Order Two",
        customer_phone: "0911000002",
        order_date: day1,
        items: [{ photo_type_name: "10x15", quantity: 3, unit_price: "80.00" }],
        payment: { amount: "160.00", method: "Telebirr" },
      },
      adminActor
    );

    // Order 3: 30x45 Qty 1 @ 250 = 250, paid 100 Cash
    const order3 = await createOrder(
      {
        customer_name: "Customer Order Three",
        customer_phone: "0911000003",
        order_date: day1,
        items: [{ photo_type_name: "30x45", quantity: 1, unit_price: "250.00" }],
        payment: { amount: "100.00", method: "Cash" },
      },
      adminActor
    );

    expect(order1.booking_no).toBe(1);
    expect(order2.booking_no).toBe(2);
    expect(order3.booking_no).toBe(3);

    // Day 1 Totals: 3 bookings, order value 690, paid 460, balance 230, cash 300, telebirr 160
    const reportDay1 = await getDailyReport(day1);
    expect(reportDay1.bookings_count).toBe(3);
    expect(reportDay1.total_value).toBe("690.00");
    expect(reportDay1.total_paid).toBe("460.00");
    expect(reportDay1.total_due).toBe("230.00");
    expect(reportDay1.cash_received_today).toBe("460.00");
    expect(reportDay1.paid_by_method["Cash"]).toBe("300.00");
    expect(reportDay1.paid_by_method["Telebirr"]).toBe("160.00");
    expect(reportDay1.quantity_by_photo_type["3x4"]).toBe(4);
    expect(reportDay1.quantity_by_photo_type["10x15"]).toBe(3);
    expect(reportDay1.quantity_by_photo_type["30x45"]).toBe(1);

    // 13/08/2026: Payment of 80 to Order 2
    const updatedOrder2 = await recordPayment(
      {
        order_id: order2.id,
        amount: "80.00",
        method: "Cash",
        payment_date: day2,
      },
      staffActor
    );

    // Order 2 now has balance 0, total paid 240
    expect(updatedOrder2.paid_amount).toBe("240.00");
    expect(updatedOrder2.balance_amount).toBe("0.00");

    // Check payment report for 13/08/2026 (0 bookings, cash received today = 80)
    const reportDay2 = await getDailyReport(day2);
    expect(reportDay2.bookings_count).toBe(0);
    expect(reportDay2.total_value).toBe("0.00");
    expect(reportDay2.cash_received_today).toBe("80.00");

    // Combined Range Report (12/08/2026 to 13/08/2026)
    // 3 bookings, total value 690, total paid 540, outstanding balance 150, cash collected 540
    const rangeReport = await getRangeReport(day1, day2);
    expect(rangeReport.bookings_count).toBe(3);
    expect(rangeReport.total_value).toBe("690.00");
    expect(rangeReport.total_paid).toBe("540.00");
    expect(rangeReport.total_due).toBe("150.00");
    expect(rangeReport.cash_collected_in_period).toBe("540.00");

    // Overpayment rejection: attempting to pay 10.00 on fully paid Order 2 must throw error
    await expect(
      recordPayment(
        {
          order_id: order2.id,
          amount: "10.00",
          method: "Cash",
        },
        staffActor
      )
    ).rejects.toThrow(/overpayment rejected/i);
  });

  // Test Case 22: Section 5.8 Public Album Viewer (FR-31 through FR-34)
  it("Test Case 22 (Section 5.8 FR-31 to FR-34): Public album viewer, PIN lock, ZIP archive, and expired friendly state", async () => {
    const customer = await getOrCreateTestCustomer();

    // 1. Create Private Album with ZIP & Download enabled
    const album = await createAlbum(
      {
        customer_id: customer.id,
        title: "Wedding Highlights Gallery",
        occasion: "Wedding",
        event_date: "2026-08-20",
        visibility: "Private",
        pin: "2468",
        allow_download: true,
        allow_zip: true,
        retention_days: 30,
      },
      staffActor
    );

    // FR-32: Initial view requires PIN prompt and does not expose media
    const lockedView = await getPublicAlbumView(album.token);
    expect(lockedView.status).toBe("locked");
    expect(lockedView.requiresPin).toBe(true);
    expect(lockedView.media).toBeUndefined();

    // FR-32: Invalid PIN returns remaining attempts
    const failedAttempt = await unlockPrivateAlbum(album.token, "9999", "127.0.0.1");
    expect(failedAttempt.success).toBe(false);
    expect(failedAttempt.error).toMatch(/4 attempts remaining/i);

    // FR-32: Valid PIN returns unlock token
    const unlockRes = await unlockPrivateAlbum(album.token, "2468", "127.0.0.1");
    expect(unlockRes.success).toBe(true);
    expect(unlockRes.unlockToken).toBeDefined();

    // FR-31: Unlocked view returns active status and album metadata
    const unlockedView = await getPublicAlbumView(album.token, unlockRes.unlockToken);
    expect(unlockedView.status).toBe("active");
    expect(unlockedView.album?.title).toBe("Wedding Highlights Gallery");
    expect(unlockedView.album?.allow_download).toBe(true);
    expect(unlockedView.album?.allow_zip).toBe(true);

    // FR-33: ZIP archive generation creates standard ZIP buffer with valid headers
    const sampleFiles = [
      { name: "DSC_0001.jpg", content: Buffer.from("simulated-photo-bytes-1") },
      { name: "DSC_0002.jpg", content: Buffer.from("simulated-photo-bytes-2") },
    ];
    const zipBuffer = createZipArchive(sampleFiles);
    expect(zipBuffer.length).toBeGreaterThan(0);
    // Standard ZIP signature PK\x03\x04
    expect(zipBuffer.readUInt32LE(0)).toBe(0x04034b50);

    // FR-34: Expired or disabled album returns status: "expired" with friendly message
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await db.query(`UPDATE albums SET expires_at = $1 WHERE id = $2`, [pastDate, album.id]);

    const expiredView = await getPublicAlbumView(album.token);
    expect(expiredView.status).toBe("expired");
    expect(expiredView.message).toMatch(/expired or is no longer available/i);
    expect(expiredView.album?.allow_download).toBe(false);
  });
});


