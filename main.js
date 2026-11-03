/* =============================================================
   NORTE CLARO — main.js
   Vanilla, sin dependencias, patrón IIFE.
   El contenido está en el HTML: este archivo solo lo enriquece.
   Si el JS falla, la web se sigue leyendo entera.
   ============================================================= */
(function () {
  "use strict";

  var CFG = window.__PH__ || {};

  /* ---------- helpers ---------- */
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  function safe(fn, name) {
    try { fn(); } catch (e) { if (window.console) console.warn("[" + name + "]", e); }
  }

  /* =============================================================
     WhatsApp — construye todos los enlaces desde manifest.js
     ============================================================= */
  function initWhatsApp() {
    var num = String(CFG.whatsapp || "").replace(/\D/g, "");
    if (!num) return;
    var base = "https://wa.me/" + num;

    $$("[data-wa]").forEach(function (a) {
      var msg = a.getAttribute("data-wa-msg") || CFG.whatsappMsg || "";
      a.setAttribute("href", msg ? base + "?text=" + encodeURIComponent(msg) : base);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
    });
  }

  /* =============================================================
     Correo de contacto
     ============================================================= */
  function initEmail() {
    var mail = CFG.email;
    if (!mail) return;
    $$("[data-email]").forEach(function (el) {
      if (el.tagName === "A") el.setAttribute("href", "mailto:" + mail);
      if (el.hasAttribute("data-email-text")) el.textContent = mail;
    });
  }

  /* =============================================================
     Año en curso en el pie
     ============================================================= */
  function initYear() {
    var y = String(new Date().getFullYear());
    $$("[data-year]").forEach(function (el) { el.textContent = y; });
  }

  /* =============================================================
     Navegación: sombra al hacer scroll + panel móvil
     ============================================================= */
  function initNav() {
    var nav = $(".site-nav");
    var toggle = $(".nav-toggle");
    var panel = $(".nav-panel");

    if (nav) {
      var onScroll = function () {
        if (window.scrollY > 8) nav.classList.add("is-stuck");
        else nav.classList.remove("is-stuck");
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    if (toggle && panel) {
      panel.inert = !panel.classList.contains("is-open");
      function closePanel(restoreFocus) {
        panel.classList.remove("is-open");
        panel.inert = true;
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Abrir menú");
        if (restoreFocus) toggle.focus();
      }
      toggle.addEventListener("click", function () {
        var open = panel.classList.toggle("is-open");
        panel.inert = !open;
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
      });

      // Cerrar al pulsar un enlace del panel
      panel.addEventListener("click", function (e) {
        if (e.target.closest("a")) {
          closePanel(false);
        }
      });

      // Cerrar con Escape
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && panel.classList.contains("is-open")) {
          closePanel(true);
        }
      });
    }
  }

  /* =============================================================
     Anclas con desplazamiento suave (respetando la nav fija)
     ============================================================= */
  function initAnchors() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute("href");
      if (!id || id === "#") return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      var nav = $(".site-nav");
      var off = (nav ? nav.offsetHeight : 0) + 14;
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.pageYOffset - off,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
      });
      if (history.replaceState) history.replaceState(null, "", id);
    });
  }

  /* =============================================================
     Reveals al entrar en pantalla
     Umbral bajísimo + red de seguridad a los 6 s.
     ============================================================= */
  function initReveals() {
    var items = $$(".reveal");
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-visible");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -3% 0px" });

    items.forEach(function (el) { io.observe(el); });

    // Red de seguridad: a los 6 s revela cualquier cosa ya visible
    setTimeout(function () {
      $$(".reveal:not(.is-visible)").forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight * 1.2) {
          el.classList.add("is-visible");
        }
      });
    }, 6000);
  }

  /* =============================================================
     Huecos de foto
     Mientras el archivo no exista en assets/img/, se ve el
     degradado con la etiqueta. En cuanto Iván sube la foto con
     ese nombre, la imagen aparece y la etiqueta desaparece sola.
     ============================================================= */
  function initPhotos() {
    $$(".ph").forEach(function (box) {
      var img = box.querySelector("img");
      if (!img) return;

      var ok = function () { box.classList.add("is-loaded"); };
      var fail = function () { box.classList.remove("is-loaded"); };

      if (img.complete) {
        if (img.naturalWidth > 0) ok();
        else fail();
      }
      img.addEventListener("load", ok);
      img.addEventListener("error", fail);
    });
  }

  /* =============================================================
     Barra de progreso de lectura (solo si existe en la página)
     ============================================================= */
  function initReadbar() {
    var bar = $("[data-readbar] i");
    if (!bar) return;
    var tick = function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? (window.pageYOffset / h) * 100 : 0;
      bar.style.width = Math.min(100, Math.max(0, p)) + "%";
    };
    tick();
    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick, { passive: true });
  }

  /* =============================================================
     Formulario -> Netlify Forms
     Netlify recoge el envío, lo guarda en el panel (Forms) y te
     manda un aviso por correo. Envío por fetch para no salir de
     la página. Sin JavaScript, el formulario se envía normal y
     Netlify lleva a gracias.html.
     ============================================================= */
  function initForm() {
    var form = $("[data-form]");
    if (!form) return;

    var status = $("[data-form-status]", form);
    var submit = form.querySelector('button[type="submit"]');

    function say(kind, text) {
      if (!status) return;
      status.className = "form-status is-on " + (kind === "ok" ? "is-ok" : "is-err");
      status.textContent = text;
      status.setAttribute("role", "status");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Abriendo el archivo con doble clic (file://) no hay servidor.
      if (location.protocol === "file:") {
        say("err", "Estás viendo la web desde un archivo local. El formulario solo funciona con la web subida a Netlify.");
        return;
      }

      // Trampa antispam: si está rellena, no es una persona.
      var hp = form.querySelector('input[name="bot-field"]');
      if (hp && hp.value) return;

      if (!form.reportValidity()) return;

      // Netlify guarda un valor por campo: juntamos los idiomas
      // (y los destinos) marcados en uno solo ("Español, Inglés básico").
      var fd = new FormData(form);
      var idiomas = fd.getAll("idiomas");
      fd.delete("idiomas");
      fd.append("idiomas", idiomas.length ? idiomas.join(", ") : "(ninguno marcado)");
      var destinos = fd.getAll("destino");
      fd.delete("destino");
      fd.append("destino", destinos.length ? destinos.join(", ") : "(ninguno marcado)");
      if (!fd.get("form-name")) fd.append("form-name", form.getAttribute("name") || "candidatura");

      var original = submit ? submit.textContent : "";
      if (submit) { submit.disabled = true; submit.textContent = "Enviando…"; }

      function fallo(texto) {
        say("err", texto);
        if (submit) { submit.disabled = false; submit.textContent = original; }
      }

      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(fd).toString()
      })
        .then(function (r) {
          if (r.ok) {
            form.reset();
            say("ok", "Recibido. Te escribo por WhatsApp en menos de 24 h laborables.");
            if (submit) submit.textContent = "Enviado";
            return;
          }
          if (window.console) console.warn("[formulario] respuesta", r.status);
          if (r.status === 404) {
            fallo("El formulario todavía no está activado en Netlify. Mientras tanto, escríbeme por WhatsApp.");
          } else {
            fallo("No se ha podido enviar (código " + r.status + "). Escríbeme por WhatsApp.");
          }
        })
        .catch(function (err) {
          if (window.console) console.warn("[formulario]", err);
          fallo("No se ha podido conectar con el servidor. Revisa la conexión o escríbeme por WhatsApp.");
        });
    });
  }

  /* =============================================================
     Piezas 3D (brújula y maqueta, modeladas en Blender)
     Solo se cargan si hay WebGL, si no se ha pedido ahorrar datos y
     cuando la escena se acerca a la pantalla. Hasta entonces, y si
     algo falla, se ve la imagen fija del mismo modelo.
     ============================================================= */
  function hayWebGL() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) { return false; }
  }

  function init3D() {
    var escenas = $$("[data-3d]");
    if (!escenas.length) return;
    var conn = navigator.connection || {};
    if (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || "")) return;
    if (!hayWebGL()) return;

    var V3D = "3"; // súbelo al reconstruir lib/3d/norte3d.js
    var modulo = null;
    function cargar() {
      if (!modulo) modulo = import("./lib/3d/norte3d.js?v=" + V3D);
      return modulo;
    }
    function montar(el) {
      if (el.getAttribute("data-montado")) return;
      el.setAttribute("data-montado", "1");
      cargar().then(function (m) { return m.montar(el); }).catch(function (err) {
        if (window.console) console.warn("[3d]", err);
      });
    }

    if (!("IntersectionObserver" in window)) { escenas.forEach(montar); return; }
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) { montar(en.target); io.unobserve(en.target); }
      });
    }, { rootMargin: "400px 0px" });

    // La brújula del hero espera a que la página esté pintada: el texto
    // es lo primero que se lee.
    var empezar = function () { escenas.forEach(function (el) { io.observe(el); }); };
    if (document.readyState === "complete") setTimeout(empezar, 60);
    else window.addEventListener("load", function () { setTimeout(empezar, 60); });
  }

  /* =============================================================
     Arranque
     ============================================================= */
  function boot() {
    document.documentElement.classList.remove("no-js");

    safe(initWhatsApp, "initWhatsApp");
    safe(initEmail, "initEmail");
    safe(initYear, "initYear");
    safe(initNav, "initNav");
    safe(initAnchors, "initAnchors");
    safe(initPhotos, "initPhotos");
    safe(initReveals, "initReveals");
    safe(initReadbar, "initReadbar");
    safe(initForm, "initForm");
    safe(init3D, "init3D");

    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
