/**
 * Date and time utilities localized to Jimma studio time (Africa/Addis_Ababa, UTC+3)
 * Output format: dd/mm/yyyy
 */

export const ADDIS_TIMEZONE = "Africa/Addis_Ababa";

/**
 * Format date string or Date object to dd/mm/yyyy
 */
export function formatDate(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return "-";
  try {
    const date = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return "-";

    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: ADDIS_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    return formatter.format(date); // outputs dd/mm/yyyy
  } catch {
    return "-";
  }
}

/**
 * Format date and time to dd/mm/yyyy HH:mm
 */
export function formatDateTime(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return "-";
  try {
    const date = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return "-";

    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: ADDIS_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return formatter.format(date).replace(",", "");
  } catch {
    return "-";
  }
}

/**
 * Format time to HH:mm (24-hour Ethiopian studio time)
 */
export function formatTime(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return "-";
  try {
    const date = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return "-";

    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: ADDIS_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return formatter.format(date);
  } catch {
    return "-";
  }
}

/**
 * Check if a date string is today in Jimma studio time
 */
export function isTodayInAddis(dateInput: string | Date): boolean {
  try {
    const target = formatDate(dateInput);
    const today = formatDate(new Date());
    return target === today;
  } catch {
    return false;
  }
}

/**
 * Get ISO date string for today in Jimma (YYYY-MM-DD) for input[type="date"]
 */
export function getAddisTodayISO(): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: ADDIS_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(now); // en-CA produces YYYY-MM-DD
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

/**
 * Check if a due date is overdue compared to current Addis time
 */
export function isOverdue(dueDateInput: string | Date): boolean {
  try {
    const due = typeof dueDateInput === "string" ? new Date(dueDateInput) : dueDateInput;
    return due.getTime() < Date.now();
  } catch {
    return false;
  }
}
