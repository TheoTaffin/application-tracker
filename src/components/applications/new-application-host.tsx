"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FormError } from "@/components/ui/field";
import { Dialog } from "@/components/ui/dialog";
import { getFormOptionsAction } from "@/server/actions/applications";
import type { FormOptions } from "@/server/services/application-service";
import {
  answersToMarkdown,
  type CapturedAnswer,
  parseCapturedAnswers,
  salaryAskFrom,
} from "@/lib/form-capture";
import { ApplicationForm, emptyValues } from "./application-form";

/**
 * Global "new application" dialog, driven by the URL so any page (and the bookmarklet)
 * can open it: `?new` opens it empty, `?new=<offer url>` prefills and fetches the offer.
 * The bookmarklet also passes the answers typed in the posting's application form, in the
 * URL fragment (`#answers=`).
 */
export function NewApplicationHost() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const open = searchParams.has("new");
  const offerUrl = searchParams.get("new") || undefined;
  const [options, setOptions] = useState<FormOptions | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Read from the fragment once per opening (a ref survives Strict Mode's double effect).
  const captured = useRef<CapturedAnswer[] | null>(null);
  const [answers, setAnswers] = useState<CapturedAnswer[] | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    if (!captured.current) {
      captured.current = parseCapturedAnswers(window.location.hash);
      // The answers stay out of the address bar and the browser history.
      if (window.location.hash)
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
    }
    getFormOptionsAction()
      .then((result) => {
        if (cancelled) return;
        setAnswers(captured.current);
        if (result.ok) setOptions(result.data);
        else setError(result.error);
      })
      // Thrown rather than returned: the server is unreachable, or this page predates a
      // deploy and the server no longer knows the action. Without this, it loads forever.
      .catch(() => {
        if (!cancelled)
          setError("Could not load the form. Reload the page and try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // URL changes go through the History API: closing never reloads the page.
  const close = (change?: (params: URLSearchParams) => void) => {
    captured.current = null;
    setAnswers(null);
    const params = new URLSearchParams(searchParams);
    params.delete("new");
    change?.(params);
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      query ? `${pathname}?${query}` : pathname,
    );
  };

  const created = (id: string) => {
    // On the dashboard, show the new application in the side panel; elsewhere open it.
    if (pathname === "/") close((params) => params.set("selected", id));
    else router.push(`/applications/${id}`);
  };

  return (
    <Dialog
      open={open}
      onClose={() => close()}
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
            initialValues={
              answers
                ? {
                    ...emptyValues(),
                    offerUrl: offerUrl ?? "",
                    formAnswers: answersToMarkdown(answers),
                    salaryAsk: String(salaryAskFrom(answers) ?? ""),
                  }
                : undefined
            }
            onCancel={() => close()}
            onDone={created}
          />
        )
      )}
    </Dialog>
  );
}
