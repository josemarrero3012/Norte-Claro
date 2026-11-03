# Piezas 3D de Norte Claro

La web tiene dos objetos 3D, modelados en Blender y mostrados con Three.js:

| Pieza | Dónde | Qué hace |
|---|---|---|
| **La brújula** | Hero de la portada | Se gira arrastrando. La aguja (el logo en volumen) se queda siempre en 28°, que es el rumbo de la marca. Al soltarla, la esfera vuelve sola al norte. |
| **La maqueta** | Sección *Destinos* | Europa occidental en relieve con datos reales (Natural Earth 1:50m). Tres rutas salen juntas de España y se separan hacia Países Bajos, Bélgica y Alemania. La placa del país elegido se eleva. |

Reglas, que están también en `marca.html`:

- Todo se mueve con amortiguación crítica: llega a su sitio sin pasarse ni rebotar.
- Al cargar hay una sola demostración: la esfera gira unos 50° y vuelve, y las rutas se dibujan una vez. Después, nada se mueve si no lo mueve la persona.
- Si el usuario tiene activado el movimiento reducido, no hay demostración.
- Sin WebGL, en modo de ahorro de datos o si algo falla, se ve la imagen fija del mismo modelo.
- Sin sombras: el volumen lo dan el relieve de los modelos y la luz (principal a la izquierda, contraluz frío a la derecha).
- La escena solo se dibuja mientras algo se mueve. Si está quieta o fuera de pantalla, la GPU descansa.

## Estructura

```
3d/
├── blender/
│   ├── brujula.py        genera la brújula  → brujula.blend + export/brujula.glb
│   ├── mapa.py           genera la maqueta  → mapa.blend    + export/mapa.glb
│   ├── render_prueba.py  render de comprobación en Cycles
│   ├── brujula.blend     fuentes editables (ábrelas en Blender 5.2 o posterior)
│   ├── mapa.blend
│   └── fuentes/          Manrope ExtraBold (licencia OFL) para las letras N E S O
├── src/                  visor Three.js (se empaqueta en lib/3d/norte3d.js)
│   ├── norte3d.js        punto de entrada: monta cada [data-3d] de la página
│   ├── brujula.js        física de la esfera y la aguja, arrastre
│   ├── mapa.js           rutas, placas, etiquetas y fichas de país
│   └── comun.js          renderizador, dibujo bajo demanda, muelles
├── herramientas/
│   ├── posters.mjs       fotografía las escenas para las imágenes fijas
│   ├── a_webp.py         convierte esas capturas a assets/3d/*.webp
│   └── og.html           plantilla de assets/img/og-imagen.jpg
└── package.json
```

Lo que se publica en la web es lo que genera esta carpeta:

- `assets/3d/brujula.glb`, `assets/3d/mapa.glb`: los modelos comprimidos con meshopt, de unos 76 KB y 57 KB.
- `assets/3d/brujula.webp`, `assets/3d/mapa.webp`: las imágenes fijas.
- `lib/3d/norte3d.js`: el visor, unos 170 KB con gzip. Solo se descarga cuando hace falta.

La carpeta `3d/` no se publica; `_redirects` la bloquea.

## Cambiar un modelo

1. Edita el script (`blender/brujula.py` o `blender/mapa.py`) y vuelve a generarlo:

   ```bash
   blender -b -P 3d/blender/brujula.py
   ```

   Sin Blender instalado vale el módulo de Python: `pip install bpy==5.2.3 shapely` (requiere Python 3.13) y luego `python 3d/blender/brujula.py`.

   También puedes abrir el `.blend` en Blender, retocarlo a mano y exportar en *File → Export → glTF 2.0 (.glb)* a `3d/blender/export/`. No cambies los nombres de los objetos `brujula`, `cuerpo`, `aguja`, `pais_*`, `ancla_*` ni `peana`: el visor los busca por su nombre.

2. Comprime los modelos para la web:

   ```bash
   cd 3d && npm install && npm run modelos
   ```

3. Si cambia el aspecto, regenera las imágenes fijas (necesitas Playwright con Chromium):

   ```bash
   python3 -m http.server 8765
   node 3d/herramientas/posters.mjs http://localhost:8765
   python3 3d/herramientas/a_webp.py
   ```

   El primer comando se lanza desde la raíz del repositorio. Los otros dos, en otra terminal.

   `posters.mjs` imprime dónde caen las etiquetas del mapa. Copia esos valores en los `style="--x;--y"` de `index.html`: son los que se ven sin WebGL.

4. Sube el número de versión (`?v=`) de los modelos y las imágenes en `index.html`.

## Cambiar el visor

```bash
cd 3d && npm install && npm run build     # genera lib/3d/norte3d.js
```

Con `npm run watch` se reconstruye solo mientras editas. Si cambias el visor, sube también `V3D` en `main.js` para que los navegadores no usen la copia vieja.
