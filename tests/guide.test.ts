import { describe, expect, it } from "vitest";
import { createGuideHtml, createSafeExportGuide, makeGuide, makeStep, normalizeRedaction } from "../src/shared/guide";
import { isRecordableUrl, isSafeScreenshot, safeHttpUrl } from "../src/shared/security";

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
});
