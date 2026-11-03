/* Norte Claro — piezas 3D: utilidades compartidas.
   Un renderizador por escena, dibujo bajo demanda (la GPU descansa
   cuando nada se mueve) y pausa cuando la escena sale de pantalla. */
import {
  WebGLRenderer, Scene, PerspectiveCamera, PMREMGenerator,
  NeutralToneMapping, PCFShadowMap, SRGBColorSpace,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export const MOV_REDUCIDO = () =>
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let cargador;
export function cargarModelo(url) {
  if (!cargador) {
    cargador = new GLTFLoader();
    cargador.setMeshoptDecoder(MeshoptDecoder);
  }
  return new Promise((ok, mal) => cargador.load(url, ok, undefined, mal));
}

/** Crea lienzo, renderizador, escena y cámara dentro de `escenario`.
 *  `paso(dt)` devuelve true mientras quede movimiento por dibujar. */
export function crearVisor(escenario, { fov = 30, sombras = true, maxDpr = 2 } = {}) {
  const lienzo = document.createElement("canvas");
  lienzo.className = "stage-canvas";
  lienzo.setAttribute("aria-hidden", "true");
  escenario.appendChild(lienzo);

  const renderer = new WebGLRenderer({
    canvas: lienzo, antialias: true, alpha: true,
    powerPreference: "high-performance", preserveDrawingBuffer: false,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 0.96;
  if (sombras) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap; // con shadow.radius es suave
  }

  const escena = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const entorno = new RoomEnvironment();
  escena.environment = pmrem.fromScene(entorno, 0.04).texture;
  entorno.dispose?.();
  pmrem.dispose();

  const camara = new PerspectiveCamera(fov, 1, 0.1, 100);

  const visor = {
    lienzo, renderer, escena, camara,
    ancho: 1, alto: 1,
    paso: null,          // (dt) => boolean
    antesDeDibujar: null,
    alRedimensionar: null,
    visible: true,
  };

  let pendiente = true;
  let rafId = 0;
  let ultimo = 0;

  function bucle(t) {
    rafId = 0;
    if (!visor.visible) { ultimo = 0; return; }
    const dt = ultimo ? Math.min((t - ultimo) / 1000, 1 / 20) : 1 / 60;
    ultimo = t;
    const sigue = visor.paso ? visor.paso(dt) : false;
    if (visor.antesDeDibujar) visor.antesDeDibujar();
    renderer.render(escena, camara);
    pendiente = false;
    if (sigue) rafId = requestAnimationFrame(bucle);
    else ultimo = 0;
  }

  /** Dibuja ya, sin esperar al siguiente fotograma (compila los shaders
   *  antes, para que el primer dibujo no deje el lienzo en blanco). */
  visor.dibujarYa = function () {
    renderer.compile(escena, camara);
    if (visor.antesDeDibujar) visor.antesDeDibujar();
    renderer.render(escena, camara);
    pendiente = false;
  };

  visor.despertar = function () {
    pendiente = true;
    if (!rafId && visor.visible) rafId = requestAnimationFrame(bucle);
  };

  function medir() {
    const r = escenario.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    const dpr = Math.min(window.devicePixelRatio || 1, w < 520 ? Math.min(maxDpr, 1.75) : maxDpr);
    visor.ancho = w; visor.alto = h;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
    if (visor.alRedimensionar) visor.alRedimensionar(w, h);
    visor.despertar();
  }
  medir();
  if ("ResizeObserver" in window) new ResizeObserver(medir).observe(escenario);
  else window.addEventListener("resize", medir);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        visor.visible = e.isIntersecting;
        if (visor.visible) visor.despertar();
      }
    }, { rootMargin: "80px" }).observe(escenario);
  }

  // Si el navegador pierde el contexto WebGL, se vuelve a la imagen fija.
  lienzo.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    escenario.classList.remove("is-live");
  });

  return visor;
}

/** Aproximación exponencial: sin rebote, independiente de los fps. */
export function acercar(actual, objetivo, rapidez, dt) {
  return objetivo + (actual - objetivo) * Math.exp(-rapidez * dt);
}

/** Muelle con amortiguación crítica (ζ = 1): llega sin pasarse. */
export function muelle(estado, objetivo, rigidez, dt, empuje = 0) {
  const amort = 2 * Math.sqrt(rigidez);
  // integración semi-implícita en subpasos para que sea estable
  const n = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const a = -rigidez * (estado.x - objetivo) - amort * estado.v + empuje;
    estado.v += a * h;
    estado.x += estado.v * h;
  }
  return estado;
}

export function enReposo(estado, objetivo, eps = 1e-4) {
  return Math.abs(estado.x - objetivo) < eps && Math.abs(estado.v) < eps * 10;
}
