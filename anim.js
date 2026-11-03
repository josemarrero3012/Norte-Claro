/* Norte Claro — movimiento opcional de portada y entradas de páginas interiores. */
(function () {
  "use strict";
  var todos = function (s, el) {
    return Array.prototype.slice.call((el || document).querySelectorAll(s));
  };

  function animarDestinos(hero) {
    var palabras = todos(".hero-word", hero);
    var control = hero.querySelector(".hero-motion");
    var reducir = window.matchMedia("(prefers-reduced-motion: reduce)");
    var indice = 0;
    var pausa = false;
    var visible = true;
    var reloj;

    function mostrar(siguiente) {
      palabras.forEach(function (el, i) {
        el.classList.toggle("is-leaving", i === indice && i !== siguiente);
        el.classList.toggle("is-current", i === siguiente);
      });
      indice = siguiente;
    }

    function avanzar() { mostrar((indice + 1) % palabras.length); }

    function sincronizar() {
      window.clearInterval(reloj);
      var detenido = reducir.matches || pausa || !visible || document.hidden;
      hero.classList.toggle("is-paused", detenido);
      hero.classList.toggle("has-motion", !reducir.matches);
      control.hidden = reducir.matches;
      if (reducir.matches) mostrar(0);
      if (!detenido) reloj = window.setInterval(avanzar, 3600);
    }

    function alternar() {
      pausa = !pausa;
      control.title = pausa ? "Reanudar animación" : "Pausar animación";
      control.setAttribute("aria-label", control.title);
      sincronizar();
    }

    if ("IntersectionObserver" in window) {
      var observador = new IntersectionObserver(function (entradas) {
        visible = entradas[0].isIntersecting;
        sincronizar();
      });
      observador.observe(hero);
    }
    control.addEventListener("click", alternar);
    document.addEventListener("visibilitychange", sincronizar);
    reducir.addEventListener("change", sincronizar);
    sincronizar();
  }

  var portada = document.querySelector(".home-hero");
  if (portada) {
    animarDestinos(portada);
    return;
  }

  if (!window.gsap) return;
  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  var mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", function () {
    var hero = document.querySelector(".hero");
    if (hero) {
      var tl = gsap.timeline({ defaults: { duration: 0.75, ease: "power3.out", clearProps: "opacity,transform" } });
      tl.from(todos(".kicker", hero).slice(0, 1), { opacity: 0, y: 8, duration: 0.5 }, 0)
        .from(todos("h1", hero), { opacity: 0, y: 26, stagger: 0.09 }, 0.06);
      var apoyo = todos(".hero-side", hero);
      if (apoyo.length) tl.from(apoyo, { opacity: 0, y: 12, stagger: 0.06, duration: 0.6 }, 0.28);
    }

    if (window.ScrollTrigger) {
      var escalera = document.querySelector(".ladder");
      if (escalera) {
        gsap.fromTo(escalera, { "--progress": 0 }, {
          "--progress": 1, ease: "none",
          scrollTrigger: { trigger: escalera, start: "top 70%", end: "bottom 70%", scrub: 0.4 }
        });
      }
      var refrescar = function () { ScrollTrigger.refresh(); };
      var detalles = todos("details");
      detalles.forEach(function (el) { el.addEventListener("toggle", refrescar); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(refrescar);
      return function () {
        detalles.forEach(function (el) { el.removeEventListener("toggle", refrescar); });
      };
    }
  });
})();
