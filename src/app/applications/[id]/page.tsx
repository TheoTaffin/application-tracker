import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import Markdown from "react-markdown";
import {
  DeleteApplicationButton,
  EditApplicationButton,
} from "@/components/applications/application-actions";
import type { ApplicationValues } from "@/components/applications/application-form";
import {
  AddAttachments,
  RemoveAttachment,
} from "@/components/applications/attachments";
import { ContactCard } from "@/components/applications/contact-card";
import { FileRow } from "@/components/applications/documents";
import { StatusUpdateForm } from "@/components/applications/status-update-form";
import { Timeline } from "@/components/applications/timeline";
import { PageHeader } from "@/components/layout/page-header";
import { GroupBadge, StatusBadge } from "@/components/ui/badge";
import { Card, CardHeader, Skeleton } from "@/components/ui/card";
import {
  formatChf,
  formatDate,
  formatWorkload,
  LANGUAGE_LABEL,
  relativeDay,
  SOURCE_LABEL,
} from "@/lib/format";
import {
  getApplication,
  getFormOptions,
  todayInAppTimeZone,
  type ApplicationDetail,
} from "@/server/services/application-service";

export const metadata: Metadata = { title: "Application" };

function toFormValues(a: ApplicationDetail): ApplicationValues {
  const str = (v: string | number | null) => (v == null ? "" : String(v));
  return {
    offerUrl: str(a.offerUrl),
    company: a.company,
    role: a.role,
    location: str(a.location),
    workloadMin: str(a.workloadMin),
    workloadMax: str(a.workloadMax),
    salaryAsk: str(a.salaryAsk),
    language: str(a.language),
    source: str(a.source),
    viaAgency: a.viaAgency,
    appliedAt: str(a.appliedAt),
    nextActionAt: str(a.nextActionAt),
    nextActionNote: str(a.nextActionNote),
    description: str(a.description),
    formAnswers: str(a.formAnswers),
    offerSnapshot: str(a.offerSnapshot),
    resumeId: a.resume?.id ?? "",
    contactId: a.contact?.id ?? "",
  };
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1 text-[13px] text-ink">
        {children ?? <span className="text-ink-faint">—</span>}
      </dd>
    </div>
  );
}

async function Detail({
  params,
}: {
  params: PageProps<"/applications/[id]">["params"];
}) {
  await connection();
  const { id } = await params;
  const a = await getApplication(id);
  if (!a) notFound();
  const options = await getFormOptions();
  const today = todayInAppTimeZone();
  const due = a.nextActionAt ? relativeDay(a.nextActionAt, today) : null;

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Link
              href="/"
              className="text-ink-subtle hover:text-ink"
              aria-label="Back to the dashboard"
            >
              <ArrowLeft className="size-5" />
            </Link>
            {a.company}
          </span>
        }
        subtitle={a.role}
        actions={
          <>
            <EditApplicationButton
              applicationId={a.id}
              values={toFormValues(a)}
              options={options}
            />
            <DeleteApplicationButton applicationId={a.id} company={a.company} />
          </>
        }
      />
      <main className="grid flex-1 grid-cols-1 items-start gap-6 p-4 md:p-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <StatusBadge status={a.status} />
              <GroupBadge group={a.statusGroup} />
              {a.viaAgency && (
                <span className="rounded-full border border-sand-300 px-2 text-[11px] text-ink-muted">
                  Via agency
                </span>
              )}
              {a.offerUrl && (
                <a
                  href={a.offerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 text-xs font-medium text-forest-700 hover:underline"
                >
                  Job posting <ExternalLink className="size-3" />
                </a>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <Fact label="Location">{a.location}</Fact>
              <Fact label="Workload">
                {formatWorkload(a.workloadMin, a.workloadMax) && (
                  <span className="tabular">
                    {formatWorkload(a.workloadMin, a.workloadMax)}
                  </span>
                )}
              </Fact>
              <Fact label="Salary ask">
                {formatChf(a.salaryAsk) && (
                  <span className="tabular">{formatChf(a.salaryAsk)}</span>
                )}
              </Fact>
              <Fact label="Language">
                {a.language && LANGUAGE_LABEL[a.language]}
              </Fact>
              <Fact label="Source">{a.source && SOURCE_LABEL[a.source]}</Fact>
              <Fact label="Applied">
                {a.appliedAt && formatDate(a.appliedAt, true)}
              </Fact>
              <div className="col-span-2">
                <Fact label="Next action">
                  {due && (
                    <>
                      {a.nextActionNote || "Follow up"}{" "}
                      <span
                        className={
                          due.urgency === "overdue" || due.urgency === "today"
                            ? "text-terra-700"
                            : "text-ink-subtle"
                        }
                      >
                        · {due.label}
                      </span>
                    </>
                  )}
                </Fact>
              </div>
            </dl>
          </Card>

          {a.description && (
            <Card>
              <CardHeader title="Description" />
              <p className="p-5 text-[13px] leading-relaxed whitespace-pre-line text-ink-muted">
                {a.description}
              </p>
            </Card>
          )}

          <Card>
            <CardHeader
              title="What I answered"
              description="Form answers and motivation, as sent."
            />
            <div className="p-5">
              {a.formAnswers ? (
                <div className="prose-notes">
                  {/* react-markdown never renders raw HTML: safe for stored text. */}
                  <Markdown>{a.formAnswers}</Markdown>
                </div>
              ) : (
                <p className="text-xs text-ink-subtle">
                  Nothing recorded yet. Use Edit to add your answers.
                </p>
              )}
            </div>
          </Card>

          {a.offerSnapshot && (
            <Card>
              <details>
                <summary className="cursor-pointer px-5 py-4 text-base font-medium">
                  Saved job offer
                  <span className="ml-2 text-xs font-normal text-ink-subtle">
                    kept in case the posting disappears
                  </span>
                </summary>
                <p className="border-t border-sand-200 p-5 text-xs leading-relaxed whitespace-pre-line text-ink-muted">
                  {a.offerSnapshot}
                </p>
              </details>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card id="update" className="scroll-mt-24">
            <CardHeader title="Log an update" />
            <div className="p-5">
              <StatusUpdateForm
                applicationId={a.id}
                currentStatus={a.status}
                contacts={options.contacts}
                currentContactId={a.contact?.id ?? null}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Status history" />
            <div className="p-5">
              <Timeline events={a.events} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Contact" />
            <div className="p-5">
              {a.contact ? (
                <ContactCard contact={a.contact} />
              ) : (
                <p className="text-xs text-ink-subtle">
                  No contact yet. Add one with Edit or when logging an update.
                </p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Documents" />
            <div className="space-y-2 p-5">
              {a.resume ? (
                <FileRow file={a.resume} badge="Resume" />
              ) : (
                <p className="text-xs text-ink-subtle">No resume linked.</p>
              )}
              {a.attachments.map((f) => (
                <FileRow
                  key={f.id}
                  file={f}
                  actions={<RemoveAttachment fileId={f.id} label={f.label} />}
                />
              ))}
              <AddAttachments applicationId={a.id} />
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}

export default function ApplicationPage({
  params,
}: PageProps<"/applications/[id]">) {
  return (
    <Suspense
      fallback={
        <main className="space-y-6 p-4 md:p-8">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-64" />
        </main>
      }
    >
      <Detail params={params} />
    </Suspense>
  );
}
