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
import { NotesPanel } from "@/components/applications/notes-panel";
import { StepTimeline } from "@/components/applications/step-timeline";
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
import { todayInAppTimeZone } from "@/lib/dates";
import { stepLabel } from "@/lib/steps";
import {
  getApplication,
  getFormOptions,
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
    formAnswers: str(a.formAnswers),
    jobDescription: str(a.jobDescription),
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
  const next = a.nextStep;
  const due = next?.date ? relativeDay(next.date, today) : null;

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
                  {next && (
                    <>
                      {stepLabel(next)}{" "}
                      <span
                        className={
                          due?.urgency === "overdue" || due?.urgency === "today"
                            ? "text-terra-700"
                            : "text-ink-subtle"
                        }
                      >
                        · {due?.label ?? "no date yet"}
                      </span>
                    </>
                  )}
                </Fact>
              </div>
            </dl>
          </Card>

          <Card id="steps" className="scroll-mt-24 p-5">
            <StepTimeline applicationId={a.id} steps={a.steps} />
          </Card>

          <Card>
            <CardHeader
              title="Job description"
              description="Kept in case the posting disappears."
            />
            {a.jobDescription ? (
              <p className="max-h-[32rem] overflow-y-auto p-5 text-xs leading-relaxed whitespace-pre-line text-ink-muted">
                {a.jobDescription}
              </p>
            ) : (
              <p className="p-5 text-xs text-ink-subtle">
                Not saved. Use Edit to fetch it from the link or paste it.
              </p>
            )}
          </Card>

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
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Notes" />
            <div className="p-5">
              <NotesPanel applicationId={a.id} notes={a.notes} />
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
