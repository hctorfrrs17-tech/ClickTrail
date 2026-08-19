import { hasSensitiveInput, isSensitiveTarget, permittedInstructionText } from "./shared/security";

declare global {
  interface Window {
    __clicktrailContentInstalled?: boolean;
  }
}

let isRecording = false;

function getElementLabel(target: HTMLElement): string {
  const element = target.closest<HTMLElement>("button, a, input, select, textarea, [role='button'], [contenteditable='true']") ?? target;
  const text = [
    element.getAttribute("data-clicktrail-label"),
    element.getAttribute("aria-label"),
    element.getAttribute("title"),
    element.getAttribute("placeholder"),
    element.innerText,
    element.textContent,
    element.getAttribute("name"),
    element.id ? `#${element.id}` : ""
  ].find(Boolean);
  return (text ?? element.tagName.toLowerCase()).replace(/\s+/g, " ").slice(0, 90);
}

function coordinates(event: MouseEvent) {
  return {
    clickX: Math.min(1, Math.max(0, event.clientX / Math.max(window.innerWidth, 1))),
    clickY: Math.min(1, Math.max(0, event.clientY / Math.max(window.innerHeight, 1)))
  };
}

function sendCapture(payload: Record<string, unknown>) {
  chrome.runtime.sendMessage({ type: "CAPTURE_STEP", payload }).catch(() => undefined);
}

if (!window.__clicktrailContentInstalled) {
  window.__clicktrailContentInstalled = true;
  document.addEventListener("click", (event) => {
    if (!isRecording || !(event.target instanceof HTMLElement)) return;
    if (event.target.closest("[data-clicktrail-ignore]") || isSensitiveTarget(event.target) || hasSensitiveInput()) return;
    if (event.target.closest("input, textarea")) return;
    sendCapture({
      targetLabel: getElementLabel(event.target),
      url: window.location.href,
      pageTitle: document.title,
      actionKind: "click",
      ...coordinates(event)
    });
  }, true);

  document.addEventListener("change", (event) => {
    if (!isRecording || !(event.target instanceof HTMLElement) || hasSensitiveInput()) return;
    const permittedText = permittedInstructionText(event.target);
    if (!permittedText) return;
    const rect = event.target.getBoundingClientRect();
    sendCapture({
      targetLabel: getElementLabel(event.target),
      url: window.location.href,
      pageTitle: document.title,
      actionKind: "type",
      clickX: Math.min(1, Math.max(0, (rect.left + rect.width / 2) / Math.max(window.innerWidth, 1))),
      clickY: Math.min(1, Math.max(0, (rect.top + rect.height / 2) / Math.max(window.innerHeight, 1))),
      permittedText
    });
  }, true);

  chrome.runtime.onMessage.addListener((message: { type?: string; recording?: boolean }) => {
    if (message.type === "SET_RECORDING_STATE") isRecording = Boolean(message.recording);
  });
}
