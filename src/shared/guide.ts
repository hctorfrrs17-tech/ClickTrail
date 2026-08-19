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

export function normalizeRedaction(redaction: Redaction): Redaction {
  const x = Math.min(Math.max(redaction.x, 0), 1);
  const y = Math.min(Math.max(redaction.y, 0), 1);
  const width = Math.min(Math.max(redaction.width, 0.01), 1 - x);
  const height = Math.min(Math.max(redaction.height, 0.01), 1 - y);
  const round = (value: number) => Math.round(value * 10_000) / 10_000;
  return { ...redaction, x: round(x), y: round(y), width: round(width), height: round(height) };
}

function safeRedactions(value: unknown): Redaction[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 32).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Partial<Redaction>;
    if (![candidate.x, candidate.y, candidate.width, candidate.height].every((number) => typeof number === "number" && Number.isFinite(number))) return [];
    return [normalizeRedaction({
      id: typeof candidate.id === "string" ? candidate.id : crypto.randomUUID(),
      x: candidate.x!,
      y: candidate.y!,
      width: candidate.width!,
      height: candidate.height!
    })];
  });
}

export function makeStep(payload: Pick<GuideStep, "title" | "targetLabel" | "url" | "screenshot"> & Partial<Pick<GuideStep, "note" | "actionKind" | "clickX" | "clickY" | "autoRedactions">>): GuideStep {
  return {
    id: crypto.randomUUID(),
    title: cleanText(payload.title, "Complete this step"),
    note: cleanText(payload.note),
    url: safeHttpUrl(payload.url) ?? "",
    targetLabel: cleanText(payload.targetLabel, "Recorded action"),
    actionKind: payload.actionKind ?? "click",
    clickX: Math.min(1, Math.max(0, payload.clickX ?? 0.5)),
    clickY: Math.min(1, Math.max(0, payload.clickY ?? 0.5)),
    screenshot: isSafeScreenshot(payload.screenshot) ? payload.screenshot : undefined,
    createdAt: Date.now(),
    redactions: [],
    autoRedactions: safeRedactions(payload.autoRedactions)
  };
}

export function createGuideHtml(guide: Guide): string {
  const steps = guide.steps.map((step, index) => {
    const visual = step.screenshot
      ? `<div class="visual"><img src="${step.screenshot}" alt="Screenshot for step ${index + 1}"></div>`
      : `<div class="visual visual--empty">Screenshot was unavailable on this page.</div>`;
    const safeLink = safeHttpUrl(step.url);
    return `<article class="step"><div class="step-number">${String(index + 1).padStart(2, "0")}</div><div class="step-body"><h2>${escape(step.title)}</h2>${step.note ? `<p>${escape(step.note)}</p>` : ""}${visual}${safeLink ? `<a href="${escape(safeLink)}" target="_blank" rel="noreferrer">Open the recorded page ↗</a>` : ""}</div></article>`;
  }).join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(guide.title)} · ClickTrail</title><style>body{margin:0;background:#f5f4ee;color:#161b26;font:16px/1.55 Inter,ui-sans-serif,system-ui,sans-serif}.shell{max-width:920px;margin:auto;padding:56px 24px}.eyebrow{font:700 12px/1 ui-monospace,monospace;letter-spacing:.12em;color:#4b7bff;text-transform:uppercase}h1{font-size:clamp(2.4rem,8vw,5.5rem);line-height:.92;margin:18px 0 48px;letter-spacing:-.065em}.step{display:grid;grid-template-columns:72px 1fr;gap:20px;padding:32px 0;border-top:1px solid #c8c9c5}.step-number{font:700 14px/1 ui-monospace,monospace;color:#4b7bff;padding-top:8px}.step h2{margin:0 0 8px;font-size:1.45rem;letter-spacing:-.03em}.step p{color:#545b6a;margin:0 0 18px}.visual{position:relative;overflow:hidden;border:1px solid #cbd0d9;background:#161b26;border-radius:12px;margin:20px 0}.visual img{display:block;width:100%;height:auto}.visual--empty{color:#fff;padding:64px 24px}a{color:#2859e8;font-weight:700;text-decoration:none}@media print{.shell{padding:0}.step{break-inside:avoid}a{display:none}}</style></head><body><main class="shell"><div class="eyebrow">ClickTrail · local-first handoff</div><h1>${escape(guide.title)}</h1>${steps || "<p>No steps were captured.</p>"}</main></body></html>`;
}

export function makeFilename(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "clicktrail-guide";
}

function pixelate(context: CanvasRenderingContext2D, redaction: Redaction, width: number, height: number) {
  const x = Math.floor(redaction.x * width);
  const y = Math.floor(redaction.y * height);
  const pixelWidth = Math.max(1, Math.ceil(redaction.width * width));
  const pixelHeight = Math.max(1, Math.ceil(redaction.height * height));
  const scale = Math.max(8, Math.min(20, Math.round(Math.min(pixelWidth, pixelHeight) / 8)));
  const sample = document.createElement("canvas");
  sample.width = Math.max(1, Math.floor(pixelWidth / scale));
  sample.height = Math.max(1, Math.floor(pixelHeight / scale));
  const sampleContext = sample.getContext("2d");
  if (!sampleContext) return;
  sampleContext.drawImage(context.canvas, x, y, pixelWidth, pixelHeight, 0, 0, sample.width, sample.height);
  context.save();
  context.imageSmoothingEnabled = false;
  context.drawImage(sample, 0, 0, sample.width, sample.height, x, y, pixelWidth, pixelHeight);
  context.restore();
}

function annotateScreenshot(dataUrl: string, step: GuideStep, index: number): Promise<string> {
  if (typeof document === "undefined") return Promise.resolve(dataUrl);
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) return resolve(dataUrl);
      context.drawImage(image, 0, 0);

      safeRedactions(step.autoRedactions).forEach((redaction) => pixelate(context, redaction, canvas.width, canvas.height));

      const x = Math.round(step.clickX * canvas.width);
      const y = Math.round(step.clickY * canvas.height);
      const startX = x > canvas.width * 0.3 ? x - Math.min(128, canvas.width * 0.16) : x + Math.min(128, canvas.width * 0.16);
      const startY = y > canvas.height * 0.3 ? y - Math.min(108, canvas.height * 0.16) : y + Math.min(108, canvas.height * 0.16);
      context.save();
      context.strokeStyle = "#ff5269";
      context.fillStyle = "#ff5269";
      context.lineWidth = Math.max(5, Math.round(canvas.width / 180));
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(startX, startY);
      context.lineTo(x, y);
      context.stroke();
      const angle = Math.atan2(y - startY, x - startX);
      const head = Math.max(14, Math.round(canvas.width / 58));
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x - head * Math.cos(angle - Math.PI / 6), y - head * Math.sin(angle - Math.PI / 6));
      context.lineTo(x - head * Math.cos(angle + Math.PI / 6), y - head * Math.sin(angle + Math.PI / 6));
      context.closePath();
      context.fill();
      context.font = `700 ${Math.max(18, Math.round(canvas.width / 42))}px ui-monospace, monospace`;
      const label = `STEP ${index + 1}`;
      const padding = Math.max(10, Math.round(canvas.width / 100));
      const labelWidth = context.measureText(label).width + padding * 2;
      const labelX = Math.min(Math.max(12, startX - labelWidth / 2), canvas.width - labelWidth - 12);
      const labelY = Math.min(Math.max(12, startY - 20), canvas.height - 54);
      context.fillStyle = "#111827";
      context.fillRect(labelX, labelY, labelWidth, 42);
      context.fillStyle = "#ffffff";
      context.fillText(label, labelX + padding, labelY + 28);
      context.restore();

      context.fillStyle = "#080d16";
      safeRedactions(step.redactions).forEach((redaction) => context.fillRect(
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
  const steps = await Promise.all(guide.steps.map(async (step, index) => ({
    ...step,
    title: cleanText(step.title, "Complete this step"),
    note: cleanText(step.note),
    targetLabel: cleanText(step.targetLabel, "Recorded action"),
    actionKind: step.actionKind === "type" ? ("type" as const) : ("click" as const),
    clickX: Math.min(1, Math.max(0, typeof step.clickX === "number" ? step.clickX : 0.5)),
    clickY: Math.min(1, Math.max(0, typeof step.clickY === "number" ? step.clickY : 0.5)),
    url: safeHttpUrl(step.url) ?? "",
    screenshot: isSafeScreenshot(step.screenshot) ? await annotateScreenshot(step.screenshot, { ...step, autoRedactions: safeRedactions(step.autoRedactions), redactions: safeRedactions(step.redactions) }, index) : undefined,
    redactions: [],
    autoRedactions: []
  })));
  return { ...guide, title: cleanText(guide.title, "Untitled guide"), steps };
}
