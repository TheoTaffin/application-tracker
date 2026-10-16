import type { ApplicationSource, PostingLanguage } from "./enums";

/** Display helpers shared by server and client components. */

const TIME_ZONE = "Europe/Zurich";

const dayMonth = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: TIME_ZONE,
});
const dayMonthYear = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});
const weekday = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  timeZone: "UTC",
});
const chf = new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 });

/** A YYYY-MM-DD string is a calendar date: parse it at noon UTC so no zone shifts the day. */
function toDate(value: string | Date): Date {
  return typeof value === "string"
    ? new Date(`${value.slice(0, 10)}T12:00:00Z`)
    : value;
}

export function formatDate(
  value: string | Date | null | undefined,
  withYear = false,
) {
  if (!value) return "—";
  return (withYear ? dayMonthYear : dayMonth).format(toDate(value));
}

/** Whole days from `today` to `date` (both YYYY-MM-DD). */
export function daysBetween(today: string, date: string): number {
  return Math.round(
    (toDate(date).getTime() - toDate(today).getTime()) / 86_400_000,
  );
}

/** "Overdue · 12 Oct", "Today", "Tomorrow", "Friday", or a date further out. */
export function relativeDay(date: string, today: string) {
  const diff = daysBetween(today, date);
  if (diff < 0)
    return {
      label: `Overdue · ${formatDate(date)}`,
      urgency: "overdue" as const,
    };
  if (diff === 0) return { label: "Today", urgency: "today" as const };
  if (diff === 1) return { label: "Tomorrow", urgency: "soon" as const };
  if (diff < 7)
    return { label: weekday.format(toDate(date)), urgency: "later" as const };
  return { label: formatDate(date), urgency: "later" as const };
}

export function formatWorkload(min: number | null, max: number | null) {
  if (min == null && max == null) return null;
  if (min == null || max == null || min === max) return `${max ?? min}%`;
  return `${min}–${max}%`;
}

/** Swiss format: CHF 130'000 */
export function formatChf(amount: number | null | undefined) {
  return amount == null ? null : `CHF ${chf.format(amount)}`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    parts.length > 1
      ? parts[0][0] + parts.at(-1)![0]
      : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

export const SOURCE_LABEL: Record<ApplicationSource, string> = {
  jobs_ch: "jobs.ch",
  jobup_ch: "jobup.ch",
  linkedin: "LinkedIn",
  company_site: "Company site",
  referral: "Referral",
  recruiter: "Recruiter",
  other: "Other",
};

export const LANGUAGE_LABEL: Record<PostingLanguage, string> = {
  de: "German",
  fr: "French",
  en: "English",
  it: "Italian",
};
