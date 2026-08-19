import { cleanText } from "./security";
import type { CapturePayload } from "./types";

export const OLLAMA_ENDPOINT = "http://127.0.0.1:11434";
export const OLLAMA_MODEL = "gemma3:1b";

export type LocalAnalysis = { title: string; note: string };

function modelIsInstalled(models: Array<{ name?: string }>) {
  return models.some(({ name }) => name === OLLAMA_MODEL || name?.startsWith(`${OLLAMA_MODEL.split(":")[0]}:`));
}

export async function ensureOllamaReady(): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${OLLAMA_ENDPOINT}/api/tags`);
  } catch {
    throw new Error("Ollama local is required. Install Ollama, start it, then run: ollama pull gemma3:1b");
  }
  if (!response.ok) throw new Error("Ollama local did not respond. Start Ollama, then run: ollama pull gemma3:1b");
  const data = await response.json() as { models?: Array<{ name?: string }> };
  if (!modelIsInstalled(data.models ?? [])) throw new Error("ClickTrail needs the local gemma3:1b model. Run: ollama pull gemma3:1b");
}

export function parseLocalAnalysis(value: unknown, payload: CapturePayload): LocalAnalysis {
  const fallbackTitle = payload.actionKind === "type" ? `Enter “${payload.permittedText ?? "text"}”` : `Select ${payload.targetLabel}`;
  const fallbackNote = payload.actionKind === "type"
    ? `Enter the shown non-sensitive text in ${payload.targetLabel}.`
    : `Select ${payload.targetLabel} on the recorded page.`;
  if (!value || typeof value !== "object") return { title: fallbackTitle, note: fallbackNote };
  const response = value as { title?: unknown; note?: unknown };
  const candidateTitle = cleanText(response.title);
  const candidateNote = cleanText(response.note);
  const targetWords = cleanText(payload.targetLabel).toLowerCase().split(/\s+/).filter((word) => word.length > 2);
  const titleMentionsTarget = targetWords.some((word) => candidateTitle.toLowerCase().includes(word));
  const noteMentionsTarget = targetWords.some((word) => candidateNote.toLowerCase().includes(word));
  return {
    title: candidateTitle.length >= 8 && titleMentionsTarget ? candidateTitle : fallbackTitle,
    note: candidateNote.length >= 12 && noteMentionsTarget ? candidateNote : fallbackNote
  };
}

export async function analyseLocally(payload: CapturePayload, _screenshot?: string): Promise<LocalAnalysis> {
  const host = new URL(payload.url).hostname;
  const content = [
    "You are ClickTrail, a local visual-guide writer.",
    "Return JSON only with title and note. Both must be concise English instructions.",
    "Describe only the recorded action. Do not invent results, UI text, private details, or sensitive data.",
    `Page title: ${cleanText(payload.pageTitle, "Recorded page")}`,
    `Website: ${host}`,
    `Action: ${payload.actionKind}`,
    `Target: ${cleanText(payload.targetLabel, "recorded control")}`,
    payload.permittedText ? `Permitted non-sensitive text entered: ${payload.permittedText}` : "No typed text was captured."
  ].join("\n");
  const response = await fetch(`${OLLAMA_ENDPOINT}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      format: "json",
      messages: [{ role: "user", content }],
      options: { num_ctx: 512, temperature: 0.1 }
    })
  });
  if (!response.ok) throw new Error("Ollama could not analyse this action. Check that the local gemma3:1b model is running.");
  const data = await response.json() as { message?: { content?: string } };
  try {
    return parseLocalAnalysis(JSON.parse(data.message?.content ?? ""), payload);
  } catch {
    throw new Error("Ollama returned an invalid local analysis. Try the recording again.");
  }
}
