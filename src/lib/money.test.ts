import { describe, it, expect } from "vitest";
import {
  formatETB,
  calculateLineTotal,
  calculateOrderTotal,
  calculateBalance,
  isPaymentValid,
} from "./money";

describe("Decimal Money Arithmetic & Ethiopian Birr Formatting", () => {
  it("formats numbers to Ethiopian Birr (ETB #,##0.00)", () => {
    expect(formatETB(0)).toBe("ETB 0.00");
    expect(formatETB(1250)).toBe("ETB 1,250.00");
    expect(formatETB("35000.5")).toBe("ETB 35,000.50");
    expect(formatETB("1200000.00")).toBe("ETB 1,200,000.00");
    expect(formatETB(null)).toBe("ETB 0.00");
  });

  it("calculates line item total with decimal.js without floating point errors", () => {
    // 3 * 350.10 = 1050.30
    expect(calculateLineTotal(3, "350.10")).toBe("1050.30");
    expect(calculateLineTotal(0, "500")).toBe("0.00");
    expect(calculateLineTotal(2, "0.1")).toBe("0.20");
    expect(calculateLineTotal(-1, "100")).toBe("0.00");
  });

  it("sums order items correctly", () => {
    const items = [
      { quantity: 2, unit_price: "350.00" }, // 700.00
      { quantity: 1, unit_price: "1200.00" }, // 1200.00
      { quantity: 3, unit_price: "150.00" }, // 450.00
    ];
    // Total should be 700 + 1200 + 450 = 2350.00
    expect(calculateOrderTotal(items)).toBe("2350.00");
  });

  it("calculates balance (order_total - paid) with decimal.js", () => {
    expect(calculateBalance("2350.00", "1400.00")).toBe("950.00");
    expect(calculateBalance("2350.00", "2350.00")).toBe("0.00");
    expect(calculateBalance("100.00", "0")).toBe("100.00");
  });

  it("validates payment: cannot exceed total and cannot be negative", () => {
    expect(isPaymentValid("1000.00", "500.00")).toBe(true);
    expect(isPaymentValid("1000.00", "1000.00")).toBe(true);
    expect(isPaymentValid("1000.00", "1000.01")).toBe(false);
    expect(isPaymentValid("1000.00", "1500.00")).toBe(false);
    expect(isPaymentValid("1000.00", "-50.00")).toBe(false);
  });
});
