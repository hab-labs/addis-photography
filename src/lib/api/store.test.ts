import { describe, it, expect, beforeEach } from "vitest";
import { studioStore } from "./store";

describe("Studio Store API & State Operations", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    if (typeof window !== "undefined") {
      window.localStorage.clear();
    }
  });

  it("creates a customer and finds them via search query", () => {
    const cust = studioStore.createCustomer("Abebe Bikila", "+251911998877", "VIP client");
    expect(cust.id).toBeDefined();
    expect(cust.name).toBe("Abebe Bikila");
    expect(cust.phone).toBe("+251911998877");
    expect(cust.balance_due).toBe("0.00");

    const foundByName = studioStore.getCustomers("Abebe");
    expect(foundByName.some((c) => c.id === cust.id)).toBe(true);

    const foundByPhone = studioStore.getCustomers("998877");
    expect(foundByPhone.some((c) => c.id === cust.id)).toBe(true);
  });

  it("creates an order with decimal arithmetic and updates customer balance", () => {
    const cust = studioStore.createCustomer("Chaltu Desta", "+251922334455");

    const order = studioStore.createOrder({
      customer_id: cust.id,
      customer_name: cust.name,
      customer_phone: cust.phone,
      items: [
        {
          price_item_id: "prc-1",
          photo_type_name: "Graduation Master Package",
          quantity: 2,
          unit_price: "2400.00",
        },
        {
          price_item_id: "prc-2",
          photo_type_name: "Instant 10x15 Print",
          quantity: 3,
          unit_price: "150.00",
        },
      ],
      payment_method: "telebirr",
      paid_amount: "2000.00",
      reference_no: "TLB12345678",
      created_by: { id: "usr-1", name: "Staff Member" },
    });

    // 2 * 2400 = 4800, 3 * 150 = 450. Total = 5250.00.
    expect(order.total_amount).toBe("5250.00");
    expect(order.paid_amount).toBe("2000.00");
    expect(order.balance_amount).toBe("3250.00");
    expect(order.payments.length).toBe(1);
    expect(order.payments[0].reference_no).toBe("TLB12345678");

    // Check customer stats updated
    const updatedCustomer = studioStore.getCustomerById(cust.id);
    expect(updatedCustomer?.balance_due).toBe("3250.00");
    expect(updatedCustomer?.total_spent).toBe("5250.00");
  });

  it("records subsequent payment and reduces balance accurately", () => {
    const cust = studioStore.createCustomer("Dawit Kebede", "+251933445566");
    const order = studioStore.createOrder({
      customer_id: cust.id,
      customer_name: cust.name,
      customer_phone: cust.phone,
      items: [
        {
          price_item_id: "prc-1",
          photo_type_name: "Passport Photo",
          quantity: 2,
          unit_price: "350.00",
        },
      ],
      payment_method: "cash",
      paid_amount: "200.00",
      created_by: { id: "usr-1", name: "Staff Member" },
    });

    expect(order.balance_amount).toBe("500.00");

    const updatedOrder = studioStore.recordPayment(
      order.id,
      "500.00",
      "cash",
      undefined,
      { id: "usr-1", name: "Staff Member" }
    );

    expect(updatedOrder.paid_amount).toBe("700.00");
    expect(updatedOrder.balance_amount).toBe("0.00");
    expect(updatedOrder.payments.length).toBe(2);
  });

  it("creates, retrieves, and extends client albums", () => {
    const album = studioStore.createAlbum({
      title: "Sara & Michael Wedding Highlights",
      token: "sara-michael-wedding",
      customer_id: "cust-1",
      customer_name: "Sara Haile",
      event_date: "2026-10-15T00:00:00.000Z",
      pin: "4321",
    });

    expect(album.id).toBeDefined();
    expect(album.token).toBe("sara-michael-wedding");
    expect(album.is_locked).toBe(true);
    expect(album.pin_set).toBe(true);

    const fetched = studioStore.getAlbumByToken("sara-michael-wedding");
    expect(fetched?.title).toBe("Sara & Michael Wedding Highlights");

    const extended = studioStore.extendAlbumRetention(album.id, 30);
    const originalTime = new Date(album.expires_at).getTime();
    const extendedTime = new Date(extended.expires_at).getTime();
    expect(extendedTime).toBeGreaterThan(originalTime);
  });

  it("manages service catalog prices with CRUD operations", () => {
    const newPrice = studioStore.createPrice({
      name: "Deluxe Studio Portrait",
      category: "portrait",
      standard_unit_price: "1850.50",
      turnaround_days: 2,
      description: "Includes professional makeup",
    });

    expect(newPrice.id).toBeDefined();
    expect(newPrice.standard_unit_price).toBe("1850.50");

    const updated = studioStore.updatePrice(newPrice.id, "1999.00");
    expect(updated.standard_unit_price).toBe("1999.00");

    studioStore.deletePrice(newPrice.id);
    const allPrices = studioStore.getPrices();
    expect(allPrices.some((p) => p.id === newPrice.id)).toBe(false);
  });

  it("updates and persists studio settings", () => {
    const original = studioStore.getSettings();
    expect(original.studio_name).toBeDefined();

    const updated = studioStore.updateSettings({
      studio_name: "Addis Photography Flagship Studio",
      phone: "+251 911 00 11 22",
    });

    expect(updated.studio_name).toBe("Addis Photography Flagship Studio");
    expect(updated.phone).toBe("+251 911 00 11 22");

    const reRead = studioStore.getSettings();
    expect(reRead.studio_name).toBe("Addis Photography Flagship Studio");
  });

  it("persists media files and merges them safely during synchronization", async () => {
    const testAlbumId = "alb-test-sync-1";
    const mediaItem = {
      id: "med-test-1",
      album_id: testAlbumId,
      filename: "test_portrait.jpg",
      file_size: 1024 * 500,
      mime_type: "image/jpeg",
      url: "/api/media/stream/med-test-1",
      thumbnail_url: "/api/media/stream/med-test-1",
      upload_status: "completed" as const,
      created_at: new Date().toISOString(),
    };

    studioStore.addMediaFile(testAlbumId, mediaItem);
    const storedBefore = studioStore.getMediaFiles(testAlbumId);
    expect(storedBefore).toHaveLength(1);
    expect(storedBefore[0].filename).toBe("test_portrait.jpg");

    // Calling syncMediaFiles with network/mock failure should retain the file and not vanish it
    const synced = await studioStore.syncMediaFiles(testAlbumId);
    expect(synced.some((m) => m.filename === "test_portrait.jpg")).toBe(true);

    const storedAfter = studioStore.getMediaFiles(testAlbumId);
    expect(storedAfter.some((m) => m.filename === "test_portrait.jpg")).toBe(true);
  });
});

