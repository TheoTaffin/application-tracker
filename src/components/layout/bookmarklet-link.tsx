"use client";

import { Bookmark } from "lucide-react";
import { useEffect, useRef } from "react";
import { buttonClass } from "@/components/ui/button";

/**
 * The bookmarklet's code: opens this app's new-application dialog for the current page in
 * a new tab, so the posting stays open next to the form. Falls back to the same tab if the
 * browser blocks the new one. Returns nothing, or the browser would show the result as a page.
 */
export function bookmarkletCode(origin: string) {
  const prefix = JSON.stringify(`${origin}/?new=`);
  return `(()=>{const u=${prefix}+encodeURIComponent(location.href);if(!window.open(u,"_blank"))location.href=u})()`;
}

/**
 * React refuses to render `javascript:` URLs, so the bookmarklet's href is set on the
 * DOM node after mount. It points at this app's own origin.
 */
export function BookmarkletLink() {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const code = bookmarkletCode(window.location.origin);
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
