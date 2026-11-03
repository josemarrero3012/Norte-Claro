"""
Norte Claro — la brújula (pieza 3D del hero)
=============================================

Genera la brújula desde cero, la guarda como .blend y la exporta a
glTF binario (.glb) para la web.

Uso (cualquiera de las dos):
    blender -b -P 3d/blender/brujula.py
    python 3d/blender/brujula.py          # con el módulo bpy instalado

Salidas:
    3d/blender/brujula.blend      fuente editable en Blender
    3d/blender/export/brujula.glb modelo sin comprimir
    (luego `npm run modelos` lo comprime en assets/3d/brujula.glb)

Jerarquía (los nombres los usa el visor web, no cambiarlos):
    brujula            raíz; el visor la inclina con el ratón
    ├── cuerpo         carcasa, esfera, marcas, letras y cristal; gira al arrastrar
    └── aguja          eje de la aguja; el visor la mantiene a 28°

Unidades: 1 = radio exterior de la carcasa. El norte es +Y en Blender
(−Z en glTF/three.js). La aguja se exporta apuntando al norte (0°): el
rumbo de marca (28° al noreste) lo aplica el visor.
"""

import math
import os

import bpy  # primero bpy: con el módulo de Python, bmesh y mathutils vienen con él
import bmesh
from mathutils import Matrix, Vector

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
FUENTE = os.path.join(AQUI, "fuentes", "Manrope-ExtraBold.ttf")
SALIDA_BLEND = os.path.join(AQUI, "brujula.blend")
SALIDA_GLB = os.path.join(AQUI, "export", "brujula.glb")  # sin comprimir; `npm run modelos` lo deja en assets/3d

RUMBO = 28.0  # grados, el de la marca


# ------------------------------------------------------------------
# Utilidades
# ------------------------------------------------------------------
def srgb(hex_color, alpha=1.0):
    """#RRGGBB en sRGB -> color lineal (lo que esperan Blender y glTF)."""
    hex_color = hex_color.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(hex_color[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, alpha)


def limpiar_escena():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(nombre, color, rough=0.5, metal=0.0, clearcoat=0.0, cc_rough=0.1, alpha=1.0):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = srgb(color)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Coat Weight"].default_value = clearcoat
    bsdf.inputs["Coat Roughness"].default_value = cc_rough
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
    return m


def objeto_desde_bmesh(nombre, bm, mat=None, padre=None, suave=None):
    me = bpy.data.meshes.new(nombre)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(nombre, me)
    bpy.context.scene.collection.objects.link(ob)
    if mat:
        me.materials.append(mat)
    if padre:
        ob.parent = padre
    if suave is not None:
        # Suavizado por ángulo: aristas vivas donde el perfil quiebra.
        for p in me.polygons:
            p.use_smooth = True
        me.set_sharp_from_angle(angle=math.radians(suave))
    return ob


def vacio(nombre, padre=None, loc=(0, 0, 0)):
    ob = bpy.data.objects.new(nombre, None)
    ob.empty_display_size = 0.2
    ob.location = loc
    bpy.context.scene.collection.objects.link(ob)
    if padre:
        ob.parent = padre
    return ob


def torno(perfil, pasos=256, relieve=None):
    """Revoluciona un perfil (r, z) alrededor de Z. Devuelve un bmesh.
    relieve(r, z, ang) -> dr permite estriar la pared."""
    bm = bmesh.new()
    anillos = []
    for i in range(pasos):
        a = 2 * math.pi * i / pasos
        fila = []
        for (r, z) in perfil:
            rr = r + (relieve(r, z, a) if relieve else 0.0)
            fila.append(bm.verts.new((rr * math.sin(a), rr * math.cos(a), z)))
        anillos.append(fila)
    for i in range(pasos):
        a, b = anillos[i], anillos[(i + 1) % pasos]
        for j in range(len(perfil) - 1):
            bm.faces.new((a[j], b[j], b[j + 1], a[j + 1]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def caja(bm, centro, tam, rot_z=0.0):
    """Añade un prisma rectangular (marcas impresas de la esfera)."""
    m = Matrix.Translation(Vector(centro)) @ Matrix.Rotation(rot_z, 4, "Z") @ Matrix.Diagonal((*tam, 1.0))
    bmesh.ops.create_cube(bm, size=1.0, matrix=m)


# ------------------------------------------------------------------
# Escena
# ------------------------------------------------------------------
limpiar_escena()
escena = bpy.context.scene

M = {
    "carbon": material("carbon_anodizado", "#30332F", rough=0.3, metal=0.62),
    "carbon_mate": material("carbon_mate", "#2B2D2A", rough=0.62, metal=0.0),
    "marfil": material("marfil_esfera", "#F9F3EB", rough=0.78),
    "tinta": material("tinta", "#252724", rough=0.55),
    "naranja": material("naranja_esmalte", "#C44916", rough=0.3, clearcoat=0.7, cc_rough=0.08),
    "naranja_tinta": material("naranja_tinta", "#C44916", rough=0.5),
    "sur": material("aguja_sur", "#2E302D", rough=0.32, clearcoat=0.5, cc_rough=0.1),
    "blanco": material("eje_blanco", "#FFFFFF", rough=0.22, clearcoat=0.4),
    "acero": material("acero", "#C9CCC6", rough=0.22, metal=1.0),
    "cristal": material("cristal", "#FFFFFF", rough=0.03, alpha=0.1),
}

raiz = vacio("brujula")
cuerpo = vacio("cuerpo", raiz)
eje_aguja = vacio("aguja", raiz)

# --- Carcasa: perfil girado, con el bisel superior estriado ---------
Z_ESFERA = 0.045
perfil = [
    (0.0005, 0.0),
    (0.94, 0.0),
    (0.975, 0.006),
    (0.993, 0.022),
    (1.0, 0.045),
    (1.0, 0.15),
    (0.996, 0.178),
    (0.984, 0.198),
    (0.962, 0.211),
    (0.93, 0.215),
    (0.91, 0.209),
    (0.898, 0.194),
    (0.893, 0.17),
    (0.89, 0.09),
    (0.884, 0.075),
    (0.884, Z_ESFERA - 0.004),
    (0.0005, Z_ESFERA - 0.004),
]


def estrias(r, z, a):
    # 96 estrías en la pared exterior, como el aro de una brújula de
    # mano; se desvanecen hacia arriba y hacia abajo.
    if r < 0.995 or not (0.05 < z < 0.155):
        return 0.0
    t = 1.0 - abs((z - 0.1) / 0.055)
    return 0.007 * max(0.0, t) ** 0.6 * (0.5 + 0.5 * math.cos(96 * a))


bm = torno(perfil, pasos=384, relieve=estrias)
objeto_desde_bmesh("carcasa", bm, M["carbon"], cuerpo, suave=35)

# --- Esfera (cara del dial) ---------------------------------------
bm = bmesh.new()
bmesh.ops.create_circle(bm, cap_ends=True, segments=192, radius=0.886)
for v in bm.verts:
    v.co.z = Z_ESFERA
objeto_desde_bmesh("esfera", bm, M["marfil"], cuerpo)

# --- Marcas impresas: 72 trazos cada 5°, aros finos ---------------
Z_TINTA = Z_ESFERA + 0.0012
bm = bmesh.new()
for i in range(72):
    ang = math.radians(i * 5)
    cardinal = i % 18 == 0
    decena = i % 2 == 0
    largo = 0.11 if cardinal else (0.075 if decena else 0.045)
    ancho = 0.014 if cardinal else (0.009 if decena else 0.006)
    r_ext = 0.865
    r_med = r_ext - largo / 2
    cx, cy = r_med * math.sin(ang), r_med * math.cos(ang)
    caja(bm, (cx, cy, Z_TINTA + 0.003), (ancho, largo, 0.007), rot_z=-ang)  # marcas en relieve

# Aro interior fino
def aro(bm, radio, grosor, z, segs=192):
    exterior, interior = [], []
    for i in range(segs):
        a = 2 * math.pi * i / segs
        exterior.append(bm.verts.new(((radio + grosor / 2) * math.sin(a), (radio + grosor / 2) * math.cos(a), z)))
        interior.append(bm.verts.new(((radio - grosor / 2) * math.sin(a), (radio - grosor / 2) * math.cos(a), z)))
    for i in range(segs):
        j = (i + 1) % segs
        bm.faces.new((exterior[i], exterior[j], interior[j], interior[i]))


aro(bm, 0.735, 0.006, Z_TINTA + 0.0012)
aro(bm, 0.872, 0.004, Z_TINTA + 0.0012)
objeto_desde_bmesh("marcas", bm, M["tinta"], cuerpo)

# Marca de rumbo: triángulo naranja en 28°, donde descansa la aguja
bm = bmesh.new()
a = math.radians(RUMBO)
r0, r1, semi = 0.872, 0.78, math.radians(2.6)
pts = [
    (r0 * math.sin(a - semi), r0 * math.cos(a - semi)),
    (r0 * math.sin(a + semi), r0 * math.cos(a + semi)),
    (r1 * math.sin(a), r1 * math.cos(a)),
]
vs = [bm.verts.new((x, y, Z_TINTA + 0.0026)) for x, y in pts]
bm.faces.new(vs)
objeto_desde_bmesh("marca_rumbo", bm, M["naranja_tinta"], cuerpo)

# --- Letras: N (naranja), E, S, O --------------------------------
fuente = bpy.data.fonts.load(FUENTE)


def letra(texto, angulo_deg, mat):
    cu = bpy.data.curves.new("txt_" + texto, "FONT")
    cu.body = texto
    cu.font = fuente
    cu.size = 0.15
    cu.extrude = 0.005
    cu.align_x = "CENTER"
    cu.align_y = "CENTER"
    ob = bpy.data.objects.new("letra_" + texto, cu)
    escena.collection.objects.link(ob)
    a = math.radians(angulo_deg)
    r = 0.6
    ob.location = (r * math.sin(a), r * math.cos(a), Z_TINTA + 0.005)
    ob.rotation_euler = (0, 0, -a)  # la base de cada letra mira al centro
    # a malla, para que la exporte glTF
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.convert(target="MESH")
    ob = bpy.context.view_layer.objects.active
    ob.select_set(False)
    ob.data.materials.clear()
    ob.data.materials.append(mat)
    ob.parent = cuerpo
    return ob


letras = [letra("N", 0, M["naranja_tinta"]), letra("E", 90, M["tinta"]),
          letra("S", 180, M["tinta"]), letra("O", 270, M["tinta"])]
# Una sola malla para las cuatro letras (menos llamadas de dibujo)
bpy.ops.object.select_all(action="DESELECT")
for ob in letras:
    ob.select_set(True)
bpy.context.view_layer.objects.active = letras[0]
bpy.ops.object.join()
letras[0].name = "letras"

# --- Cristal ------------------------------------------------------
bm = bmesh.new()
bmesh.ops.create_circle(bm, cap_ends=True, segments=160, radius=0.9)
for v in bm.verts:
    # cúpula muy leve: refleja la luz como un cristal real
    d = (v.co.x ** 2 + v.co.y ** 2) / 0.905 ** 2
    v.co.z = 0.199 + 0.008 * (1 - d)
bmesh.ops.triangulate(bm, faces=bm.faces)
objeto_desde_bmesh("cristal", bm, M["cristal"], cuerpo, suave=80)

# --- Anilla de la carcasa (al norte del cuerpo) ------------------
bm = bmesh.new()
# orejeta
caja(bm, (0, 1.025, 0.1), (0.12, 0.07, 0.08))
objeto_desde_bmesh("orejeta", bm, M["carbon"], cuerpo)
bpy.ops.mesh.primitive_torus_add(major_radius=0.07, minor_radius=0.016, major_segments=48, minor_segments=16,
                                 location=(0, 1.125, 0.1), rotation=(0, 0, 0))
anilla = bpy.context.active_object
anilla.name = "anilla"
anilla.data.materials.append(M["acero"])
for p in anilla.data.polygons:
    p.use_smooth = True
anilla.parent = cuerpo

# --- La aguja: el logotipo en volumen -----------------------------
# Proporción del logo: mitad de 18 de largo por 6 de ancho.
L, W = 0.68, 0.2267
Z0, T = 0.105, 0.05     # base y altura de la cresta central (más relieve)


def media_aguja(nombre, signo, mat):
    """signo=+1 mitad norte, -1 mitad sur. Dos facetas que se encuentran
    en una cresta: la luz las separa como en una aguja de verdad."""
    bm = bmesh.new()
    punta = bm.verts.new((0, signo * L, Z0 + T * 0.18))
    izq = bm.verts.new((-W, 0, Z0))
    der = bm.verts.new((W, 0, Z0))
    cresta = bm.verts.new((0, 0, Z0 + T))
    base_c = bm.verts.new((0, 0, Z0 - 0.012))
    if signo > 0:
        bm.faces.new((punta, izq, cresta))
        bm.faces.new((punta, cresta, der))
        bm.faces.new((punta, der, base_c))
        bm.faces.new((punta, base_c, izq))
        bm.faces.new((izq, base_c, der, cresta))
    else:
        bm.faces.new((punta, cresta, izq))
        bm.faces.new((punta, der, cresta))
        bm.faces.new((punta, base_c, der))
        bm.faces.new((punta, izq, base_c))
        bm.faces.new((izq, cresta, der, base_c))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return objeto_desde_bmesh(nombre, bm, mat, eje_aguja)


media_aguja("aguja_norte", +1, M["naranja"])
media_aguja("aguja_sur", -1, M["sur"])

# Eje: pivote de acero y tapa blanca (el círculo del logo)
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.018, depth=Z0 - Z_ESFERA, location=(0, 0, (Z0 + Z_ESFERA) / 2))
pivote = bpy.context.active_object
pivote.name = "pivote"
pivote.data.materials.append(M["acero"])
pivote.parent = eje_aguja

bm = bmesh.new()
perfil_tapa = [(0.0005, Z0 + T + 0.022)]
for i in range(1, 9):
    t = i / 8
    perfil_tapa.append((0.062 * math.sin(t * math.pi / 2), Z0 + T - 0.004 + 0.026 * math.cos(t * math.pi / 2)))
perfil_tapa.append((0.062, Z0 + T - 0.012))
perfil_tapa.append((0.0005, Z0 + T - 0.012))
bm_tapa = torno(perfil_tapa, pasos=64)
objeto_desde_bmesh("tapa", bm_tapa, M["blanco"], eje_aguja, suave=60)
bm.free()

# ------------------------------------------------------------------
# Guardar y exportar
# ------------------------------------------------------------------
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
    export_extras=False,
)
print("OK ->", SALIDA_GLB, os.path.getsize(SALIDA_GLB), "bytes")
