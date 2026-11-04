// Compone la versión horizontal con los píxeles del original, sin redibujarlo.
// Ejecutar desde cualquier carpeta: node scripts/brand-assets.mjs
import { readFile, writeFile } from "node:fs/promises";

const assets = new URL("../assets/", import.meta.url);
const original = await readFile(new URL("rumbo-norte-original.png", assets));
const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 292 84" width="292" height="84" role="img" aria-labelledby="title">
  <title id="title">Rumbo Norte</title>
  <defs><image id="original" width="1000" height="1000" href="data:image/png;base64,${original.toString("base64")}"/></defs>
  <svg x="0" y="0" width="84" height="84" viewBox="303 180 411 411"><use href="#original"/></svg>
  <svg x="96" y="0" width="192" height="84" viewBox="245 650 510 223.125"><use href="#original"/></svg>
</svg>
`;
await writeFile(new URL("logo.svg", assets), logo);
console.log("assets/logo.svg generado a partir del logotipo original.");
