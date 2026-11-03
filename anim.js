/* Norte Claro — movimiento editorial.
   GSAP es una mejora progresiva: el HTML se lee sin él.
   Sin bucles, rebotes ni desplazamiento controlado por JavaScript.
   Las preferencias de movimiento se reevalúan si cambian. */
(function () {
  "use strict";
  if (!window.gsap) return;
  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  var select = function (s, el) {
    return Array.prototype.slice.call((el || document).querySelectorAll(s));
  };
  var mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", function () {
    var hero = document.querySelector(".hero");
    if (hero) {
      var tl = gsap.timeline({ defaults: { duration: 0.65, ease: "power2.out", clearProps: "all" } });
      var title = select(".ht-line", hero);
      if (!title.length) title = select("h1", hero);
      tl.from(select(".kicker", hero), { opacity: 0, y: 8 }, 0)
        .from(title, { opacity: 0, y: 20, stagger: 0.09 }, 0.1);
      var supporting = select(".hero-destinations, .hero-intro, .hero-copy .btn-row, .hero-signature, .hero-side", hero);
      if (supporting.length) tl.from(supporting, { opacity: 0, y: 12, stagger: 0.07 }, 0.22);
      var visual = document.querySelector(".hero-visual");
      if (visual) {
        tl.from(visual, { opacity: 0, y: 15 }, 0.15);
        select(".diagram-route", visual).forEach(function (path, index) {
          var length = path.getTotalLength();
          tl.fromTo(path, { strokeDasharray: length, strokeDashoffset: length }, {
            strokeDashoffset: 0, duration: 1, clearProps: "strokeDasharray,strokeDashoffset"
          }, 0.35 + index * 0.15);
        });
        tl.from(select(".diagram-destination", visual), { opacity: 0, duration: 0.4, stagger: 0.12 }, 0.55);
      }
    }

    if (window.ScrollTrigger) {
      select(".decision-grid > a, .dest-card, .card, .steps > li, .flow-node, .guide-callout-inner").forEach(function (el) {
        gsap.from(el, {
          y: 14, opacity: 0, duration: 0.55, ease: "power2.out", clearProps: "all",
          scrollTrigger: { trigger: el, start: "top 96%", once: true }
        });
      });
      var ladder = document.querySelector(".ladder");
      if (ladder) gsap.fromTo(ladder, { "--progress": 0 }, {
        "--progress": 1, ease: "none",
        scrollTrigger: { trigger: ladder, start: "top 75%", end: "bottom 75%", scrub: 0.4 }
      });
      var refresh = function () { ScrollTrigger.refresh(); };
      var details = select("details");
      details.forEach(function (el) { el.addEventListener("toggle", refresh); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
      return function () {
        details.forEach(function (el) { el.removeEventListener("toggle", refresh); });
      };
    }
  });
})();
