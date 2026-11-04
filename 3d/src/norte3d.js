/* Rumbo Norte — punto de entrada de las piezas 3D.
   main.js carga este módulo solo si hay WebGL y la escena se acerca a
   la pantalla. Mientras tanto (o si algo falla) se ve la imagen fija. */
import { montarBrujula } from "./brujula.js";
import { montarMapa } from "./mapa.js";

const POSTER = /[?&]poster\b/.test(location.search);

function mostrar(escenario, c) {
  // El lienzo solo aparece cuando ya tiene el modelo dibujado: así la
  // imagen fija y el 3D se relevan sin que la brújula parpadee.
  if (c && c.visor) c.visor.dibujarYa();
  return new Promise((ok) => {
    requestAnimationFrame(() => {
      escenario.classList.add("is-live");
      // la transición de CSS dura ~0,5 s; la llegada empieza a mitad
      setTimeout(ok, POSTER ? 0 : 220);
    });
  });
}

async function brujula(escenario) {
  const c = await montarBrujula(escenario, { modelo: escenario.dataset.modelo, poster: POSTER });
  await mostrar(escenario, c);
  return c;
}

async function mapa(escenario) {
  const c = await montarMapa(escenario, { modelo: escenario.dataset.modelo, poster: POSTER });
  await mostrar(escenario, c);
  if (POSTER) return c;

  // Fichas de país que gobiernan la maqueta
  const sel = escenario.dataset.controles;
  const fichas = sel ? Array.from(document.querySelectorAll(sel)) : [];
  const porPais = {};
  fichas.forEach((f) => {
    const cod = f.dataset.pais;
    porPais[cod] = f;
    const on = () => { c.activar(cod); marcar(cod); };
    f.addEventListener("pointerenter", on);
    f.addEventListener("focusin", on);
    f.addEventListener("click", on);
  });
  function marcar(cod) {
    fichas.forEach((f) => f.classList.toggle("is-active", f.dataset.pais === cod));
  }
  c.alElegir = (cod) => {
    marcar(cod);
    const f = porPais[cod];
    if (!f) return;
    const r = f.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) {
      f.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    }
  };

  // En pantallas anchas la maqueta queda fija y las fichas pasan a su
  // lado: la ficha que está a media altura es la que se ilumina.
  if ("IntersectionObserver" in window && fichas.length) {
    const ancho = matchMedia("(min-width: 960px)");
    const io = new IntersectionObserver((entradas) => {
      if (!ancho.matches) return;
      for (const e of entradas) {
        if (e.isIntersecting) { c.activar(e.target.dataset.pais); marcar(e.target.dataset.pais); }
      }
    }, { rootMargin: "-45% 0px -45% 0px" });
    fichas.forEach((f) => io.observe(f));
  }

  // Las rutas se dibujan una sola vez, cuando la maqueta se ve de verdad
  const ioRutas = new IntersectionObserver((entradas, obs) => {
    if (entradas.some((e) => e.isIntersecting)) {
      c.dibujarRutas();
      obs.disconnect();
    }
  }, { threshold: 0.35 });
  ioRutas.observe(escenario);
  return c;
}

const PIEZAS = { brujula, mapa };

export function montar(escenario) {
  const tipo = escenario.dataset["3d"];
  const fn = PIEZAS[tipo];
  if (!fn) return Promise.resolve(null);
  return fn(escenario).then((c) => {
    escenario.dataset.listo = "1";
    return c;
  }).catch((err) => {
    escenario.classList.remove("is-live");
    escenario.classList.add("is-fallback");
    if (window.console) console.warn("[3d]", tipo, err);
    return null;
  });
}
