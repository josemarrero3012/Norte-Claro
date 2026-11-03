"""
Norte Claro — la maleta (decoración del hero)
=============================================

Una maleta rígida con la etiqueta de la marca. Es decorativa: se
renderiza una sola vez en Cycles, con fondo transparente y sin sombras,
y la web la usa como imagen (assets/3d/maleta.webp).

Uso:
    python 3d/blender/maleta.py            (módulo bpy)
    blender -b -P 3d/blender/maleta.py

Salidas:
    3d/blender/maleta.blend
    3d/blender/export/maleta.png   -> 3d/herramientas/a_webp.py la convierte
"""
import math
import os

import bpy  # primero bpy: con el módulo de Python, bmesh y mathutils vienen con él
import bmesh
from mathutils import Vector

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA_BLEND = os.path.join(AQUI, "maleta.blend")
SALIDA_PNG = os.path.join(AQUI, "export", "maleta.png")
MUESTRAS = int(os.environ.get("MUESTRAS", "96"))


def srgb(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c) + (1.0,)


def material(nombre, color, rough=0.5, metal=0.0, coat=0.0):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = srgb(color)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Coat Weight"].default_value = coat
    return m


def biselar(ob, ancho, segs=4):
    mod = ob.modifiers.new("bisel", "BEVEL")
    mod.width = ancho
    mod.segments = segs
    mod.limit_method = "ANGLE"
    for p in ob.data.polygons:
        p.use_smooth = True
    return mod


def caja(nombre, tam, loc, mat, bisel=0.0, segs=4):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.active_object
    ob.name = nombre
    ob.scale = tam
    bpy.ops.object.transform_apply(scale=True)
    ob.data.materials.append(mat)
    if bisel:
        biselar(ob, bisel, segs)
    return ob


def cilindro(nombre, r, h, loc, rot, mat, verts=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=loc, rotation=rot)
    ob = bpy.context.active_object
    ob.name = nombre
    ob.data.materials.append(mat)
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


bpy.ops.wm.read_factory_settings(use_empty=True)
esc = bpy.context.scene

M = {
    "cuerpo": material("cuerpo", "#262825", rough=0.38, coat=0.6),
    "canto": material("canto", "#3B3E39", rough=0.45),
    "goma": material("goma", "#1E201D", rough=0.75),
    "acero": material("acero", "#C9CCC6", rough=0.22, metal=1.0),
    "naranja": material("etiqueta", "#C44916", rough=0.45),
    "marfil": material("marfil", "#F9F3EB", rough=0.6),
    "carbon": material("carbon", "#252724", rough=0.5),
}

# Medidas en metros reales (maleta de cabina): 0.38 x 0.22 x 0.55
W, D, H = 0.38, 0.22, 0.55
Z0 = 0.06  # sobre las ruedas

cuerpo = caja("cuerpo", (W, D, H), (0, 0, Z0 + H / 2), M["cuerpo"], bisel=0.045, segs=6)

# Junta de la cremallera: una banda algo más clara alrededor
caja("junta", (W + 0.004, 0.018, H + 0.004), (0, 0, Z0 + H / 2), M["canto"], bisel=0.045, segs=6)

# Nervios verticales en relieve (la cara frontal mira a -Y)
for x in (-0.11, 0.0, 0.11):
    n = caja("nervio", (0.026, 0.012, H - 0.12), (x, -D / 2 - 0.003, Z0 + H / 2), M["cuerpo"], bisel=0.006, segs=3)

# Esquineras de goma
for sx in (-1, 1):
    for sz in (0, 1):
        caja("esquina", (0.06, D + 0.012, 0.05), (sx * (W / 2 - 0.022), 0, Z0 + 0.025 + sz * (H - 0.05)), M["goma"], bisel=0.018, segs=4)

# Ruedas dobles
for sx in (-1, 1):
    for sy in (-1, 1):
        cx, cy = sx * (W / 2 - 0.045), sy * (D / 2 - 0.045)
        caja("horquilla", (0.05, 0.03, 0.035), (cx, cy, Z0 - 0.012), M["goma"], bisel=0.008)
        cilindro("rueda", 0.028, 0.016, (cx - 0.012, cy, 0.03), (0, math.pi / 2, 0), M["carbon"])
        cilindro("rueda", 0.028, 0.016, (cx + 0.012, cy, 0.03), (0, math.pi / 2, 0), M["carbon"])

# Asa telescópica, medio sacada
TOP = Z0 + H
for sx in (-1, 1):
    cilindro("barra", 0.008, 0.2, (sx * 0.085, D / 2 - 0.035, TOP + 0.1), (0, 0, 0), M["acero"], verts=24)
caja("asidero", (0.21, 0.03, 0.032), (0, D / 2 - 0.035, TOP + 0.205), M["goma"], bisel=0.014, segs=5)

# Asa superior de transporte
caja("asa_base", (0.16, 0.05, 0.02), (0, -0.01, TOP + 0.006), M["goma"], bisel=0.008)
bpy.ops.mesh.primitive_torus_add(major_radius=0.06, minor_radius=0.011, major_segments=48, minor_segments=12,
                                 location=(0, -0.01, TOP + 0.012), rotation=(math.pi / 2, 0, 0))
asa = bpy.context.active_object
asa.name = "asa"
asa.data.materials.append(M["goma"])
# se queda solo el arco de arriba
bm = bmesh.new()
bm.from_mesh(asa.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y < -0.002], context="VERTS")
bm.to_mesh(asa.data)
bm.free()
for p in asa.data.polygons:
    p.use_smooth = True

# Cinta de equipaje naranja alrededor del cuerpo
caja("cinta", (W + 0.012, D + 0.012, 0.045), (0, 0, Z0 + H * 0.46), M["naranja"], bisel=0.05, segs=6)
caja("hebilla", (0.06, 0.012, 0.06), (0, -D / 2 - 0.009, Z0 + H * 0.46), M["acero"], bisel=0.008, segs=3)

# Etiqueta de equipaje colgando del asa: marfil, con la aguja de la marca
piezas = []
piezas.append(caja("etiqueta", (0.08, 0.006, 0.125), (0, 0, 0), M["marfil"], bisel=0.012, segs=4))
piezas.append(cilindro("ojal", 0.009, 0.0075, (0, 0, 0.044), (math.pi / 2, 0, 0), M["carbon"], verts=24))
for signo, mat in ((1, M["naranja"]), (-1, M["carbon"])):
    bm = bmesh.new()
    L, A, Y = 0.032, 0.0107, -0.0034
    a = math.radians(28)
    def rot(x, z):  # gira 28° en el plano de la etiqueta
        return (x * math.cos(a) + z * math.sin(a), Y, -x * math.sin(a) + z * math.cos(a) - 0.012)
    vs = [bm.verts.new(rot(*v)) for v in ((0, signo * L), (-A, 0), (A, 0))]
    bm.faces.new(vs if signo < 0 else list(reversed(vs)))
    me = bpy.data.meshes.new("aguja")
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new("aguja_etiqueta", me)
    esc.collection.objects.link(ob)
    me.materials.append(mat)
    piezas.append(ob)
bpy.ops.object.select_all(action="DESELECT")
for ob in piezas:
    ob.select_set(True)
bpy.context.view_layer.objects.active = piezas[0]
bpy.ops.object.join()
etiqueta = piezas[0]
etiqueta.location = (0.075, -D / 2 - 0.03, TOP - 0.06)
etiqueta.rotation_euler = (math.radians(6), math.radians(-12), math.radians(-14))
cilindro("cordon", 0.0028, 0.09, (0.04, -D / 2 - 0.02, TOP - 0.0), (0.25, 0.75, 0.0), M["carbon"], verts=12)

# ------------------------------------------------------------------
# Cámara y luz: las mismas que la brújula (estudio, sin suelo)
# ------------------------------------------------------------------
esc.render.engine = "CYCLES"
esc.cycles.device = "CPU"
esc.cycles.samples = MUESTRAS
esc.cycles.use_denoising = True
esc.render.film_transparent = True
esc.render.resolution_x = 900
esc.render.resolution_y = 1100
esc.view_settings.view_transform = "AgX"
esc.view_settings.look = "AgX - Base Contrast"

mundo = bpy.data.worlds.new("estudio")
mundo.use_nodes = True
mundo.node_tree.nodes["Background"].inputs[0].default_value = (1, 1, 1, 1)
mundo.node_tree.nodes["Background"].inputs[1].default_value = 0.45
esc.world = mundo

bpy.ops.object.light_add(type="AREA", location=(-1.4, -1.6, 1.9))
clave = bpy.context.active_object
clave.data.energy = 190
clave.data.size = 1.6
clave.rotation_euler = (math.radians(50), 0, math.radians(-40))
bpy.ops.object.light_add(type="AREA", location=(1.6, 0.6, 1.2))
perfil = bpy.context.active_object
perfil.data.energy = 70
perfil.data.size = 1.0
perfil.data.color = (0.93, 0.95, 1.0)
perfil.rotation_euler = (math.radians(60), 0, math.radians(110))

bpy.ops.object.camera_add(location=(0.95, -1.75, 0.95))
cam = bpy.context.active_object
cam.data.lens = 70
objetivo = Vector((0, 0, Z0 + H / 2 + 0.06))
cam.rotation_euler = (objetivo - cam.location).to_track_quat("-Z", "Y").to_euler()
esc.camera = cam

os.makedirs(os.path.dirname(SALIDA_PNG), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=SALIDA_BLEND, compress=True)
esc.render.filepath = SALIDA_PNG
bpy.ops.render.render(write_still=True)
print("render ->", SALIDA_PNG)
