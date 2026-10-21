"use client";

import { Bookmark } from "lucide-react";
import { useEffect, useRef } from "react";
import { buttonClass } from "@/components/ui/button";

/**
 * React refuses to render `javascript:` URLs, so the bookmarklet's href is set on the
 * DOM node after mount. It points at this app's own origin.
 */
export function BookmarkletLink() {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const code = `location.href=${JSON.stringify(`${window.location.origin}/?new=`)}+encodeURIComponent(location.href)`;
    ref.current?.setAttribute("href", `javascript:${code}`);
  }, []);
  return (
    <a
      ref={ref}
      className={buttonClass("primary", "md", "cursor-grab")}
      onClick={(e) => e.preventDefault()}
      title="Drag me to your bookmarks bar"
    >
      <Bookmark className="size-3.5" /> Save to tracker
    </a>
  );
}
