import Decimal from "decimal.js";

// Configure Decimal.js precision and rounding mode for financial operations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Format a number or numeric string to Ethiopian Birr currency: ETB #,##0.00
 * Example: 1250 => "ETB 1,250.00"
 */
export function formatETB(amount: number | string | Decimal | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") {
    return "ETB 0.00";
  }

  try {
    const d = new Decimal(amount);
    const parts = d.toFixed(2).split(".");
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const decimalPart = parts[1];
    return `ETB ${integerPart}.${decimalPart}`;
  } catch {
    return "ETB 0.00";
  }
}

/**
 * Calculate line total = quantity * unit_price
 */
export function calculateLineTotal(
  quantity: number | string,
  unitPrice: number | string | Decimal
): string {
  try {
    const qty = new Decimal(quantity || 0);
    const price = new Decimal(unitPrice || 0);
    if (qty.isNegative() || price.isNegative()) {
      return "0.00";
    }
    return qty.times(price).toFixed(2);
  } catch {
    return "0.00";
  }
}

/**
 * Calculate order total by summing line item totals
 */
export function calculateOrderTotal(
  items: Array<{ quantity: number | string; unit_price: number | string | Decimal }>
): string {
  try {
    const total = items.reduce((acc, item) => {
      const line = new Decimal(calculateLineTotal(item.quantity, item.unit_price));
      return acc.plus(line);
    }, new Decimal(0));
    return total.toFixed(2);
  } catch {
    return "0.00";
  }
}

/**
 * Calculate balance = order_total - paid
 */
export function calculateBalance(
  orderTotal: number | string | Decimal,
  paid: number | string | Decimal
): string {
  try {
    const tot = new Decimal(orderTotal || 0);
    const p = new Decimal(paid || 0);
    return tot.minus(p).toFixed(2);
  } catch {
    return "0.00";
  }
}

/**
 * Validates whether payment exceeds the total
 * Returns true if valid (paid <= total and paid >= 0), false otherwise
 */
export function isPaymentValid(
  orderTotal: number | string | Decimal,
  paid: number | string | Decimal
): boolean {
  try {
    const tot = new Decimal(orderTotal || 0);
    const p = new Decimal(paid || 0);
    if (p.isNegative()) return false;
    return p.lessThanOrEqualTo(tot);
  } catch {
    return false;
  }
}

/**
 * Returns Decimal instance safely
 */
export function toDecimal(value: number | string | Decimal | null | undefined): Decimal {
  try {
    if (value === null || value === undefined || value === "") {
      return new Decimal(0);
    }
    return new Decimal(value);
  } catch {
    return new Decimal(0);
  }
}
