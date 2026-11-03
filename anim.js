/* Norte Claro — movimiento.
   Un solo momento al cargar: el titular entra y, en portada, la
   brújula aparece y hace su única demostración (eso lo lleva el 3D).
   En Metas, la ruta vertical se rellena al leer. Nada más se mueve
   solo: sin bucles, sin rebotes, sin fundidos en cada tarjeta.
   GSAP es una mejora: sin él la página se lee entera. */
(function () {
  "use strict";
  if (!window.gsap) return;
  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  var todos = function (s, el) {
    return Array.prototype.slice.call((el || document).querySelectorAll(s));
  };

  var mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", function () {
    var hero = document.querySelector(".hero");
    if (hero) {
      var tl = gsap.timeline({ defaults: { duration: 0.75, ease: "power3.out", clearProps: "opacity,transform" } });
      var lineas = todos(".ht-line", hero);
      if (!lineas.length) lineas = todos("h1", hero);
      tl.from(todos(".kicker", hero).slice(0, 1), { opacity: 0, y: 8, duration: 0.5 }, 0)
        .from(lineas, { opacity: 0, y: 26, stagger: 0.09 }, 0.06);
      var apoyo = todos(".hero-destinations, .hero-intro, .hero-copy .btn-row, .hero-signature, .hero-side", hero);
      if (apoyo.length) tl.from(apoyo, { opacity: 0, y: 12, stagger: 0.06, duration: 0.6 }, 0.28);
      var escena = hero.querySelector(".hero-stage");
      if (escena) tl.from(escena, { opacity: 0, y: 16, duration: 0.9 }, 0.18);
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
