# Rumbo Norte

Web de reclutamiento independiente de Iván Guerra Arroyo para trabajar en Países Bajos, Bélgica y Alemania. Sitio estático en HTML, CSS y JavaScript, con dos escenas 3D opcionales.

## Vista local

Desde esta carpeta:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Abre <http://127.0.0.1:8765>. Las páginas funcionan sin compilación. La recepción del formulario depende del alojamiento en Netlify y no se prueba enviando datos desde este servidor local.

## Marca

- `assets/rumbo-norte-original.png`: logotipo original proporcionado, sin cambios.
- `assets/logo.svg`: composición horizontal del original para cabecera y pie. Se regenera con `node scripts/brand-assets.mjs`.
- `assets/favicon.svg`: adaptación vectorial del símbolo para tamaños pequeños.
- `styles.css`: colores, tipografía y componentes compartidos.
- `marca.html`: manual de Rumbo Norte y ejemplos de uso.
- `3d/herramientas/og.html`: plantilla de la imagen para compartir enlaces.

Los datos de contacto, WhatsApp y la URL del sitio se configuran en `lib/manifest.js`. El dominio actual es `proyectoholanda.com`.

Las fuentes, materiales y el proceso de compilación de los objetos 3D se documentan en [3d/README.md](3d/README.md).
