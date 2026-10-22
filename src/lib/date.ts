/**
 * Date and time utilities localized to Jimma studio time (Africa/Addis_Ababa, UTC+3)
 * Output format: dd/mm/yyyy
 */

export const ADDIS_TIMEZONE = "Africa/Addis_Ababa";

function formatCalendarDate(
  dateInput: string | Date | number | null | undefined,
  calendar: "gregory" | "ethiopic"
): string {
  if (!dateInput) return "-";
  try {
    const date =
      typeof dateInput === "string" || typeof dateInput === "number"
        ? new Date(dateInput)
        : dateInput;
    if (isNaN(date.getTime())) return "-";

    const formatter = new Intl.DateTimeFormat(
      `en-GB-u-ca-${calendar}-nu-latn`,
      {
        timeZone: ADDIS_TIMEZONE,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
    const parts = formatter.formatToParts(date);
    const values = Object.fromEntries(
      parts
        .filter((part) => ["day", "month", "year"].includes(part.type))
        .map((part) => [part.type, part.value])
    );
    return `${values.day}/${values.month}/${values.year}`;
  } catch {
    return "-";
  }
}

/**
 * Format date string or Date object to dd/mm/yyyy
 */
export function formatDate(dateInput: string | Date | number | null | undefined): string {
  return formatCalendarDate(dateInput, "gregory");
}

/**
 * Format a date as Gregorian and Ethiopian dates for side-by-side display.
 */
export function formatCalendarPair(
  dateInput: string | Date | number | null | undefined
): { gregorian: string; ethiopian: string } {
  return {
    gregorian: formatCalendarDate(dateInput, "gregory"),
    ethiopian: formatCalendarDate(dateInput, "ethiopic"),
  };
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

/**
 * Check if two dates fall on the same day in Africa/Addis_Ababa
 */
export function isSameDayInAddis(
  dateA: string | Date | number | null | undefined,
  dateB: string | Date | number | null | undefined
): boolean {
  if (!dateA || !dateB) return false;
  return formatDate(dateA) === formatDate(dateB);
}

export interface EthiopianDateDetails {
  day: string;
  monthAm: string;
  monthEn: string;
  year: string;
  textAm: string;
  textEn: string;
}

/**
 * Get detailed Ethiopian date parts for calendar day cell display
 */
export function getEthiopianDateDetails(
  dateInput: string | Date | number | null | undefined
): EthiopianDateDetails | null {
  if (!dateInput) return null;
  try {
    const date =
      typeof dateInput === "string" || typeof dateInput === "number"
        ? new Date(dateInput)
        : dateInput;
    if (isNaN(date.getTime())) return null;

    const amFormatter = new Intl.DateTimeFormat("am-ET-u-ca-ethiopic", {
      timeZone: ADDIS_TIMEZONE,
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const enFormatter = new Intl.DateTimeFormat("en-GB-u-ca-ethiopic-nu-latn", {
      timeZone: ADDIS_TIMEZONE,
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const partsAm = amFormatter.formatToParts(date);
    const day = partsAm.find((p) => p.type === "day")?.value || "";
    const monthAm = partsAm.find((p) => p.type === "month")?.value || "";
    const year = partsAm.find((p) => p.type === "year")?.value || "";

    const partsEn = enFormatter.formatToParts(date);
    const monthEn = partsEn.find((p) => p.type === "month")?.value || "";

    return {
      day,
      monthAm,
      monthEn,
      year,
      textAm: `${day} ${monthAm} ${year}`,
      textEn: `${day} ${monthEn} ${year}`,
    };
  } catch {
    return null;
  }
}

