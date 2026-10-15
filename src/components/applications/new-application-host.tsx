"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FormError } from "@/components/ui/field";
import { Dialog } from "@/components/ui/dialog";
import { getFormOptionsAction } from "@/server/actions/applications";
import type { FormOptions } from "@/server/services/application-service";
import { ApplicationForm } from "./application-form";

/**
 * Global "new application" dialog, driven by the URL so any page (and the bookmarklet)
 * can open it: `?new` opens it empty, `?new=<offer url>` prefills and fetches the offer.
 */
export function NewApplicationHost() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const open = searchParams.has("new");
  const offerUrl = searchParams.get("new") || undefined;
  const [options, setOptions] = useState<FormOptions | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getFormOptionsAction().then((result) => {
      if (cancelled) return;
      if (result.ok) setOptions(result.data);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const close = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("new");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      size="lg"
      title="New application"
      description="Paste the offer link to prefill the details, then review and save."
    >
      {error ? (
        <FormError message={error} />
      ) : !options ? (
        <p className="flex items-center gap-2 py-8 text-xs text-ink-subtle">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </p>
      ) : (
        open && (
          <ApplicationForm
            // Remount for each opening so no state leaks between applications.
            key={offerUrl ?? "empty"}
            mode="create"
            options={options}
            autoExtractUrl={offerUrl}
            onCancel={close}
            onDone={(id) => router.push(`/applications/${id}`)}
          />
        )
      )}
    </Dialog>
  );
}

/** Opens the dialog by adding `?new` to the current URL. */
export function newApplicationHref(pathname = "/") {
  return `${pathname}?new`;
}
