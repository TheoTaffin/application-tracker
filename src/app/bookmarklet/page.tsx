import type { Metadata } from "next";
import { BookmarkletLink } from "@/components/layout/bookmarklet-link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Save-to-tracker button" };

export default function BookmarkletPage() {
  return (
    <>
      <PageHeader
        title="Save-to-tracker button"
        subtitle="Add a job posting from any site in one click."
      />
      <main className="flex-1 p-4 md:p-8">
        <Card className="max-w-2xl space-y-4 p-6">
          <p className="text-[13px] leading-relaxed text-ink-muted">
            Drag this button to your bookmarks bar. On a job posting (jobs.ch,
            jobup.ch, LinkedIn, a company careers page), click it: the tracker
            opens with the offer details already fetched.
          </p>
          <BookmarkletLink />
          <p className="text-[11px] text-ink-subtle">
            The bookmark only opens this app with the page address. Nothing is
            sent anywhere else.
          </p>
        </Card>
      </main>
    </>
  );
}
