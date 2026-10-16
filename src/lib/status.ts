/**
 * Application status model. The detailed status is stored (on status events); the
 * group is always derived from it, so the two can never drift apart.
 * Shared by server and client code: keep this module free of server-only imports.
 */

export const APPLICATION_STATUSES = [
  "draft",
  "applied",
  "acknowledged",
  "screening",
  "interview_1",
  "interview_2plus",
  "assignment",
  "offer",
  "accepted",
  "rejected",
  "withdrawn",
  "ghosted",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_GROUPS = ["pending", "ongoing", "closed"] as const;

export type StatusGroup = (typeof STATUS_GROUPS)[number];

export const STATUS_GROUP = {
  draft: "pending",
  applied: "pending",
  acknowledged: "pending",
  screening: "ongoing",
  interview_1: "ongoing",
  interview_2plus: "ongoing",
  assignment: "ongoing",
  offer: "ongoing",
  accepted: "closed",
  rejected: "closed",
  withdrawn: "closed",
  ghosted: "closed",
} as const satisfies Record<ApplicationStatus, StatusGroup>;

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  draft: "Draft",
  applied: "Applied",
  acknowledged: "Acknowledged",
  screening: "Screening",
  interview_1: "Interview 1",
  interview_2plus: "Interview 2+",
  assignment: "Assignment",
  offer: "Offer",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  ghosted: "Ghosted",
};

export const STATUS_GROUP_LABEL: Record<StatusGroup, string> = {
  pending: "Pending",
  ongoing: "On-going",
  closed: "Closed",
};

/** Badge tone; the UI maps tones to colors. */
export type StatusTone = "amber" | "green" | "red" | "grey";

export const STATUS_GROUP_TONE: Record<StatusGroup, StatusTone> = {
  pending: "amber",
  ongoing: "green",
  closed: "grey",
};

export function statusTone(status: ApplicationStatus): StatusTone {
  if (status === "accepted") return "green";
  if (status === "rejected") return "red";
  return STATUS_GROUP_TONE[STATUS_GROUP[status]];
}

export function statusGroup(status: ApplicationStatus): StatusGroup {
  return STATUS_GROUP[status];
}
