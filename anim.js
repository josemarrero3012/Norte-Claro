/* Norte Claro — movimiento opcional de portada y entradas de páginas interiores. */
(function () {
  "use strict";
  var todos = function (s, el) {
    return Array.prototype.slice.call((el || document).querySelectorAll(s));
  };

  function animarDestinos(hero) {
    var palabras = todos(".hero-word", hero);
    var control = hero.querySelector(".hero-motion");
    var escenario = hero.querySelector(".stage--brujula");
    var ruta = hero.querySelector(".hero-route path");
    var pausaManual = false;
    gsap.registerPlugin(SplitText);

    gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", function () {
      var divisiones = palabras.map(function (palabra) {
        return SplitText.create(palabra, { type: "words,chars", tag: "span", aria: "none" });
      });
      var timeline = gsap.timeline({ paused: true, repeat: -1 });
      var paso = 4.5;
      var cambio = 1.1;
      var ajuste = { progreso: 0 };
      var visible = true;

      palabras.forEach(function (palabra, i) {
        var siguiente = (i + 1) % palabras.length;
        var inicio = (i + 1) * paso - cambio;
        var color = getComputedStyle(palabras[siguiente]).color;
        // El índice busca el norte. Las letras giran por orden y encajan en su línea.
        timeline.fromTo(ajuste, { progreso: 0 }, {
          progreso: 1, duration: cambio, ease: "none", immediateRender: false,
          onUpdate: function () {
            if (escenario.calibrarRumbo) escenario.calibrarRumbo(ajuste.progreso);
          }
        }, inicio)
          .fromTo(ruta, { strokeDashoffset: 0 }, {
            strokeDashoffset: -30, duration: cambio, ease: "sine.inOut", immediateRender: false
          }, inicio)
          .to(divisiones[i].chars, {
            yPercent: -56, rotationX: 65, opacity: 0, transformOrigin: "50% 0%",
            duration: 0.28, stagger: 0.018, ease: "power2.in"
          }, inicio + 0.08)
          .set(palabras[siguiente], { opacity: 1 }, inicio + 0.25)
          .fromTo(divisiones[siguiente].chars, {
            yPercent: 70, rotationX: -72, opacity: 0, color: "#504C47"
          }, {
            yPercent: 0, rotationX: 0, opacity: 1, color: color, transformOrigin: "50% 90%",
            duration: 0.55, stagger: 0.022, ease: "power3.out", immediateRender: false
          }, inicio + 0.25)
          .set(palabra, { opacity: 0 }, inicio + 0.62);
      });

      function sincronizar() {
        timeline.paused(pausaManual || !visible || document.hidden);
      }

      function alternar() {
        pausaManual = !pausaManual;
        // La pausa manual siempre deja un destino entero y legible.
        var tiempo = timeline.time();
        if (pausaManual && tiempo % paso > paso - cambio) {
          timeline.time(Math.ceil(tiempo / paso) * paso, false);
        }
        hero.classList.toggle("is-paused", pausaManual);
        control.title = pausaManual ? "Reanudar animación" : "Pausar animación";
        control.setAttribute("aria-label", control.title);
        sincronizar();
      }

      var observador;
      if ("IntersectionObserver" in window) {
        observador = new IntersectionObserver(function (entradas) {
          visible = entradas[0].isIntersecting;
          sincronizar();
        });
        observador.observe(hero);
      }
      control.hidden = false;
      control.addEventListener("click", alternar);
      document.addEventListener("visibilitychange", sincronizar);
      sincronizar();

      return function () {
        if (observador) observador.disconnect();
        control.removeEventListener("click", alternar);
        document.removeEventListener("visibilitychange", sincronizar);
        divisiones.forEach(function (division) { division.revert(); });
        if (escenario.calibrarRumbo) escenario.calibrarRumbo(0);
        control.hidden = true;
      };
    });
  }

  if (!window.gsap) return;
  var portada = document.querySelector(".home-hero");
  if (portada) {
    if (window.SplitText) animarDestinos(portada);
    return;
  }

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
