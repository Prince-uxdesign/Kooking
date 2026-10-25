// Writes the Fork brand icons. SVGs are written directly; PNGs are rendered
// from them with headless Chrome over the DevTools protocol (Node 22+).
// Usage: node scripts/generate-icons.mjs   (CHROME_PATH overrides the browser)
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Keep in sync with shared/ui/Logo.tsx
const PIN_PATH =
  "M32 3C18.2 3 8 13.6 8 27c0 15.5 16.5 28.6 22.2 33.1a2.9 2.9 0 0 0 3.6 0C39.5 55.6 56 42.5 56 27 56 13.6 45.8 3 32 3z";
const FORK_CUT = [
  '<rect x="29.7" y="-2" width="4.6" height="19" rx="2.3"/>',
  '<path d="M29.7 15H34.3C34.3 20 40.5 21.2 40.5 27.5V33H23.5V27.5C23.5 21.2 29.7 20 29.7 15Z"/>',
  '<rect x="23.5" y="27" width="3" height="19.5" rx="1.5"/>',
  '<rect x="28.17" y="27" width="3" height="19.5" rx="1.5"/>',
  '<rect x="32.83" y="27" width="3" height="19.5" rx="1.5"/>',
  '<rect x="37.5" y="27" width="3" height="19.5" rx="1.5"/>',
].join("");

const pin = (left, right) => `<defs>
  <mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64"><rect width="64" height="64" fill="#fff"/><g fill="#000">${FORK_CUT}</g></mask>
  <clipPath id="half"><rect x="32" y="0" width="32" height="64"/></clipPath>
</defs>
<g mask="url(#cut)"><path d="${PIN_PATH}" fill="${left}"/><path d="${PIN_PATH}" fill="${right}" clip-path="url(#half)"/></g>`;

/** Bare two-tone pin: favicon. */
const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
${pin("#F0571A", "#FF7A3D")}
</svg>
`;

/** App icon: white pin on a pepper-orange tile; the pin sits inside the maskable safe zone. */
const tileSvg = (
  radius,
) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<rect width="512" height="512" rx="${radius}" fill="#FF6A26"/>
<g transform="translate(96 92) scale(5)">${pin("#FFFFFF", "#FFE7D8")}</g>
</svg>
`;

const publicDir = path.resolve(process.cwd(), "public");
const iconsDir = path.join(publicDir, "icons");
fs.mkdirSync(iconsDir, { recursive: true });
fs.writeFileSync(path.join(iconsDir, "mark.svg"), markSvg);
fs.writeFileSync(path.join(iconsDir, "icon.svg"), tileSvg(112));
console.log("Wrote mark.svg, icon.svg");

const chromePath =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(process.env.TMPDIR ?? "/tmp", "fork-icons")}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  let ws;
  for (let i = 0; i < 40 && !ws; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
    } catch {
      await sleep(250);
    }
  }
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) pending.get(m.id)(m.result);
  });
  const send = (method, params = {}) =>
    new Promise((r) => {
      const i = ++id;
      pending.set(i, r);
      ws.send(JSON.stringify({ id: i, method, params }));
    });

  await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  const render = async (svg, size, file) => {
    await send("Emulation.setDeviceMetricsOverride", {
      width: size,
      height: size,
      deviceScaleFactor: 1,
      mobile: false,
    });
    const html = `<html><body style="margin:0;background:transparent">${svg.replace(
      /width="\d+" height="\d+"/,
      `width="${size}" height="${size}"`,
    )}</body></html>`;
    await send("Page.navigate", {
      url: `data:text/html;base64,${Buffer.from(html).toString("base64")}`,
    });
    await sleep(300);
    const { data } = await send("Page.captureScreenshot", {
      format: "png",
      clip: { x: 0, y: 0, width: size, height: size, scale: 1 },
    });
    fs.writeFileSync(file, Buffer.from(data, "base64"));
  };

  await render(tileSvg(0), 192, path.join(iconsDir, "icon-192.png"));
  await render(tileSvg(0), 512, path.join(iconsDir, "icon-512.png"));
  await render(tileSvg(0), 180, path.join(iconsDir, "apple-touch-icon.png"));
  await render(markSvg, 32, path.join(publicDir, "favicon.ico"));
  console.log("Rendered icon-192.png, icon-512.png, apple-touch-icon.png, favicon.ico");
  ws.close();
} finally {
  chrome.kill();
}
