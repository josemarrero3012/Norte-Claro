/* Norte Claro — la brújula del hero.
   Se puede girar arrastrando. La aguja sigue en 28° (el rumbo de la
   marca) y la esfera vuelve sola a su sitio. Todos los movimientos son
   muelles con amortiguación crítica: llegan sin pasarse ni rebotar. */
import {
  DirectionalLight, HemisphereLight, Mesh, PlaneGeometry, ShadowMaterial,
  MeshBasicMaterial, MeshPhysicalMaterial, CanvasTexture, SRGBColorSpace,
  Vector3, MathUtils,
} from "three";
import { crearVisor, cargarModelo, muelle, acercar, MOV_REDUCIDO } from "./comun.js";

const RUMBO = MathUtils.degToRad(28);
const TAU = Math.PI * 2;

function sombraDeContacto() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(37,39,36,0.44)");
  grad.addColorStop(0.5, "rgba(37,39,36,0.26)");
  grad.addColorStop(0.78, "rgba(37,39,36,0.07)");
  grad.addColorStop(1, "rgba(37,39,36,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export async function montarBrujula(escenario, { modelo, poster = false } = {}) {
  const visor = crearVisor(escenario, { fov: 26 });
  const { escena, camara } = visor;
  escena.environmentIntensity = 0.62;

  // Luz de estudio: principal arriba a la izquierda, relleno frío del cielo
  const clave = new DirectionalLight(0xffffff, 1.55);
  clave.position.set(-2.4, 5.2, 2.2);
  clave.castShadow = true;
  clave.shadow.mapSize.set(1024, 1024);
  clave.shadow.camera.left = clave.shadow.camera.bottom = -1.8;
  clave.shadow.camera.right = clave.shadow.camera.top = 1.8;
  clave.shadow.camera.near = 1;
  clave.shadow.camera.far = 12;
  clave.shadow.bias = -0.0004;
  clave.shadow.normalBias = 0.012;
  clave.shadow.radius = 5;
  escena.add(clave);
  escena.add(new HemisphereLight(0xffffff, 0xe9e4dc, 0.42));

  // Suelo invisible que recoge la sombra + sombra de contacto suave
  const suelo = new Mesh(new PlaneGeometry(8, 8), new ShadowMaterial({ opacity: 0.16 }));
  suelo.rotation.x = -Math.PI / 2;
  suelo.receiveShadow = true;
  escena.add(suelo);
  const contacto = new Mesh(
    new PlaneGeometry(2.42, 2.42),
    new MeshBasicMaterial({ map: sombraDeContacto(), transparent: true, depthWrite: false, toneMapped: false })
  );
  contacto.rotation.x = -Math.PI / 2;
  contacto.position.y = 0.002;
  escena.add(contacto);

  const gltf = await cargarModelo(modelo);
  const raiz = gltf.scene.getObjectByName("brujula");
  const cuerpo = gltf.scene.getObjectByName("cuerpo");
  const aguja = gltf.scene.getObjectByName("aguja");
  escena.add(gltf.scene);

  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const nombre = o.material && o.material.name;
    if (nombre === "cristal") {
      o.material = new MeshPhysicalMaterial({
        color: 0xffffff, metalness: 0, roughness: 0.04,
        transmission: 1, thickness: 0.02, ior: 1.5,
        specularIntensity: 1, envMapIntensity: 1.25,
        transparent: true, opacity: 1, depthWrite: false,
      });
      o.renderOrder = 2;
      return;
    }
    o.castShadow = true;
    o.receiveShadow = true;
    if (o.material) o.material.envMapIntensity = 1;
  });

  // Encuadre: la brújula (con su anilla) cabe entera con aire alrededor
  const objetivo = new Vector3(0, 0.02, -0.06);
  const elev = MathUtils.degToRad(50);
  visor.alRedimensionar = (w, h) => {
    const mitadV = Math.tan(MathUtils.degToRad(camara.fov / 2));
    const necesitaV = 1.02;           // semialto aparente de la brújula
    const necesitaH = 1.24;           // semiancho aparente
    const d = Math.max(necesitaV / mitadV, necesitaH / (mitadV * (w / h))) * 1.04;
    camara.position.set(0, Math.sin(elev) * d, Math.cos(elev) * d).add(objetivo);
    camara.lookAt(objetivo);
  };
  visor.alRedimensionar(visor.ancho, visor.alto);

  // ---------------- estado físico ----------------
  const reducido = MOV_REDUCIDO();
  const esfera = { x: 0, v: 0 };
  const agujaE = { x: -RUMBO, v: 0 };
  let casa = 0;            // múltiplo de 2π al que vuelve la esfera
  let arrastrando = false;
  // Demostración única al aparecer: la esfera gira ~50° como si alguien
  // la moviera y vuelve sola; la aguja no pierde el rumbo.
  let demo = -1;           // <0: inactiva; si no, segundos transcurridos
  const DEMO_ANG = -0.88, DEMO_T = 1.05;
  const incl = { x: 0, z: 0, ox: 0, oz: 0 };

  function aplicar() {
    cuerpo.rotation.y = esfera.x;
    aguja.rotation.y = agujaE.x;
    raiz.rotation.x = incl.x;
    raiz.rotation.z = incl.z;
  }
  aplicar();

  visor.paso = (dt) => {
    const antes = esfera.x;
    if (demo >= 0 && !arrastrando) {
      demo += dt;
      const t = Math.min(demo / DEMO_T, 1);
      esfera.x = DEMO_ANG * (0.5 - 0.5 * Math.cos(Math.PI * t));
      esfera.v = 0;
      if (t >= 1) demo = -1;
    } else if (!arrastrando) muelle(esfera, casa, 5.5, dt);
    const wEsfera = (esfera.x - antes) / Math.max(dt, 1e-4);

    // La aguja: muelle crítico hacia el rumbo, y el giro de la esfera la
    // arrastra un poco (como el líquido de una brújula de verdad).
    const k = 26, mu = 3.2;
    const amort = 2 * Math.sqrt(k);
    const n = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = -k * (agujaE.x + RUMBO) - (amort - mu) * agujaE.v + mu * (wEsfera - agujaE.v);
      agujaE.v += a * h;
      agujaE.x += agujaE.v * h;
    }

    incl.x = acercar(incl.x, incl.ox, 5, dt);
    incl.z = acercar(incl.z, incl.oz, 5, dt);
    aplicar();

    const quieta = !arrastrando && demo < 0 &&
      Math.abs(esfera.x - casa) < 2e-4 && Math.abs(esfera.v) < 2e-3 &&
      Math.abs(agujaE.x + RUMBO) < 2e-4 && Math.abs(agujaE.v) < 2e-3 &&
      Math.abs(incl.x - incl.ox) < 1e-4 && Math.abs(incl.z - incl.oz) < 1e-4;
    if (quieta) {
      // Normaliza para que el ángulo no crezca sin fin tras muchas vueltas
      const vueltas = Math.round(casa / TAU) * TAU;
      esfera.x -= vueltas; casa -= vueltas; esfera.v = 0;
      aplicar();
    }
    return !quieta;
  };

  if (poster) {
    visor.despertar();
    return { visor, listo: true };
  }

  // ---------------- interacción ----------------
  let ultimoX = 0, ultimoT = 0, velArr = 0;
  const lienzo = visor.lienzo;
  lienzo.style.touchAction = "pan-y";

  lienzo.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    demo = -1;
    arrastrando = true;
    ultimoX = e.clientX; ultimoT = performance.now(); velArr = 0;
    esfera.v = 0;
    lienzo.setPointerCapture(e.pointerId);
    escenario.classList.add("is-grabbing");
    visor.despertar();
  });
  lienzo.addEventListener("pointermove", (e) => {
    const r = escenario.getBoundingClientRect();
    if (e.pointerType === "mouse" && !reducido) {
      const px = ((e.clientX - r.left) / r.width) * 2 - 1;
      const py = ((e.clientY - r.top) / r.height) * 2 - 1;
      incl.ox = MathUtils.clamp(py, -1, 1) * 0.11;
      incl.oz = -MathUtils.clamp(px, -1, 1) * 0.11;
    }
    if (arrastrando) {
      const ahora = performance.now();
      const dx = e.clientX - ultimoX;
      const da = (dx / r.width) * Math.PI * 1.6;
      esfera.x += da;
      const dtm = Math.max(1, ahora - ultimoT) / 1000;
      velArr = velArr * 0.6 + (da / dtm) * 0.4;
      ultimoX = e.clientX; ultimoT = ahora;
    }
    visor.despertar();
  });
  function soltar(e) {
    if (!arrastrando) return;
    arrastrando = false;
    escenario.classList.remove("is-grabbing");
    esfera.v = MathUtils.clamp(velArr, -14, 14);
    // Vuelve al norte más cercano a donde se pararía por sí sola
    const parada = esfera.x + esfera.v * 0.36;
    casa = Math.round(parada / TAU) * TAU;
    if (e && lienzo.hasPointerCapture?.(e.pointerId)) lienzo.releasePointerCapture(e.pointerId);
    escenario.classList.add("has-turned");
    visor.despertar();
  }
  lienzo.addEventListener("pointerup", soltar);
  lienzo.addEventListener("pointercancel", soltar);
  lienzo.addEventListener("pointerleave", () => {
    incl.ox = incl.oz = 0;
    visor.despertar();
  });

  return {
    visor,
    /** La página lo llama al mostrar el lienzo: una sola demostración. */
    arrancar() {
      if (reducido) return;
      setTimeout(() => {
        if (arrastrando || escenario.classList.contains("has-turned")) return;
        demo = 0;
        visor.despertar();
      }, 700);
    },
  };
}
