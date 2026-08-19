const SENSITIVE_HOSTS = new Set([
  "accounts.google.com",
  "appleid.apple.com",
  "paypal.com",
  "stripe.com",
  "wise.com",
  "revolut.com"
]);

const SENSITIVE_PATH = /(^|[\/_-])(login|log-in|signin|sign-in|password|checkout|payment|billing|wallet|bank|verify|verification)([\/_-]|$)/i;
const EXPLICIT_SENSITIVE_TEXT = /(?:\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:\+?\d[\d .()\-]{6,}\d)\b|\b(?:bearer|api[ _-]?key|access[ _-]?key|token|secret|password)\s*[:=]\s*[^\s]{4,})/gi;

export function safeHttpUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function isRecordableUrl(value: string | undefined): boolean {
  if (!value) return false;
  const safeUrl = safeHttpUrl(value);
  if (!safeUrl) return false;
  const url = new URL(safeUrl);
  const host = url.hostname.toLowerCase();
  return !SENSITIVE_HOSTS.has(host) && !SENSITIVE_PATH.test(`${url.pathname}${url.search}`);
}

export function cleanText(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 180) || fallback;
}

export function isSafeScreenshot(value: unknown): value is string {
  return typeof value === "string" && /^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(value) && value.length <= 12_000_000;
}

export function hasSensitiveInput(root: ParentNode = document): boolean {
  return Boolean(root.querySelector("input[type='password'], input[autocomplete*='password'], input[autocomplete*='cc-'], input[autocomplete='one-time-code'], input[name*='card' i], input[name*='cvv' i], input[name*='security-code' i]"));
}

export function isSensitiveTarget(target: HTMLElement): boolean {
  const field = target.closest<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
  if (!field) return false;
  const type = field instanceof HTMLInputElement ? field.type.toLowerCase() : "";
  const autocomplete = (field.getAttribute("autocomplete") ?? "").toLowerCase();
  const hint = `${field.name} ${field.id} ${field.getAttribute("aria-label") ?? ""}`.toLowerCase();
  return type === "password" || type === "email" || type === "tel" || autocomplete.includes("password") || autocomplete.includes("cc-") || autocomplete === "one-time-code" || /(card|cvv|security.?code|secret|token|email|phone|address|name|birth|passport|ssn)/.test(hint);
}

export function isSafeInstructionValue(value: unknown): value is string {
  const text = cleanText(value);
  return Boolean(text) && text.length <= 120 && !/@|(?:\d[ -]?){6,}|(?:api|access)[ _-]?key|bearer|token|secret/i.test(text);
}

export function hasExplicitSensitiveText(value: unknown): boolean {
  if (typeof value !== "string") return false;
  EXPLICIT_SENSITIVE_TEXT.lastIndex = 0;
  return EXPLICIT_SENSITIVE_TEXT.test(value);
}

function toRedaction(rect: DOMRect, viewportWidth: number, viewportHeight: number, id: string) {
  const left = Math.max(0, rect.left);
  const top = Math.max(0, rect.top);
  const right = Math.min(viewportWidth, rect.right);
  const bottom = Math.min(viewportHeight, rect.bottom);
  if (right - left < 2 || bottom - top < 2) return undefined;
  return { id, x: left / viewportWidth, y: top / viewportHeight, width: (right - left) / viewportWidth, height: (bottom - top) / viewportHeight };
}

/** Detects visual privacy zones locally. The matching text never leaves the page or reaches Ollama. */
export function findSensitiveRedactions(root: ParentNode = document) {
  if (typeof window === "undefined" || typeof document === "undefined") return [];
  const viewportWidth = Math.max(window.innerWidth, 1);
  const viewportHeight = Math.max(window.innerHeight, 1);
  const regions: Array<{ id: string; x: number; y: number; width: number; height: number }> = [];
  const add = (rect: DOMRect) => {
    const region = toRedaction(rect, viewportWidth, viewportHeight, crypto.randomUUID());
    if (!region || regions.length >= 32) return;
    const duplicate = regions.some((item) => Math.abs(item.x - region.x) < 0.01 && Math.abs(item.y - region.y) < 0.01 && Math.abs(item.width - region.width) < 0.01 && Math.abs(item.height - region.height) < 0.01);
    if (!duplicate) regions.push(region);
  };
  root.querySelectorAll?.("input, textarea").forEach((field) => {
    if (field instanceof HTMLElement && isSensitiveTarget(field)) add(field.getBoundingClientRect());
  });
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while (regions.length < 32 && (node = walker.nextNode())) {
    if (!hasExplicitSensitiveText(node.textContent ?? "")) continue;
    const parent = node.parentElement;
    if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) continue;
    const style = getComputedStyle(parent);
    if (style.display === "none" || style.visibility === "hidden") continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    Array.from(range.getClientRects()).forEach(add);
  }
  return regions;
}

/** Returns text that may be used in a local instruction. Personal, credential-like and long values are never returned. */
export function permittedInstructionText(target: HTMLElement): string | undefined {
  const field = target.closest<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
  if (!field || isSensitiveTarget(field)) return undefined;
  const type = field instanceof HTMLInputElement ? field.type.toLowerCase() : "text";
  if (!/^(text|search|url|textarea)$/.test(type)) return undefined;
  const value = cleanText(field.value);
  return isSafeInstructionValue(value) ? value : undefined;
}
