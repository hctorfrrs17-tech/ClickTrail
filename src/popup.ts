type PopupState = { recording: boolean; recordingTabId?: number; guide?: { createdAt: number }; lastError?: string };

const recordButton = document.querySelector<HTMLButtonElement>("#record-button")!;
const stopButton = document.querySelector<HTMLButtonElement>("#stop-button")!;
const timer = document.querySelector<HTMLElement>("#timer")!;
const stateLine = document.querySelector<HTMLElement>("#record-state")!;
const copy = document.querySelector<HTMLElement>("#record-copy")!;
let currentState: PopupState;
let timerHandle: number | undefined;

function formatTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function render(state: PopupState) {
  currentState = state;
  const recording = state.recording;
  recordButton.classList.toggle("record-button--active", recording);
  recordButton.setAttribute("aria-label", recording ? "Recording current workflow" : "Start recording");
  stopButton.classList.toggle("hidden", !recording);
  stateLine.innerHTML = `<span class="status-dot ${recording ? "status-dot--live" : ""}"></span><span>${recording ? "Recording this tab locally" : "Ready to capture locally"}</span>`;
  copy.textContent = state.lastError ?? (recording ? "Ollama is analysing each safe action locally." : "Ollama local is required. Start recording, then complete a workflow in the current tab.");
  window.clearInterval(timerHandle);
  if (recording && state.guide?.createdAt) {
    const update = () => { timer.textContent = formatTime(Math.max(0, Math.floor((Date.now() - state.guide!.createdAt) / 1000))); };
    update();
    timerHandle = window.setInterval(update, 1000);
  } else timer.textContent = "00:00";
}

async function refresh() {
  render(await chrome.runtime.sendMessage({ type: "GET_STATE" }));
}

recordButton.addEventListener("click", async () => {
  if (currentState.recording) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id || !tab.url?.startsWith("http")) {
    copy.textContent = "Open a regular website first. Chrome does not allow recording internal browser pages.";
    return;
  }
  const result = await chrome.runtime.sendMessage({ type: "START_RECORDING", tabId: tab.id, tabTitle: tab.title });
  if (!result?.ok) {
    copy.textContent = result?.error ?? "Clicktrail could not start a secure recording on this page.";
    return;
  }
  await refresh();
});

stopButton.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "STOP_RECORDING" });
  await refresh();
});

document.querySelector<HTMLButtonElement>("#open-editor")!.addEventListener("click", () => chrome.runtime.sendMessage({ type: "OPEN_EDITOR" }));
document.querySelector<HTMLButtonElement>("#clear-guide")!.addEventListener("click", async () => {
  if (!confirm("Delete the local guide and every captured screenshot?")) return;
  await chrome.runtime.sendMessage({ type: "CLEAR_GUIDE" });
  await refresh();
});

refresh();
