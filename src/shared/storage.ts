import type { ExtensionState, Guide } from "./types";

const STATE_KEY = "clicktrail-state";

export async function readState(): Promise<ExtensionState> {
  const result = await chrome.storage.local.get(STATE_KEY);
  return (result[STATE_KEY] as ExtensionState | undefined) ?? { recording: false };
}

export async function writeState(state: ExtensionState): Promise<void> {
  await chrome.storage.local.set({ [STATE_KEY]: state });
}

export async function writeGuide(guide: Guide): Promise<void> {
  const state = await readState();
  await writeState({ ...state, guide: { ...guide, updatedAt: Date.now() } });
}
