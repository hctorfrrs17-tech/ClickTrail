const SENSITIVE_HOSTS = new Set([
  "accounts.google.com",
  "appleid.apple.com",
  "paypal.com",
  "stripe.com",
  "wise.com",
  "revolut.com"
]);

const SENSITIVE_PATH = /(^|[\/_-])(login|log-in|signin|sign-in|password|checkout|payment|billing|wallet|bank|verify|verification)([\/_-]|$)/i;

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

/** Returns text that may be used in a local instruction. Personal, credential-like and long values are never returned. */
export function permittedInstructionText(target: HTMLElement): string | undefined {
  const field = target.closest<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
  if (!field || isSensitiveTarget(field)) return undefined;
  const type = field instanceof HTMLInputElement ? field.type.toLowerCase() : "text";
  if (!/^(text|search|url|textarea)$/.test(type)) return undefined;
  const value = cleanText(field.value);
  return isSafeInstructionValue(value) ? value : undefined;
}
