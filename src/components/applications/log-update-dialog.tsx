"use client";

import { PenLine } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { ApplicationStatus } from "@/lib/status";
import { StatusUpdateForm } from "./status-update-form";

/** "Log update" opened in place, from the dashboard panel or a follow-up card. */
export function LogUpdateButton({
  applicationId,
  company,
  currentStatus,
  contacts,
  currentContactId,
  variant = "secondary",
  className,
}: {
  applicationId: string;
  company: string;
  currentStatus: ApplicationStatus;
  contacts: { id: string; name: string; company: string | null }[];
  currentContactId: string | null;
  variant?: "secondary" | "primary" | "ghost";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant={variant}
        className={className}
        onClick={() => setOpen(true)}
      >
        <PenLine className="size-3.5" /> Log update
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Log an update · ${company}`}
      >
        {open && (
          <StatusUpdateForm
            applicationId={applicationId}
            currentStatus={currentStatus}
            contacts={contacts}
            currentContactId={currentContactId}
            onSaved={() => setOpen(false)}
          />
        )}
      </Dialog>
    </>
  );
}
