import { execFileSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";

await mkdir("release", { recursive: true });
await rm("release/clicktrail-chrome-extension-v0.2.0.zip", { force: true });
execFileSync("zip", ["-r", "../release/clicktrail-chrome-extension-v0.2.0.zip", "."], {
  cwd: "dist",
  stdio: "inherit"
});
console.log("Created release/clicktrail-chrome-extension-v0.2.0.zip");
