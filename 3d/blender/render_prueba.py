"""
Render de comprobación (Cycles, CPU) de cualquier .blend de esta carpeta.

    python 3d/blender/render_prueba.py brujula.blend salida.png [ancho alto muestras]

Coloca una cámara de producto, una luz de estudio suave y un plano
blanco que recoge la sombra. No modifica el .blend.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

AQUI = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
fuente = os.path.join(AQUI, args[0])
salida = os.path.abspath(args[1])
ancho = int(args[2]) if len(args) > 2 else 900
alto = int(args[3]) if len(args) > 3 else 900
muestras = int(args[4]) if len(args) > 4 else 48
rumbo = float(os.environ.get("RUMBO", "28"))

bpy.ops.wm.open_mainfile(filepath=fuente)
esc = bpy.context.scene

aguja = bpy.data.objects.get("aguja")
if aguja:
    aguja.rotation_euler[2] = -math.radians(rumbo)

esc.render.engine = "CYCLES"
esc.cycles.device = "CPU"
esc.cycles.samples = muestras
esc.cycles.use_denoising = True
esc.render.resolution_x = ancho
esc.render.resolution_y = alto
esc.render.film_transparent = False
esc.view_settings.view_transform = "AgX"
esc.view_settings.look = "AgX - Base Contrast"

# Mundo: blanco suave
mundo = bpy.data.worlds.new("estudio")
mundo.use_nodes = True
mundo.node_tree.nodes["Background"].inputs[0].default_value = (1, 1, 1, 1)
mundo.node_tree.nodes["Background"].inputs[1].default_value = 0.55
esc.world = mundo

# Suelo que recoge la sombra
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
suelo = bpy.context.active_object
ms = bpy.data.materials.new("suelo")
ms.use_nodes = True
ms.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.92, 0.92, 0.9, 1)
ms.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.9
suelo.data.materials.append(ms)

# Luz principal de área (arriba a la izquierda, delante)
bpy.ops.object.light_add(type="AREA", location=(-2.6, -1.6, 4.2))
luz = bpy.context.active_object
luz.data.energy = 520
luz.data.size = 3.0
luz.rotation_euler = (math.radians(32), math.radians(-30), 0)
# Relleno
bpy.ops.object.light_add(type="AREA", location=(3.5, 2.5, 3.0))
rel = bpy.context.active_object
rel.data.energy = 140
rel.data.size = 4.0
rel.rotation_euler = (math.radians(-40), math.radians(40), 0)

# Cámara
cam_dist = float(os.environ.get("DIST", "4.4"))
elev = math.radians(float(os.environ.get("ELEV", "52")))
bpy.ops.object.camera_add(location=(0, -cam_dist * math.cos(elev), cam_dist * math.sin(elev)))
cam = bpy.context.active_object
cam.data.lens = float(os.environ.get("LENS", "60"))
objetivo = Vector((0, 0.05, 0.05))
direc = objetivo - cam.location
cam.rotation_euler = direc.to_track_quat("-Z", "Y").to_euler()
esc.camera = cam

esc.render.filepath = salida
bpy.ops.render.render(write_still=True)
print("render ->", salida)
