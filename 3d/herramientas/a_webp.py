"""Convierte las capturas de posters.mjs en las imágenes fijas de la web.

    python3 3d/herramientas/a_webp.py      (necesita Pillow)
"""
import os
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
EXPORT = os.path.join(AQUI, "..", "blender", "export")
DESTINO = os.path.join(AQUI, "..", "..", "assets", "3d")

for nombre, calidad in (("brujula", 80), ("mapa", 84)):
    im = Image.open(os.path.join(EXPORT, nombre + ".png")).convert("RGBA").resize((1200, 1200), Image.LANCZOS)
    ruta = os.path.join(DESTINO, nombre + ".webp")
    im.save(ruta, "WEBP", quality=calidad, method=6, alpha_quality=70)
    print(ruta, os.path.getsize(ruta), "bytes")
