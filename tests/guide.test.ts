import { describe, expect, it } from "vitest";
import { createGuideHtml, makeGuide, makeStep, normalizeRedaction } from "../src/shared/guide";

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
});
