import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <EmptyState title="This page doesn't exist">
        <p className="mb-4">It may have been deleted, or the link is wrong.</p>
        <ButtonLink href="/" variant="primary">
          Back to the dashboard
        </ButtonLink>
      </EmptyState>
    </main>
  );
}
