"""
Blender Python脚本：自动生成刘看山3D模型并导出为glb
用法: blender --background --python build_kanshan.py
"""
import bpy
import math
import os

# ========== 清理场景 ==========
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# ========== 材质定义 ==========
def make_material(name, color, roughness=0.5, metalness=0.0, emit_color=None, emit_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    # 清除默认节点，手动创建
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    for node in nodes:
        nodes.remove(node)
    # 创建Principled BSDF
    bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
    bsdf.location = (0, 0)
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metalness
    if emit_color:
        bsdf.inputs["Emission Color"].default_value = (*emit_color, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emit_strength
    # 创建Output节点
    output = nodes.new(type='ShaderNodeOutputMaterial')
    output.location = (400, 0)
    # 连接
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    return mat

white_mat = make_material("White", (1.0, 1.0, 1.0), roughness=0.6, metalness=0.05)
dark_mat = make_material("Dark", (0.1, 0.1, 0.1), roughness=0.4)
blue_mat = make_material("Blue", (0.0, 0.52, 1.0), roughness=0.5, metalness=0.2)
pink_mat = make_material("Pink", (1.0, 0.71, 0.76), roughness=0.7)
highlight_mat = make_material("Highlight", (1.0, 1.0, 1.0), roughness=0.1, metalness=0.0)
glow_mat = make_material("Glow", (0.0, 0.52, 1.0), roughness=0.3, emit_color=(0.0, 0.52, 1.0), emit_strength=2.0)

# ========== 模型组 ==========
kanshan = bpy.data.objects.new("Kanshan", None)
bpy.context.collection.objects.link(kanshan)

def add_sphere(name, radius, location, scale=(1,1,1), material=white_mat):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(material)
    obj.parent = kanshan
    return obj

def add_cone(name, radius, depth, location, rotation=(0,0,0), material=white_mat):
    bpy.ops.mesh.primitive_cone_add(radius1=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    obj.parent = kanshan
    return obj

def add_torus(name, major_radius, minor_radius, location, rotation=(0,0,0), material=blue_mat):
    bpy.ops.mesh.primitive_torus_add(major_radius=major_radius, minor_radius=minor_radius, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    obj.parent = kanshan
    return obj

def add_cube(name, size, location, rotation=(0,0,0), material=blue_mat):
    bpy.ops.mesh.primitive_cube_add(size=size, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    obj.parent = kanshan
    return obj

# ========== 身体 ==========
body = add_sphere("Body", 0.7, (0, 0, 0.2), scale=(1, 1.4, 1))
# 肚子
belly = add_sphere("Belly", 0.55, (0, 0.35, 0.1), scale=(1, 1.1, 0.6))

# ========== 头 ==========
head = add_sphere("Head", 0.65, (0, 0, 1.35))

# 耳朵
left_ear = add_cone("LeftEar", 0.2, 0.45, (-0.4, 0, 1.85), rotation=(0, 0, 0.3))
right_ear = add_cone("RightEar", 0.2, 0.45, (0.4, 0, 1.85), rotation=(0, 0, -0.3))
# 耳朵内侧
left_inner = add_cone("LeftInnerEar", 0.1, 0.25, (-0.4, 0.08, 1.82), rotation=(0, 0, 0.3), material=pink_mat)
right_inner = add_cone("RightInnerEar", 0.1, 0.25, (0.4, 0.08, 1.82), rotation=(0, 0, -0.3), material=pink_mat)

# 眼睛
left_eye = add_sphere("LeftEye", 0.09, (-0.22, 0.55, 1.4), material=dark_mat)
right_eye = add_sphere("RightEye", 0.09, (0.22, 0.55, 1.4), material=dark_mat)
# 眼睛高光
left_hl = add_sphere("LeftHighlight", 0.03, (-0.19, 0.6, 1.47), material=highlight_mat)
right_hl = add_sphere("RightHighlight", 0.03, (0.25, 0.6, 1.47), material=highlight_mat)

# 大鼻子
nose = add_sphere("Nose", 0.13, (0, 0.6, 1.28), scale=(1.2, 0.9, 0.8), material=dark_mat)

# 腮红
left_blush = add_sphere("LeftBlush", 0.08, (-0.38, 0.5, 1.3), scale=(1, 0.6, 0.3), material=pink_mat)
right_blush = add_sphere("RightBlush", 0.08, (0.38, 0.5, 1.3), scale=(1, 0.6, 0.3), material=pink_mat)

# ========== 围巾 ==========
scarf = add_torus("Scarf", 0.5, 0.1, (0, 0, 0.6), rotation=(math.pi/2, 0, 0))
# 围巾飘带
scarf_tail = add_cube("ScarfTail", 0.15, (0.3, 0.35, 0.3), rotation=(0, 0, -0.3))

# ========== 手臂 ==========
left_arm = add_sphere("LeftArm", 0.12, (-0.85, 0, 0.4), scale=(1, 2.5, 1))
left_arm.rotation_euler = (0, 0, 0.5)
right_arm = add_sphere("RightArm", 0.12, (0.85, 0, 0.4), scale=(1, 2.5, 1))
right_arm.rotation_euler = (0, 0, -0.5)

# ========== 腿 ==========
left_leg = add_sphere("LeftLeg", 0.15, (-0.3, 0, -0.6), scale=(1, 1.8, 1))
right_leg = add_sphere("RightLeg", 0.15, (0.3, 0, -0.6), scale=(1, 1.8, 1))

# ========== 脚 ==========
left_foot = add_sphere("LeftFoot", 0.18, (-0.3, 0.1, -0.85), scale=(1, 0.5, 1.3), material=dark_mat)
right_foot = add_sphere("RightFoot", 0.18, (0.3, 0.1, -0.85), scale=(1, 0.5, 1.3), material=dark_mat)

# ========== 尾巴 ==========
tail = add_sphere("Tail", 0.15, (0, -0.6, 0), scale=(1, 1, 1.5))
tail.rotation_euler = (-math.pi/2.5, 0, 0)

# ========== 底座发光圆环 ==========
base_ring = add_torus("BaseRing", 0.8, 0.04, (0, 0, -0.95), rotation=(math.pi/2, 0, 0), material=glow_mat)
base_inner = add_torus("BaseInner", 0.6, 0.03, (0, 0, -0.95), rotation=(math.pi/2, 0, 0), material=glow_mat)

# ========== 灯光 ==========
bpy.ops.object.light_add(type='SUN', location=(5, 5, 10))
sun = bpy.context.active_object
sun.data.energy = 3.0

bpy.ops.object.light_add(type='AREA', location=(-3, -3, 5))
fill = bpy.context.active_object
fill.data.energy = 200
fill.data.size = 10

# ========== 相机 ==========
bpy.ops.object.camera_add(location=(0, -4, 1.5), rotation=(math.pi/2, 0, 0))
cam = bpy.context.active_object
bpy.context.scene.camera = cam

# ========== 导出glb ==========
output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kanshan.glb")
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    export_apply=True,
    export_materials='EXPORT',
    export_lights=False,
    export_cameras=False,
    use_selection=False
)
print(f"模型已导出: {output_path}")
print(f"对象数量: {len(bpy.data.objects)}")
