/** Elements that can execute, embed, submit, redirect or pull in another document. */
const removedElements = [
  "script",
  "noscript",
  "iframe",
  "frame",
  "frameset",
  "object",
  "embed",
  "applet",
  "link",
  "meta",
  "base",
  "form",
  "input",
  "button",
  "select",
  "textarea",
  "portal",
];

/** Attributes whose value is a URL the preview must never fetch or follow. */
const urlAttributes = [
  "href",
  "src",
  "srcset",
  "background",
  "poster",
  "action",
  "formaction",
  "xlink:href",
];

/**
 * No script, frame, form, connection or remote resource: only inline styles and embedded
 * `data:` images can render, so a preview can neither run nor phone home.
 */
const previewPolicy =
  "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; form-action 'none'; base-uri 'none'";

function isEmbeddedData(value: string) {
  return value.trim().toLowerCase().startsWith("data:image/");
}

/**
 * Turns rendered email HTML into an inert document for a sandboxed frame. The HTML is parsed, never
 * executed; links keep their text but lose their destination, and every URL-bearing attribute that
 * is not an embedded image is dropped. The frame's own sandbox and this policy are two independent
 * walls, so neither alone has to be perfect.
 */
export function isolateEmailHtml(html: string): string {
  const document = new DOMParser().parseFromString(html, "text/html");

  for (const element of document.querySelectorAll(removedElements.join(","))) element.remove();

  for (const element of document.querySelectorAll("*")) {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith("on")) element.removeAttribute(attribute.name);
      else if (urlAttributes.includes(name) && !isEmbeddedData(attribute.value))
        element.removeAttribute(attribute.name);
      else if (name === "style" && /url\s*\(|expression\s*\(/i.test(attribute.value))
        element.removeAttribute(attribute.name);
    }
  }

  // Links keep their text but lose every destination, including SVG `<a>`, `<use>` and `<image>`.
  for (const element of document.querySelectorAll("[href], [target], [ping]")) {
    element.removeAttribute("href");
    element.removeAttribute("target");
    element.removeAttribute("ping");
  }

  for (const style of document.querySelectorAll("style")) {
    style.textContent = (style.textContent ?? "")
      .replace(/@import[^;]*;?/gi, "")
      .replace(/url\s*\([^)]*\)/gi, "none");
  }

  const policy = document.createElement("meta");
  policy.setAttribute("http-equiv", "Content-Security-Policy");
  policy.setAttribute("content", previewPolicy);
  document.head.prepend(policy);

  return `<!doctype html>${document.documentElement.outerHTML}`;
}
