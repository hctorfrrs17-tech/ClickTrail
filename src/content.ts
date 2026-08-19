let isRecording = false;

function getElementLabel(target: HTMLElement): string {
  const element = target.closest<HTMLElement>("button, a, input, select, textarea, [role='button'], [contenteditable='true']") ?? target;
  const text = [
    element.getAttribute("aria-label"),
    element.getAttribute("title"),
    element.getAttribute("name"),
    element.textContent?.trim(),
    element.id ? `#${element.id}` : ""
  ].find(Boolean);
  return (text ?? element.tagName.toLowerCase()).replace(/\s+/g, " ").slice(0, 90);
}

document.addEventListener("click", (event) => {
  if (!isRecording || !(event.target instanceof HTMLElement)) return;
  if (event.target.closest("[data-clicktrail-ignore]")) return;

  chrome.runtime.sendMessage({
    type: "CAPTURE_STEP",
    payload: {
      title: `Select ${getElementLabel(event.target)}`,
      targetLabel: getElementLabel(event.target),
      url: window.location.href
    }
  }).catch(() => undefined);
}, true);

chrome.runtime.onMessage.addListener((message: { type?: string; recording?: boolean }) => {
  if (message.type === "SET_RECORDING_STATE") isRecording = Boolean(message.recording);
});
