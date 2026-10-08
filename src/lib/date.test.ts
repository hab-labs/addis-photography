import { describe, it, expect } from "vitest";
import { formatDate, formatDateTime, formatTime, isOverdue } from "./date";

describe("Ethiopian Date & Time Formatting (Africa/Addis_Ababa)", () => {
  it("formats dates in Gregorian dd/mm/yyyy format", () => {
    // 2026-09-30T10:00:00Z
    const dateStr = "2026-09-30T07:00:00Z";
    const formatted = formatDate(dateStr);
    expect(formatted).toBe("30/09/2026");
  });

  it("handles null and undefined dates gracefully", () => {
    expect(formatDate(null)).toBe("-");
    expect(formatDate(undefined)).toBe("-");
    expect(formatDateTime("invalid")).toBe("-");
  });

  it("detects overdue requests accurately", () => {
    // Past date is overdue
    expect(isOverdue("2020-01-01T00:00:00Z")).toBe(true);
    // Far future date is not overdue
    expect(isOverdue("2035-01-01T00:00:00Z")).toBe(false);
  });
});
