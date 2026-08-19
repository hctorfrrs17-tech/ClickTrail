import { createGuideHtml, createSafeExportGuide, makeGuide, normalizeRedaction } from "./shared/guide";
import { safeHttpUrl } from "./shared/security";
import { readState, writeState } from "./shared/storage";
import type { Guide, GuideStep, Redaction } from "./shared/types";

const stepsRoot = document.querySelector<HTMLElement>("#steps")!;
const emptyState = document.querySelector<HTMLElement>("#empty-state")!;
const guideTitle = document.querySelector<HTMLInputElement>("#guide-title")!;
const template = document.querySelector<HTMLTemplateElement>("#step-template")!;
let guide: Guide = makeGuide();
let saveTimeout: number | undefined;

function scheduleSave() {
  window.clearTimeout(saveTimeout);
  saveTimeout = window.setTimeout(async () => {
    const state = await readState();
    await writeState({ ...state, guide: { ...guide, updatedAt: Date.now() } });
  }, 250);
}

function visualRedactions(layer: HTMLElement, step: GuideStep) {
  layer.innerHTML = "";
  (step.autoRedactions ?? []).forEach((redaction) => {
    const box = document.createElement("i");
    box.className = "redaction-box redaction-box--automatic";
    box.style.left = `${redaction.x * 100}%`;
    box.style.top = `${redaction.y * 100}%`;
    box.style.width = `${redaction.width * 100}%`;
    box.style.height = `${redaction.height * 100}%`;
    box.title = "Automatically pixelated in the PDF export";
    layer.append(box);
  });
  step.redactions.forEach((redaction) => {
    const box = document.createElement("i");
    box.className = "redaction-box";
    box.style.left = `${redaction.x * 100}%`;
    box.style.top = `${redaction.y * 100}%`;
    box.style.width = `${redaction.width * 100}%`;
    box.style.height = `${redaction.height * 100}%`;
    box.title = "Click to remove this redaction";
    box.addEventListener("click", () => {
      step.redactions = step.redactions.filter((item) => item.id !== redaction.id);
      visualRedactions(layer, step);
      scheduleSave();
    });
    layer.append(box);
  });
}

function createCard(step: GuideStep, index: number) {
  const fragment = template.content.cloneNode(true) as DocumentFragment;
  const card = fragment.querySelector<HTMLElement>(".step-card")!;
  const image = fragment.querySelector<HTMLImageElement>(".step-image")!;
  const missing = fragment.querySelector<HTMLElement>(".missing-screenshot")!;
  const title = fragment.querySelector<HTMLInputElement>(".step-title")!;
  const note = fragment.querySelector<HTMLTextAreaElement>(".step-note")!;
  const url = fragment.querySelector<HTMLAnchorElement>(".recorded-url")!;
  const layer = fragment.querySelector<HTMLElement>(".redaction-layer")!;
  const marker = fragment.querySelector<HTMLElement>(".action-marker")!;
  const visual = fragment.querySelector<HTMLElement>(".step-visual")!;

  fragment.querySelector<HTMLElement>(".step-index")!.textContent = String(index + 1).padStart(2, "0");
  title.value = step.title;
  note.value = step.note;
  url.href = safeHttpUrl(step.url) ?? "#";
  if (step.screenshot) image.src = step.screenshot;
  else {
    image.classList.add("hidden");
    missing.classList.remove("hidden");
  }
  marker.style.left = `${(typeof step.clickX === "number" ? step.clickX : 0.5) * 100}%`;
  marker.style.top = `${(typeof step.clickY === "number" ? step.clickY : 0.5) * 100}%`;
  marker.classList.toggle("hidden", !step.screenshot);
  visualRedactions(layer, step);

  title.addEventListener("input", () => { step.title = title.value; scheduleSave(); });
  note.addEventListener("input", () => { step.note = note.value; scheduleSave(); });
  fragment.querySelector<HTMLButtonElement>(".delete-step")!.addEventListener("click", () => {
    guide.steps = guide.steps.filter((item) => item.id !== step.id); render(); scheduleSave();
  });
  fragment.querySelector<HTMLButtonElement>(".move-up")!.addEventListener("click", () => moveStep(index, -1));
  fragment.querySelector<HTMLButtonElement>(".move-down")!.addEventListener("click", () => moveStep(index, 1));
  fragment.querySelector<HTMLButtonElement>(".redact-button")!.addEventListener("click", () => {
    visual.dataset.redacting = visual.dataset.redacting === "true" ? "false" : "true";
    visual.classList.toggle("step-visual--redacting", visual.dataset.redacting === "true");
  });
  visual.addEventListener("click", (event) => {
    if (visual.dataset.redacting !== "true" || !step.screenshot) return;
    const rect = visual.getBoundingClientRect();
    const redaction: Redaction = normalizeRedaction({
      id: crypto.randomUUID(),
      x: (event.clientX - rect.left) / rect.width - 0.1,
      y: (event.clientY - rect.top) / rect.height - 0.05,
      width: 0.2,
      height: 0.1
    });
    step.redactions.push(redaction);
    visual.dataset.redacting = "false";
    visual.classList.remove("step-visual--redacting");
    visualRedactions(layer, step);
    scheduleSave();
  });
  return fragment;
}

function moveStep(index: number, direction: number) {
  const next = index + direction;
  if (next < 0 || next >= guide.steps.length) return;
  [guide.steps[index], guide.steps[next]] = [guide.steps[next], guide.steps[index]];
  render();
  scheduleSave();
}

function render() {
  guideTitle.value = guide.title;
  stepsRoot.innerHTML = "";
  emptyState.classList.toggle("hidden", guide.steps.length > 0);
  stepsRoot.classList.toggle("hidden", guide.steps.length === 0);
  guide.steps.forEach((step, index) => stepsRoot.append(createCard(step, index)));
}

async function exportPdf() {
  const safeGuide = await createSafeExportGuide(guide);
  const url = URL.createObjectURL(new Blob([createGuideHtml(safeGuide)], { type: "text/html" }));
  const printable = window.open(url, "_blank", "noopener,noreferrer");
  if (!printable) return;
  printable.addEventListener("load", () => printable.print());
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

guideTitle.addEventListener("input", () => { guide.title = guideTitle.value; scheduleSave(); });
document.querySelector<HTMLButtonElement>("#new-guide")!.addEventListener("click", async () => {
  if (!confirm("Start a new guide? Your current local guide will be replaced.")) return;
  guide = makeGuide(); render(); scheduleSave();
});
document.querySelectorAll<HTMLButtonElement>("#export-pdf, #export-pdf-sidebar").forEach((button) => button.addEventListener("click", exportPdf));

(async () => {
  const state = await readState();
  guide = state.guide ?? makeGuide();
  render();
})();
