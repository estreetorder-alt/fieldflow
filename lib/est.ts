// Site-wide time zone: US Eastern (EST/EDT, America/New_York).
// All timestamps are stored as absolute UTC in the database, so formatting with
// this zone automatically applies to PREVIOUS orders too — no data migration needed.

export const ET = "America/New_York";

type DateInput = string | number | Date;

/** e.g. 7/11/2026 (Eastern) */
export function etDate(d: DateInput, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(d).toLocaleDateString("en-US", { timeZone: ET, ...opts });
}

/** e.g. 7/11/2026, 3:42:10 PM (Eastern) */
export function etDateTime(d: DateInput, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(d).toLocaleString("en-US", { timeZone: ET, ...opts });
}

/** e.g. 3:42:10 PM (Eastern) */
export function etTime(d: DateInput, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(d).toLocaleTimeString("en-US", { timeZone: ET, ...opts });
}
