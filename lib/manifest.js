/* =============================================================
   NORTE CLARO — manifest.js
   -------------------------------------------------------------
   ESTE ES EL ÚNICO ARCHIVO QUE TIENES QUE TOCAR PARA CONFIGURAR
   LA WEB. Cambia los cuatro valores de abajo y todo el sitio se
   actualiza solo (los cuatro HTML leen de aquí).

   1) whatsapp     -> tu número, en formato internacional, SOLO
                      dígitos: sin +, sin espacios, sin guiones.
                      Países Bajos = 31 + el número sin el 0.
                      España = 34 + tu número.
                      Ya está puesto el tuyo: +31 647 834 341.
   2) whatsappMsg  -> el mensaje que aparece ya escrito cuando
                      alguien abre el chat.
   3) endpoint     -> en la versión Netlify no se usa: el
                      formulario lo recoge Netlify. El correo que
                      recibe los avisos se elige en el panel de
                      Netlify (Forms > Form notifications).
   4) email        -> el correo de contacto que se muestra en la
                      web y en la política de privacidad.

   Si dejas el número de WhatsApp de ejemplo puesto, la web sigue
   funcionando, pero ese botón no lleva a ningún sitio real.
   ============================================================= */
(function () {
  "use strict";

  window.__PH__ = {

    /* ---- 1. WhatsApp ------------------------------------- */
    whatsapp: "31647834341",

    whatsappMsg: "Hola Iván. He visto Norte Claro y me interesa trabajar en el norte de Europa.",

    /* ---- 2. Procesador del formulario -------------------- */
    endpoint: "/",

    /* ---- 3. Contacto ------------------------------------- */
    email: "ivan@proyectoholanda.com",

    /* ---- 4. Datos de marca (no hace falta tocarlos) ------- */
    site: "https://proyectoholanda.com",
    nombre: "Norte Claro"
  };
})();
