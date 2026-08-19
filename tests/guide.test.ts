import { describe, expect, it } from "vitest";
import { createGuideHtml, createSafeExportGuide, makeGuide, makeStep, normalizeRedaction } from "../src/shared/guide";
import { parseLocalAnalysis } from "../src/shared/ollama";
import { isRecordableUrl, isSafeInstructionValue, isSafeScreenshot, safeHttpUrl } from "../src/shared/security";

describe("Clicktrail guide helpers", () => {
  it("keeps redactions inside the screenshot boundary", () => {
    expect(normalizeRedaction({ id: "x", x: -0.2, y: 0.9, width: 1.4, height: 0.5 })).toEqual({ id: "x", x: 0, y: 0.9, width: 1, height: 0.1 });
  });

  it("renders guide titles and escapes user content in an export", () => {
    const guide = makeGuide("Client <handoff>");
    guide.steps.push(makeStep({ title: "Open <settings>", targetLabel: "Settings", url: "https://example.com", screenshot: undefined }));
    const html = createGuideHtml(guide);
    expect(html).toContain("Client &lt;handoff&gt;");
    expect(html).toContain("Open &lt;settings&gt;");
    expect(html).not.toContain("Open <settings>");
  });

  it("rejects unsafe guide destinations and sensitive recording pages", async () => {
    const guide = makeGuide("Safe export");
    guide.steps.push(makeStep({ title: "Open settings", targetLabel: "Settings", url: "javascript:alert(1)", screenshot: undefined }));
    const safeGuide = await createSafeExportGuide(guide);
    expect(safeGuide.steps[0].url).toBe("");
    expect(createGuideHtml(safeGuide)).not.toContain("javascript:");
    expect(safeHttpUrl("file:///etc/passwd")).toBeUndefined();
    expect(isRecordableUrl("https://accounts.google.com/login")).toBe(false);
    expect(isRecordableUrl("https://example.com/project/settings")).toBe(true);
    expect(isSafeScreenshot("data:image/png;base64,aGVsbG8=")).toBe(true);
    expect(isSafeScreenshot("data:text/html;base64,PHNjcmlwdD4=")).toBe(false);
  });

  it("allows only short non-sensitive text for local instructions", () => {
    expect(isSafeInstructionValue("hello")).toBe(true);
    expect(isSafeInstructionValue("user@example.com")).toBe(false);
    expect(isSafeInstructionValue("4111 1111 1111 1111")).toBe(false);
    expect(isSafeInstructionValue("Bearer local-secret")).toBe(false);
  });

  it("normalizes the local Ollama response and keeps a safe fallback", () => {
    const payload = { targetLabel: "search field", url: "https://example.com", pageTitle: "Example Domain", actionKind: "type" as const, clickX: 0.4, clickY: 0.3, permittedText: "hello" };
    expect(parseLocalAnalysis({ title: "Search for hello", note: "Enter hello in the search field." }, payload)).toEqual({ title: "Search for hello", note: "Enter hello in the search field." });
    expect(parseLocalAnalysis({ title: "Click", note: "User clicked a link." }, payload)).toEqual({ title: "Enter “hello”", note: "Enter the shown non-sensitive text in search field." });
    expect(parseLocalAnalysis(undefined, payload)).toEqual({ title: "Enter “hello”", note: "Enter the shown non-sensitive text in search field." });
  });
});
