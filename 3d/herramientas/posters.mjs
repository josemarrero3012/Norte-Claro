// Norte Claro — imágenes fijas de las escenas 3D.
// Abre la portada en modo ?poster (sin animaciones), fotografía cada
// escenario con fondo transparente y anota dónde caen las etiquetas.
//
//   cd 3d && npx playwright@1 --version   (Playwright con Chromium)
//   python3 -m http.server 8765           (desde la raíz del repositorio)
//   node 3d/herramientas/posters.mjs http://localhost:8765
//   python3 3d/herramientas/a_webp.py
//
// Las posiciones que imprime van en los style="--x;--y" de las
// etiquetas del mapa en index.html (son las que se ven sin WebGL).
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";

const base = process.argv[2] || "http://localhost:8765";
const salida = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../blender/export");

const navegador = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await pagina.goto(base + "/index.html?poster", { waitUntil: "networkidle" });
await pagina.addStyleTag({ content: `
  .stage{width:600px!important;max-width:600px!important;height:600px!important;aspect-ratio:auto!important}
  .stage-poster,.stage-hint,.map-label{visibility:hidden!important}
  .dest-map{position:static!important}
  html,body,main,section{background:transparent!important}` });
for (const sel of [".stage--brujula", ".stage--mapa"]) await pagina.locator(sel).scrollIntoViewIfNeeded();
await pagina.waitForFunction(() => document.querySelectorAll("[data-3d][data-listo]").length === 2, null, { timeout: 60000 });
await pagina.waitForTimeout(2500);
const etiquetas = await pagina.$$eval("[data-etiqueta]", (els) =>
  els.map((e) => `${e.dataset.etiqueta}: --x:${e.style.getPropertyValue("--x")};--y:${e.style.getPropertyValue("--y")}`));
console.log(etiquetas.join("\n"));
for (const [sel, nombre] of [[".stage--brujula", "brujula"], [".stage--mapa", "mapa"]]) {
  await pagina.locator(sel).screenshot({ path: path.join(salida, nombre + ".png"), omitBackground: true });
}
await navegador.close();
console.log("PNG en", salida);
