import { useMemo } from "react";
import { isolateEmailHtml } from "@/shared/lib/isolate-email-html";

interface EmailPreviewFrameProps {
  title: string;
  html: string;
  className?: string;
}

/**
 * A rendered email in a fully sandboxed frame: no scripts, same-origin, forms, popups or top-level
 * navigation, and an inert document with a deny-all resource policy inside it.
 */
export function EmailPreviewFrame({ title, html, className }: EmailPreviewFrameProps) {
  const document = useMemo(() => isolateEmailHtml(html), [html]);
  return (
    <iframe
      title={title}
      sandbox=""
      referrerPolicy="no-referrer"
      srcDoc={document}
      className={className}
    />
  );
}
