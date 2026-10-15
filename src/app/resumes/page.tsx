import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ResumeCard, UploadResume } from "@/components/resumes/resume-library";
import { EmptyState, Skeleton } from "@/components/ui/card";
import { listResumes } from "@/server/services/file-service";

export const metadata: Metadata = { title: "Resumes" };

async function Library() {
  await connection();
  const resumes = await listResumes();
  if (resumes.length === 0) {
    return (
      <EmptyState icon={<FileText className="size-8" />} title="No resumes yet">
        Upload your resume versions here, then pick the one you sent for each
        application.
      </EmptyState>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {resumes.map((r) => (
        <ResumeCard key={r.id} resume={r} />
      ))}
    </ul>
  );
}

export default function ResumesPage() {
  return (
    <>
      <PageHeader
        title="Resumes"
        subtitle="Your resume versions, reusable across applications."
        actions={<UploadResume />}
      />
      <main className="flex-1 p-4 md:p-8">
        <Suspense
          fallback={
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
            </div>
          }
        >
          <Library />
        </Suspense>
      </main>
    </>
  );
}
