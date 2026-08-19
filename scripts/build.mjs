import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";

const dist = new URL("../dist/", import.meta.url);
const source = new URL("../src/", import.meta.url);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await Promise.all([
  build({ entryPoints: ["src/background.ts"], outfile: "dist/background.js", bundle: true, format: "esm", platform: "browser", target: ["chrome114"] }),
  build({ entryPoints: ["src/content.ts"], outfile: "dist/content.js", bundle: true, format: "iife", platform: "browser", target: ["chrome114"] }),
  build({ entryPoints: ["src/popup.ts"], outfile: "dist/popup.js", bundle: true, format: "iife", platform: "browser", target: ["chrome114"] }),
  build({ entryPoints: ["src/editor.ts"], outfile: "dist/editor.js", bundle: true, format: "iife", platform: "browser", target: ["chrome114"] })
]);

await Promise.all([
  cp(new URL("manifest.json", source), new URL("manifest.json", dist)),
  cp(new URL("popup.html", source), new URL("popup.html", dist)),
  cp(new URL("editor.html", source), new URL("editor.html", dist)),
  cp(new URL("styles.css", source), new URL("styles.css", dist)),
  cp(new URL("icons", source), new URL("icons", dist), { recursive: true })
]);

console.log("Clicktrail build completed in dist/");
