"""
Norte Claro — la maqueta de destinos
====================================

Construye en Blender una maqueta en relieve de Europa occidental con
los países como placas y la exporta a .glb para la web.

Datos: Natural Earth 1:50m (dominio público), vía el paquete npm
`world-atlas` (3d/node_modules/world-atlas/countries-50m.json).

Uso:
    python 3d/blender/mapa.py            # con el módulo bpy y shapely
    blender -b -P 3d/blender/mapa.py     # (shapely instalado en el Python de Blender)

Salidas:
    3d/blender/mapa.blend
    3d/blender/export/mapa.glb   (luego `npm run modelos` -> assets/3d/mapa.glb)

Nombres que usa el visor web (no cambiarlos):
    peana                la placa base (el mar)
    europa               el resto de países, en una sola malla
    pais_ESP, pais_NLD, pais_BEL, pais_DEU
    ancla_ESP, ancla_NLD, ancla_BEL, ancla_DEU   vacíos: origen y destinos de las rutas

Proyección: acimutal equivalente de Lambert centrada en 4° E, 47° N
(la misma familia que usa la UE para sus mapas). 1 unidad = 500 km.
"""

import json
import math
import os

import bpy  # primero bpy: con el módulo de Python, bmesh y mathutils vienen con él
import bmesh
from mathutils import Vector
from mathutils.geometry import tessellate_polygon
from shapely.geometry import MultiPolygon, Polygon, box
from shapely.ops import unary_union

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
DATOS = os.path.join(AQUI, "..", "node_modules", "world-atlas", "countries-50m.json")
SALIDA_BLEND = os.path.join(AQUI, "mapa.blend")
SALIDA_GLB = os.path.join(AQUI, "export", "mapa.glb")  # sin comprimir; `npm run modelos` lo deja en assets/3d

LON0, LAT0 = math.radians(4.0), math.radians(47.0)
R_TIERRA = 6371.0  # km
KM_POR_UNIDAD = 500.0

# Encuadre de la maqueta, en km proyectados (x este, y norte)
X0, X1 = -1180.0, 1000.0
Y0, Y1 = -1230.0, 1060.0

# ISO 3166 numérico -> código propio
DESTACADOS = {"724": "ESP", "528": "NLD", "056": "BEL", "276": "DEU"}
ALTURA = {"resto": 0.05, "ESP": 0.085, "NLD": 0.095, "BEL": 0.095, "DEU": 0.095}

# Puntos de ruta (lon, lat). España: Madrid. Destinos: el centro útil
# de cada país, donde se lee bien la etiqueta.
ANCLAS = {
    "ESP": (-3.70, 40.42),
    "NLD": (5.55, 52.20),
    "BEL": (4.55, 50.62),
    "DEU": (9.80, 51.05),
}


def srgb(hex_color, alpha=1.0):
    hex_color = hex_color.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(hex_color[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, alpha)


def proyectar(lon, lat):
    """Lambert acimutal equivalente -> km."""
    l, p = math.radians(lon), math.radians(lat)
    k = math.sqrt(2.0 / (1.0 + math.sin(LAT0) * math.sin(p) + math.cos(LAT0) * math.cos(p) * math.cos(l - LON0)))
    x = R_TIERRA * k * math.cos(p) * math.sin(l - LON0)
    y = R_TIERRA * k * (math.cos(LAT0) * math.sin(p) - math.sin(LAT0) * math.cos(p) * math.cos(l - LON0))
    return x, y


def a_unidades(x, y):
    cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2
    return (x - cx) / KM_POR_UNIDAD, (y - cy) / KM_POR_UNIDAD


# ------------------------------------------------------------------
# TopoJSON -> polígonos de shapely (proyectados, en km)
# ------------------------------------------------------------------
with open(DATOS) as f:
    topo = json.load(f)

sx, sy = topo["transform"]["scale"]
tx, ty = topo["transform"]["translate"]
arcos = []
for arco in topo["arcs"]:
    x = y = 0
    pts = []
    for dx, dy in arco:
        x += dx
        y += dy
        pts.append(proyectar(x * sx + tx, y * sy + ty))
    arcos.append(pts)


def anillo(indices):
    pts = []
    for i in indices:
        seg = arcos[i] if i >= 0 else list(reversed(arcos[~i]))
        pts.extend(seg if not pts else seg[1:])
    return pts


def geometria(geo):
    polys = []
    if geo["type"] == "Polygon":
        partes = [geo["arcs"]]
    elif geo["type"] == "MultiPolygon":
        partes = geo["arcs"]
    else:
        return None
    for parte in partes:
        anillos = [anillo(a) for a in parte]
        if len(anillos[0]) < 4:
            continue
        p = Polygon(anillos[0], anillos[1:])
        if not p.is_valid:
            p = p.buffer(0)
        polys.append(p)
    return unary_union(polys) if polys else None


marco = box(X0, Y0, X1, Y1)
destacados = {}
resto = []
for g in topo["objects"]["countries"]["geometries"]:
    forma = geometria(g)
    if forma is None or not forma.intersects(marco):
        continue
    forma = forma.intersection(marco)
    # Simplifica (2 km) y separa un poco cada país: la junta deja ver la frontera.
    forma = forma.simplify(2.0, preserve_topology=True).buffer(-1.6, join_style=2)
    if forma.is_empty:
        continue
    codigo = DESTACADOS.get(str(g.get("id")))
    if codigo:
        destacados[codigo] = forma
    else:
        resto.append(forma)

resto = unary_union(resto)


def poligonos(forma, area_min=40.0):
    if isinstance(forma, Polygon):
        geoms = [forma]
    elif isinstance(forma, MultiPolygon):
        geoms = list(forma.geoms)
    else:
        geoms = [g for g in getattr(forma, "geoms", []) if isinstance(g, (Polygon, MultiPolygon))]
        out = []
        for g in geoms:
            out.extend(poligonos(g, area_min))
        return out
    return [p for p in geoms if p.area >= area_min]  # fuera islotes de menos de 40 km²


# ------------------------------------------------------------------
# Blender
# ------------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
escena = bpy.context.scene


def material(nombre, color, rough=0.8, metal=0.0):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = srgb(color)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    return m


MAT = {
    "mar": material("mar", "#CDD5CF", rough=0.92),
    "canto": material("canto_peana", "#B9C2BB", rough=0.85),
    "tierra": material("tierra", "#ECEAE2", rough=0.9),
    "espana": material("tierra_espana", "#FFFFFF", rough=0.8),
    "destino": material("tierra_destino", "#FFFFFF", rough=0.75),
}


def placa(nombre, forma, altura, mat):
    """Extruye los polígonos de 0 a `altura`: tapa superior + paredes."""
    bm = bmesh.new()
    for p in poligonos(forma):
        exterior = [a_unidades(*c) for c in list(p.exterior.coords)[:-1]]
        huecos = [[a_unidades(*c) for c in list(h.coords)[:-1]] for h in p.interiors]
        anillos = [exterior] + huecos
        plano = [[Vector((x, y, 0)) for x, y in r] for r in anillos]
        tris = tessellate_polygon(plano)
        planos = [v for r in plano for v in r]
        tapa = [bm.verts.new((v.x, v.y, altura)) for v in planos]
        for t in tris:
            try:
                f = bm.faces.new((tapa[t[0]], tapa[t[1]], tapa[t[2]]))
            except ValueError:
                continue
        # paredes
        for r in anillos:
            n = len(r)
            arriba = [bm.verts.new((x, y, altura)) for x, y in r]
            abajo = [bm.verts.new((x, y, 0.0)) for x, y in r]
            for i in range(n):
                j = (i + 1) % n
                try:
                    bm.faces.new((abajo[i], abajo[j], arriba[j], arriba[i]))
                except ValueError:
                    pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # La tapa debe mirar arriba siempre
    for f in bm.faces:
        if abs(f.normal.z) > 0.5 and f.normal.z < 0:
            f.normal_flip()
    me = bpy.data.meshes.new(nombre)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(nombre, me)
    escena.collection.objects.link(ob)
    me.materials.append(mat)
    return ob


raiz = bpy.data.objects.new("maqueta", None)
escena.collection.objects.link(raiz)

# Peana: placa de mar con esquinas redondeadas y canto biselado
ancho = (X1 - X0) / KM_POR_UNIDAD
fondo = (Y1 - Y0) / KM_POR_UNIDAD
GROSOR = 0.14
R_ESQ = 0.12
bm = bmesh.new()
contorno = []
for (cx, cy, a0) in ((ancho / 2 - R_ESQ, fondo / 2 - R_ESQ, 0), (-ancho / 2 + R_ESQ, fondo / 2 - R_ESQ, 90),
                     (-ancho / 2 + R_ESQ, -fondo / 2 + R_ESQ, 180), (ancho / 2 - R_ESQ, -fondo / 2 + R_ESQ, 270)):
    for i in range(9):
        a = math.radians(a0 + i * 90 / 8)
        contorno.append((cx + R_ESQ * math.cos(a), cy + R_ESQ * math.sin(a)))
B = 0.018  # bisel superior
arriba = [bm.verts.new((x * (1 - B / (ancho / 2)), y * (1 - B / (fondo / 2)), 0.0)) for x, y in contorno]
bisel = [bm.verts.new((x, y, -B)) for x, y in contorno]
abajo = [bm.verts.new((x, y, -GROSOR)) for x, y in contorno]
bm.faces.new(arriba)
n = len(contorno)
caras_canto = []
for i in range(n):
    j = (i + 1) % n
    bm.faces.new((arriba[i], bisel[i], bisel[j], arriba[j]))
    caras_canto.append(bm.faces.new((bisel[i], abajo[i], abajo[j], bisel[j])))
bm.faces.new(list(reversed(abajo)))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
for f in caras_canto:
    f.material_index = 1
me = bpy.data.meshes.new("peana")
bm.to_mesh(me)
bm.free()
peana = bpy.data.objects.new("peana", me)
escena.collection.objects.link(peana)
me.materials.append(MAT["mar"])
me.materials.append(MAT["canto"])
peana.parent = raiz

eu = placa("europa", resto, ALTURA["resto"], MAT["tierra"])
eu.parent = raiz
for codigo, forma in destacados.items():
    ob = placa("pais_" + codigo, forma, ALTURA[codigo], MAT["espana"] if codigo == "ESP" else MAT["destino"])
    ob.parent = raiz

for codigo, (lon, lat) in ANCLAS.items():
    x, y = a_unidades(*proyectar(lon, lat))
    e = bpy.data.objects.new("ancla_" + codigo, None)
    e.location = (x, y, ALTURA[codigo])
    e.empty_display_size = 0.06
    escena.collection.objects.link(e)
    e.parent = raiz

# Informe: rumbo real de Madrid a cada destino, en el plano de la maqueta
ox, oy = a_unidades(*proyectar(*ANCLAS["ESP"]))
for codigo in ("NLD", "BEL", "DEU"):
    x, y = a_unidades(*proyectar(*ANCLAS[codigo]))
    print(f"rumbo ESP->{codigo}: {math.degrees(math.atan2(x - ox, y - oy)):.1f}°")

os.makedirs(os.path.dirname(SALIDA_GLB), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=SALIDA_BLEND, compress=True)
bpy.ops.export_scene.gltf(
    filepath=SALIDA_GLB,
    export_format="GLB",
    export_apply=True,
    export_yup=True,
    export_normals=True,
    export_texcoords=False,
    export_materials="EXPORT",
    export_cameras=False,
    export_lights=False,
)
tot = sum(len(o.data.vertices) for o in bpy.data.objects if o.type == "MESH")
print("vértices:", tot, "| OK ->", SALIDA_GLB, os.path.getsize(SALIDA_GLB), "bytes")
