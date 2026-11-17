export function isApplePlatform() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
}

export function shortcutLabel() {
  return isApplePlatform() ? "⌘K" : "Ctrl K";
}
