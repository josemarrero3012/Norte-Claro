/* Rumbo Norte — la maqueta de destinos.
   Tres rutas que se dibujan una sola vez al llegar a la sección. Al
   elegir un país (en su ficha o en la maqueta) su placa se eleva y su
   ruta queda delante. Nada se mueve solo una vez dibujado. */
import {
  DirectionalLight, HemisphereLight, Mesh, MeshBasicMaterial, CylinderGeometry,
  CubicBezierCurve3, TubeGeometry, Vector3, Vector2, Color, MathUtils, Raycaster,
} from "three";
import { crearVisor, cargarModelo, acercar, MOV_REDUCIDO } from "./comun.js";

const NARANJA = new Color("#FF8126");
const MARINO = new Color("#15233F");
const TINTE = new Color("#CCDFFF");   // la placa elegida
const BLANCO = new Color("#FFFFFF");
const DESTINOS = ["NLD", "BEL", "DEU"];

export async function montarMapa(escenario, { modelo, poster = false } = {}) {
  const visor = crearVisor(escenario, { fov: 24, sombras: false });
  const { escena, camara } = visor;
  escena.environmentIntensity = 0.42;

  // Luz rasante del noroeste, como en el sombreado de los mapas
  const sol = new DirectionalLight(0xffffff, 1.75);
  sol.position.set(-3.6, 3.0, -2.2);  // más rasante: las paredes de cada país marcan el relieve
  escena.add(sol);
  escena.add(new HemisphereLight(0xffffff, 0xdfe8f8, 0.62));

  const gltf = await cargarModelo(modelo);
  escena.add(gltf.scene);
  const placas = {};
  const anclas = {};
  gltf.scene.traverse((o) => {
    if (o.isMesh && o.material) o.material.flatShading = true;
  });
  for (const cod of ["ESP", ...DESTINOS]) {
    const nodo = gltf.scene.getObjectByName("pais_" + cod);
    if (nodo) {
      nodo.traverse((m) => { if (m.isMesh) m.material = m.material.clone(); });
      placas[cod] = nodo;
    }
    const a = gltf.scene.getObjectByName("ancla_" + cod);
    if (a) {
      a.updateWorldMatrix(true, false);
      anclas[cod] = a.getWorldPosition(new Vector3());
    }
  }
  // ---------------- rutas y chinchetas ----------------
  const RADIAL = 8, TRAMOS = 96;
  const rutas = {};
  const origen = anclas.ESP.clone();
  const chOrigen = new Mesh(
    new CylinderGeometry(0.042, 0.042, 0.016, 32),
    new MeshBasicMaterial({ color: MARINO, toneMapped: false })
  );
  chOrigen.position.copy(origen).add(new Vector3(0, 0.008, 0));
  escena.add(chOrigen);

  // Un rumbo, tres destinos: las tres rutas salen juntas con el rumbo de
  // la marca (28° al noreste) y se separan al acercarse a cada país.
  const R = MathUtils.degToRad(28);
  const rumbo = new Vector3(Math.sin(R), 0, -Math.cos(R));
  const alto = new Vector3(0, 0.012, 0);
  const comun = origen.clone().addScaledVector(rumbo, 0.95).add(new Vector3(0, 0.62, 0));
  for (const cod of DESTINOS) {
    const fin = anclas[cod].clone();
    const llegada = fin.clone().lerp(origen, 0.12).add(new Vector3(0, 0.42, 0));
    const curva = new CubicBezierCurve3(origen.clone().add(alto), comun, llegada, fin.clone().add(alto));
    const geo = new TubeGeometry(curva, TRAMOS, 0.0115, RADIAL, false);
    const mat = new MeshBasicMaterial({ color: NARANJA, toneMapped: false, transparent: true, opacity: 1 });
    const tubo = new Mesh(geo, mat);
    tubo.renderOrder = 3;
    escena.add(tubo);

    const ch = new Mesh(
      new CylinderGeometry(0.038, 0.038, 0.014, 32),
      new MeshBasicMaterial({ color: NARANJA, toneMapped: false })
    );
    ch.position.copy(fin).add(new Vector3(0, 0.007, 0));
    escena.add(ch);

    rutas[cod] = { tubo, geo, mat, ch, total: geo.index.count, trazo: 0, objetivoTrazo: 0, enfasis: 1 };
  }

  function trazar(r, p) {
    const porTramo = RADIAL * 6;
    const n = Math.round(MathUtils.clamp(p, 0, 1) * TRAMOS) * porTramo;
    r.geo.setDrawRange(0, n);
    r.ch.scale.setScalar(MathUtils.clamp((p - 0.92) / 0.08, 0, 1) || 0.0001);
  }

  // ---------------- encuadre ----------------
  const objetivo = new Vector3(0.05, -0.05, 0.02);
  const elev = MathUtils.degToRad(58);
  const orbita = { x: 0, y: 0, ox: 0, oy: 0 };
  function colocarCamara() {
    const mitadV = Math.tan(MathUtils.degToRad(camara.fov / 2));
    const asp = visor.ancho / visor.alto;
    const d = Math.max(2.05 / mitadV, 2.38 / (mitadV * asp)) * 1.08;
    const az = orbita.x, el = elev + orbita.y;
    camara.position.set(Math.sin(az) * Math.cos(el) * d, Math.sin(el) * d, Math.cos(az) * Math.cos(el) * d).add(objetivo);
    camara.lookAt(objetivo);
  }
  visor.alRedimensionar = colocarCamara;
  colocarCamara();

  // ---------------- etiquetas (HTML, nítidas y accesibles) ----------------
  const etiquetas = {};
  escenario.querySelectorAll("[data-etiqueta]").forEach((el) => { etiquetas[el.dataset.etiqueta] = el; });
  const tmp = new Vector3();
  visor.antesDeDibujar = () => {
    for (const cod in etiquetas) {
      const base = anclas[cod];
      if (!base) continue;
      tmp.copy(base);
      if (placas[cod]) tmp.y = base.y * placas[cod].scale.y;
      tmp.project(camara);
      const x = (tmp.x * 0.5 + 0.5) * 100;
      const y = (-tmp.y * 0.5 + 0.5) * 100;
      etiquetas[cod].style.setProperty("--x", x.toFixed(2) + "%");
      etiquetas[cod].style.setProperty("--y", y.toFixed(2) + "%");
    }
  };

  // ---------------- estado ----------------
  const reducido = MOV_REDUCIDO();
  let activo = null;
  const alzado = {};
  for (const cod in placas) alzado[cod] = { x: 1, o: 1 };

  function aplicarActivo() {
    for (const cod of DESTINOS) {
      const r = rutas[cod];
      r.enfasis = activo === null || activo === cod ? 1 : 0.28;
      if (alzado[cod]) alzado[cod].o = activo === cod ? 2.0 : 1;
    }
    for (const cod in etiquetas) {
      etiquetas[cod].classList.toggle("is-active", activo === cod);
      etiquetas[cod].classList.toggle("is-dim", activo !== null && cod !== "ESP" && activo !== cod);
    }
    visor.despertar();
  }

  visor.paso = (dt) => {
    let sigue = false;
    const vel = reducido ? 60 : 9;
    for (const cod of DESTINOS) {
      const r = rutas[cod];
      if (r.trazo !== r.objetivoTrazo) {
        // la ruta se dibuja a ritmo constante: ~0,9 s
        r.trazo = Math.min(r.objetivoTrazo, r.trazo + dt / (reducido ? 0.001 : 0.9));
        if (r.trazo < 0) r.trazo = 0;
        trazar(r, r.trazo);
        sigue = true;
      }
      const op = acercar(r.mat.opacity, r.enfasis, vel, dt);
      if (Math.abs(op - r.enfasis) > 1e-3) sigue = true;
      r.mat.opacity = op;
    }
    for (const cod in alzado) {
      const a = alzado[cod];
      const nx = acercar(a.x, a.o, reducido ? 60 : 8, dt);
      if (Math.abs(nx - a.o) > 1e-3) sigue = true;
      a.x = Math.abs(nx - a.o) > 1e-3 ? nx : a.o;
      placas[cod].scale.y = a.x;
      const t = (a.x - 1) / 1.0;
      placas[cod].traverse((m) => { if (m.isMesh) m.material.color.copy(BLANCO).lerp(TINTE, MathUtils.clamp(t, 0, 1)); });
    }
    const ox = acercar(orbita.x, orbita.ox, 4, dt);
    const oy = acercar(orbita.y, orbita.oy, 4, dt);
    if (Math.abs(ox - orbita.ox) > 1e-4 || Math.abs(oy - orbita.oy) > 1e-4) sigue = true;
    orbita.x = ox; orbita.y = oy;
    colocarCamara();
    return sigue;
  };

  // Rutas: en la imagen fija ya están dibujadas; en vivo, se dibujan al llegar.
  for (const cod of DESTINOS) trazar(rutas[cod], poster ? 1 : 0);
  if (poster) {
    for (const cod of DESTINOS) rutas[cod].trazo = rutas[cod].objetivoTrazo = 1;
    visor.despertar();
    return { visor };
  }

  // ---------------- interacción ----------------
  const ray = new Raycaster();
  const puntero = new Vector2();
  const lienzo = visor.lienzo;
  const mallas = [];
  for (const cod of DESTINOS) placas[cod]?.traverse((m) => { if (m.isMesh) { m.userData.pais = cod; mallas.push(m); } });

  function paisBajo(e) {
    const r = lienzo.getBoundingClientRect();
    puntero.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(puntero, camara);
    const hit = ray.intersectObjects(mallas, false)[0];
    return hit ? hit.object.userData.pais : null;
  }

  const api = {
    visor,
    alElegir: null,       // (codigo) => void, lo conecta la página
    activar(cod) {
      if (cod === activo) return;
      activo = cod;
      aplicarActivo();
    },
    dibujarRutas() {
      DESTINOS.forEach((cod, i) => {
        setTimeout(() => { rutas[cod].objetivoTrazo = 1; visor.despertar(); }, reducido ? 0 : i * 160);
      });
    },
  };

  let hover = null;
  lienzo.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse") {
      const r = lienzo.getBoundingClientRect();
      if (!reducido) {
        orbita.ox = (((e.clientX - r.left) / r.width) * 2 - 1) * 0.045;
        orbita.oy = (((e.clientY - r.top) / r.height) * 2 - 1) * -0.03;
      }
      const p = paisBajo(e);
      lienzo.style.cursor = p ? "pointer" : "";
      if (p !== hover) {
        hover = p;
        if (p) api.activar(p);
      }
    }
    visor.despertar();
  });
  lienzo.addEventListener("pointerleave", () => {
    orbita.ox = orbita.oy = 0;
    hover = null;
    visor.despertar();
  });
  lienzo.addEventListener("click", (e) => {
    const p = paisBajo(e);
    if (p) {
      api.activar(p);
      if (api.alElegir) api.alElegir(p);
    }
  });

  return api;
}
