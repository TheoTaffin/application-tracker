import { Users } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  ContactRowActions,
  NewContactButton,
} from "@/components/contacts/contact-dialogs";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, Skeleton } from "@/components/ui/card";
import { initials } from "@/lib/format";
import { listContacts } from "@/server/services/contact-service";

export const metadata: Metadata = { title: "Contacts" };

async function ContactsTable() {
  await connection();
  const contacts = await listContacts();
  if (contacts.length === 0) {
    return (
      <EmptyState icon={<Users className="size-8" />} title="No contacts yet">
        Recruiters and hiring managers you add here can be linked to any
        application.
      </EmptyState>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-sand-300 bg-sand-200/50 font-mono text-[10px] tracking-wider text-ink-subtle uppercase">
            <th className="px-4 py-2.5 font-semibold">Name</th>
            <th className="px-3 py-2.5 font-semibold">Role</th>
            <th className="px-3 py-2.5 font-semibold">Company</th>
            <th className="px-3 py-2.5 font-semibold">Email</th>
            <th className="px-3 py-2.5 font-semibold">Phone</th>
            <th className="px-3 py-2.5 text-right font-semibold">
              Applications
            </th>
            <th className="px-3 py-2.5">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sand-200">
          {contacts.map((c) => (
            <tr key={c.id} className="hover:bg-sand-50/70">
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-7 items-center justify-center rounded-full bg-sand-200 text-[11px] font-medium">
                    {initials(c.name)}
                  </span>
                  <span className="text-sm font-medium">{c.name}</span>
                </div>
              </td>
              <td className="px-3 py-2.5 text-ink-muted">{c.role ?? "—"}</td>
              <td className="px-3 py-2.5 text-ink-muted">{c.company ?? "—"}</td>
              <td className="px-3 py-2.5">
                {c.email ? (
                  <a
                    href={`mailto:${c.email}`}
                    className="text-forest-700 hover:underline"
                  >
                    {c.email}
                  </a>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-3 py-2.5 text-ink-muted tabular">
                {c.phone ?? "—"}
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-ink-muted">
                {c.applicationCount}
              </td>
              <td className="px-3 py-2.5">
                <ContactRowActions contact={c} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ContactsPage() {
  return (
    <>
      <PageHeader
        title="Contacts"
        subtitle="Recruiters and hiring managers, shared across applications."
        actions={<NewContactButton />}
      />
      <main className="flex-1 p-4 md:p-8">
        <section className="overflow-hidden rounded-lg border border-sand-300 bg-paper shadow-card">
          <Suspense fallback={<Skeleton className="m-4 h-40" />}>
            <ContactsTable />
          </Suspense>
        </section>
      </main>
    </>
  );
}
