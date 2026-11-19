import { describe, expect, it } from "vitest";
import { isolateEmailHtml } from "./isolate-email-html";

const canary = `<!doctype html><html><head>
<meta http-equiv="refresh" content="0;url=https://evil.test/refresh-canary">
<base href="https://evil.test/">
<link rel="stylesheet" href="https://evil.test/style-canary.css">
<style>@import url("https://evil.test/import-canary.css"); p { color: red; background: url(https://evil.test/style-url-canary.png); }</style>
<script>window.scriptCanary = true</script>
</head><body onload="window.onloadCanary = true">
<p style="background:url(https://evil.test/bg-canary.png)">Hello</p>
<a href="https://evil.test/link-canary" target="_top" ping="https://evil.test/ping">Open</a>
<img src="https://evil.test/pixel-canary.png" srcset="https://evil.test/set-canary.png 2x" alt="tracker">
<img src="data:image/png;base64,iVBORw0KGgo=" alt="inline">
<iframe src="https://evil.test/frame-canary"></iframe>
<form action="https://evil.test/form-canary"><input name="secret"></form>
<svg><a xlink:href="javascript:alert(1)">x</a><image href="https://evil.test/svg-image-canary.png"/><use href="https://evil.test/svg-use-canary.svg#a"/></svg>
</body></html>`;

describe("isolateEmailHtml", () => {
  const isolated = isolateEmailHtml(canary);

  it("removes every script, frame, form, redirect and external stylesheet", () => {
    for (const leak of [
      "scriptCanary",
      "onloadCanary",
      "refresh-canary",
      "style-canary",
      "import-canary",
      "frame-canary",
      "form-canary",
      'evil.test/"',
      "javascript:",
      "style-url-canary",
      "svg-image-canary",
      "svg-use-canary",
    ])
      expect(isolated).not.toContain(leak);
  });

  it("keeps link text but no destination, target or ping", () => {
    expect(isolated).toContain("Open");
    expect(isolated).not.toContain("link-canary");
    expect(isolated).not.toContain('target="_top"');
    expect(isolated).not.toContain("ping");
  });

  it("drops remote images and style URLs but keeps embedded images", () => {
    expect(isolated).not.toContain("pixel-canary");
    expect(isolated).not.toContain("set-canary");
    expect(isolated).not.toContain("bg-canary");
    expect(isolated).toContain("data:image/png;base64");
  });

  it("pins a deny-all resource policy into the document head", () => {
    expect(isolated).toMatch(
      /<head><meta http-equiv="Content-Security-Policy" content="default-src 'none';/,
    );
  });
});
