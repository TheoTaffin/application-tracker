"use client";

import { Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

/** Opens the global "new application" dialog by adding `?new`, without a navigation. */
export function AddApplicationButton() {
  const params = useSearchParams();
  return (
    <Button
      variant="primary"
      onClick={() => {
        const next = new URLSearchParams(params);
        next.set("new", "");
        window.history.pushState(
          null,
          "",
          `${window.location.pathname}?${next.toString()}`,
        );
      }}
    >
      <Plus className="size-3.5" /> Add application
    </Button>
  );
}
