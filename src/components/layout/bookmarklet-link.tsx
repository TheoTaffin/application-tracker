"use client";

import { Bookmark } from "lucide-react";
import { useEffect, useRef } from "react";
import { buttonClass } from "@/components/ui/button";
import { captureAnswers } from "@/lib/form-capture";

/**
 * The bookmarklet's code: opens this app's new-application dialog for the current page in
 * a new tab, so the posting stays open next to the form. Falls back to the same tab if the
 * browser blocks the new one. Returns nothing, or the browser would show the result as a page.
 *
 * Answers already typed in the page's application form go along in the URL fragment,
 * which browsers never send to a server. A page where reading them fails still opens.
 */
export function bookmarkletCode(origin: string) {
  const prefix = JSON.stringify(`${origin}/?new=`);
  return `(()=>{let a=[];try{a=(${captureAnswers.toString()})(document)}catch{}const u=${prefix}+encodeURIComponent(location.href)+(a.length?"#answers="+encodeURIComponent(JSON.stringify(a)):"");if(!window.open(u,"_blank"))location.href=u})()`;
}

/**
 * The bookmark's URL. Encoded, because browsers strip line breaks from URLs and decode
 * `%` sequences before running a `javascript:` URL.
 */
export function bookmarkletHref(origin: string) {
  return `javascript:${encodeURIComponent(bookmarkletCode(origin))}`;
}

/**
 * React refuses to render `javascript:` URLs, so the bookmarklet's href is set on the
 * DOM node after mount. It points at this app's own origin.
 */
export function BookmarkletLink() {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    ref.current?.setAttribute("href", bookmarkletHref(window.location.origin));
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
