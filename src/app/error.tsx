"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <EmptyState title="Something went wrong">
        <p className="mb-4">
          The page could not be loaded. Is the database running?
        </p>
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
      </EmptyState>
    </main>
  );
}
