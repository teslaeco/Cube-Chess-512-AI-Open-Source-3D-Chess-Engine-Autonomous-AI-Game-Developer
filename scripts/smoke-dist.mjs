import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const dist = resolve("dist");
const htmlPath = resolve(dist, "index.html");
const html = await readFile(htmlPath, "utf8");
const assetPaths = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(
  (match) => match[1],
);

if (!assetPaths.some((path) => path.endsWith(".js"))) {
  throw new Error("Production index does not reference a JavaScript bundle");
}
if (!assetPaths.some((path) => path.endsWith(".css"))) {
  throw new Error("Production index does not reference a CSS bundle");
}

for (const publicPath of assetPaths) {
  const relative = publicPath.replace(/^.*?\/assets\//, "assets/");
  await access(resolve(dist, relative));
}

await access(resolve(dist, "manifest.webmanifest"));
await access(resolve(dist, "sw.js"));
await access(resolve(dist, "icons/cube-chess.svg"));

console.log(`Production smoke test passed for ${assetPaths.length} bundles and the PWA shell.`);
