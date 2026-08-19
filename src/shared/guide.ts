import type { Guide, GuideStep, Redaction } from "./types";
import { cleanText, isSafeScreenshot, safeHttpUrl } from "./security";

const escape = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#39;",
  "\"": "&quot;"
})[character] ?? character);

export function makeGuide(title = "Untitled guide"): Guide {
  const now = Date.now();
  return { id: crypto.randomUUID(), title, createdAt: now, updatedAt: now, steps: [] };
}

export function makeStep(payload: Pick<GuideStep, "title" | "targetLabel" | "url" | "screenshot">): GuideStep {
  return {
    id: crypto.randomUUID(),
    title: cleanText(payload.title, "Complete this step"),
    note: "",
    url: safeHttpUrl(payload.url) ?? "",
    targetLabel: cleanText(payload.targetLabel, "Recorded action"),
    screenshot: isSafeScreenshot(payload.screenshot) ? payload.screenshot : undefined,
    createdAt: Date.now(),
    redactions: []
  };
}

export function normalizeRedaction(redaction: Redaction): Redaction {
  const x = Math.min(Math.max(redaction.x, 0), 1);
  const y = Math.min(Math.max(redaction.y, 0), 1);
  const width = Math.min(Math.max(redaction.width, 0.01), 1 - x);
  const height = Math.min(Math.max(redaction.height, 0.01), 1 - y);
  const round = (value: number) => Math.round(value * 10_000) / 10_000;
  return { ...redaction, x: round(x), y: round(y), width: round(width), height: round(height) };
}

export function createGuideHtml(guide: Guide): string {
  const steps = guide.steps.map((step, index) => {
    const boxes = step.redactions.map((redaction) => `<i class="redaction" style="left:${redaction.x * 100}%;top:${redaction.y * 100}%;width:${redaction.width * 100}%;height:${redaction.height * 100}%"></i>`).join("");
    const visual = step.screenshot
      ? `<div class="visual"><img src="${step.screenshot}" alt="Screenshot for step ${index + 1}">${boxes}</div>`
      : `<div class="visual visual--empty">Screenshot was unavailable on this page.</div>`;
    const safeLink = safeHttpUrl(step.url);
    return `<article class="step"><div class="step-number">${String(index + 1).padStart(2, "0")}</div><div class="step-body"><h2>${escape(step.title)}</h2>${step.note ? `<p>${escape(step.note)}</p>` : ""}${visual}${safeLink ? `<a href="${escape(safeLink)}" target="_blank" rel="noreferrer">Open the recorded page ↗</a>` : ""}</div></article>`;
  }).join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(guide.title)} · Clicktrail</title><style>body{margin:0;background:#f5f4ee;color:#161b26;font:16px/1.55 Inter,ui-sans-serif,system-ui,sans-serif}.shell{max-width:920px;margin:auto;padding:56px 24px}.eyebrow{font:700 12px/1 ui-monospace,monospace;letter-spacing:.12em;color:#4b7bff;text-transform:uppercase}h1{font-size:clamp(2.4rem,8vw,5.5rem);line-height:.92;margin:18px 0 48px;letter-spacing:-.065em}.step{display:grid;grid-template-columns:72px 1fr;gap:20px;padding:32px 0;border-top:1px solid #c8c9c5}.step-number{font:700 14px/1 ui-monospace,monospace;color:#4b7bff;padding-top:8px}.step h2{margin:0 0 8px;font-size:1.45rem;letter-spacing:-.03em}.step p{color:#545b6a;margin:0 0 18px}.visual{position:relative;overflow:hidden;border:1px solid #cbd0d9;background:#161b26;border-radius:12px;margin:20px 0}.visual img{display:block;width:100%;height:auto}.visual--empty{color:#fff;padding:64px 24px}.redaction{position:absolute;background:#111827;border:1px solid #4b7bff}a{color:#2859e8;font-weight:700;text-decoration:none}@media print{.shell{padding:0}.step{break-inside:avoid}a{display:none}}</style></head><body><main class="shell"><div class="eyebrow">Clicktrail · local-first handoff</div><h1>${escape(guide.title)}</h1>${steps || "<p>No steps were captured.</p>"}</main></body></html>`;
}

export function makeFilename(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "clicktrail-guide";
}

function redactScreenshot(dataUrl: string, redactions: Redaction[]): Promise<string> {
  if (!redactions.length || typeof document === "undefined") return Promise.resolve(dataUrl);
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) return resolve(dataUrl);
      context.drawImage(image, 0, 0);
      context.fillStyle = "#080d16";
      redactions.map(normalizeRedaction).forEach((redaction) => context.fillRect(
        Math.floor(redaction.x * canvas.width),
        Math.floor(redaction.y * canvas.height),
        Math.ceil(redaction.width * canvas.width),
        Math.ceil(redaction.height * canvas.height)
      ));
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

export async function createSafeExportGuide(guide: Guide): Promise<Guide> {
  const steps = await Promise.all(guide.steps.map(async (step) => ({
    ...step,
    title: cleanText(step.title, "Complete this step"),
    note: cleanText(step.note),
    targetLabel: cleanText(step.targetLabel, "Recorded action"),
    url: safeHttpUrl(step.url) ?? "",
    screenshot: isSafeScreenshot(step.screenshot) ? await redactScreenshot(step.screenshot, step.redactions) : undefined,
    redactions: []
  })));
  return { ...guide, title: cleanText(guide.title, "Untitled guide"), steps };
}
