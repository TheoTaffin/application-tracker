import { APP_TIME_ZONE } from "./constants";

/** Calendar dates (YYYY-MM-DD) in the app's time zone, shared by server and client. */

/** Today in Swiss local time: "due today" means today in Zurich. */
export function todayInAppTimeZone(now = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE }).format(
    now,
  );
}

/** Add days to a YYYY-MM-DD date (calendar arithmetic, no time zone involved). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
