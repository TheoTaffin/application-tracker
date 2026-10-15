import { Download, FileImage, FileText } from "lucide-react";
import { formatBytes } from "@/lib/format";
import type { FileDTO } from "@/server/services/dto";

export function FileRow({
  file,
  badge,
  actions,
}: {
  file: FileDTO;
  badge?: string;
  actions?: React.ReactNode;
}) {
  const Icon = file.mime.startsWith("image/") ? FileImage : FileText;
  return (
    <div className="flex items-center justify-between gap-2 rounded border border-sand-300 bg-white p-2 text-xs shadow-sm">
      <a
        href={file.url}
        target="_blank"
        rel="noopener"
        className="flex min-w-0 items-center gap-2 text-ink-muted hover:text-ink"
        title={file.originalName}
      >
        <Icon className="size-4 shrink-0 text-ink-subtle" />
        <span className="truncate text-[11px] font-medium text-ink">
          {file.label}
        </span>
      </a>
      <div className="ml-2 flex shrink-0 items-center gap-1.5">
        {badge && (
          <span className="font-mono text-[10px] text-ink-subtle">{badge}</span>
        )}
        <span className="font-mono text-[10px] text-ink-faint">
          {formatBytes(file.size)}
        </span>
        <a
          href={`${file.url}?download`}
          className="rounded p-0.5 text-ink-subtle hover:bg-sand-200 hover:text-ink"
          aria-label={`Download ${file.label}`}
        >
          <Download className="size-3.5" />
        </a>
        {actions}
      </div>
    </div>
  );
}
