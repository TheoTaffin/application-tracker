import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { getDashboard } from "@/server/services/application-service";
import { listContacts } from "@/server/services/contact-service";
import { listResumes } from "@/server/services/file-service";

/**
 * Request-scoped reads for layouts and pages. `connection()` marks them as request-time
 * work (never prerendered), and `cache` dedupes them within one render.
 */

export const loadDashboard = cache(async () => {
  await connection();
  return getDashboard();
});

export const loadNavCounts = cache(async () => {
  await connection();
  const [dashboard, resumes, contacts] = await Promise.all([
    loadDashboard(),
    listResumes(),
    listContacts(),
  ]);
  return {
    groups: dashboard.byGroup,
    total: dashboard.total,
    resumes: resumes.length,
    contacts: contacts.length,
  };
});
