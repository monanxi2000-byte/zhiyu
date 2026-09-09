# -*- coding: utf-8 -*-
"""生成知遇项目封面图与 icon（PIL 合成，刘看山素材 + 品牌字体）。"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, os

MASCOT_DIR = r'D:\知乎项目\zhiyu\public\assets\mascot'
OUT = r'D:\知乎项目\zhiyu\docs\assets'
os.makedirs(OUT, exist_ok=True)

MSYH_BD = r'C:\Windows\Fonts\msyhbd.ttc'
MSYH = r'C:\Windows\Fonts\msyh.ttc'

def font(path, size):
    return ImageFont.truetype(path, size)

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def vgrad(w, h, top, bottom):
    img = Image.new('RGB', (w, h))
    px = img.load()
    for y in range(h):
        c = lerp(top, bottom, y / h)
        for x in range(w):
            px[x, y] = c
    return img

def rounded(draw, box, r, fill):
    draw.rounded_rectangle(box, radius=r, fill=fill)

# ---------- 封面 1600x900 ----------
W, H = 1600, 900
cover = vgrad(W, H, (7, 71, 166), (0, 132, 255))
# 底部提亮
base = vgrad(W, H, (7, 71, 166), (0, 132, 255))
overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(overlay)
# 装饰圆环（右下）
for i, (cx, cy, r) in enumerate([(1420, 760, 380), (1360, 700, 300), (1290, 640, 210)]):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(255, 255, 255, 28), width=3)
# 左上淡圆
d.ellipse((-200, -260, 260, 200), fill=(255, 255, 255, 16))
cover = Image.alpha_composite(base.convert('RGBA'), overlay).convert('RGB')

draw = ImageDraw.Draw(cover)

# 左侧品牌文字
LX = 110
f_brand = font(MSYH_BD, 168)
f_en = font(MSYH_BD, 52)
f_tag = font(MSYH, 46)
f_sub = font(MSYH, 30)
f_meta = font(MSYH, 26)
f_chip = font(MSYH_BD, 24)

# 「知遇」
draw.text((LX, 150), '知遇', font=f_brand, fill=(255, 255, 255))
draw.text((LX + 168 * 2 + 18, 218), 'ZhiYu', font=f_en, fill=(255, 255, 255))
# tagline
draw.text((LX + 6, 392), '新领域的第一位引路人', font=f_tag, fill=(235, 243, 255))
# 分隔线
draw.rounded_rectangle((LX, 500, LX + 90, 508), radius=4, fill=(255, 154, 61))
draw.rounded_rectangle((LX + 104, 500, LX + 420, 508), radius=4, fill=(255, 255, 255, 120))
# 副标题
draw.text((LX, 548), '基于知乎知识生态 · 多 Agent 协作完成', font=f_sub, fill=(220, 235, 255))
draw.text((LX, 600), '资料整理 · 观点对照 · 知识梳理', font=f_sub, fill=(220, 235, 255))
# 赛事信息
draw.text((LX, 700), '知乎黑客松 2026 · 校园新锐季', font=f_meta, fill=(255, 255, 255))
draw.text((LX, 746), '队伍「邂逅」 · 学习工具与知识生产赛道', font=f_meta, fill=(235, 243, 255))
# 三个 Agent chips
chips = ['资料收集官', '观点对照官', '知识梳理官']
cx = LX
for cname in chips:
    tw = draw.textlength(cname, font=f_chip) + 44
    rounded(draw, (cx, 822, cx + tw, 872), 25, (255, 255, 255, 34))
    draw.text((cx + 22, 830), cname, font=f_chip, fill=(255, 255, 255))
    cx += tw + 18

# 右侧吉祥物
mascot = Image.open(os.path.join(MASCOT_DIR, 'wave-frame.png')).convert('RGBA')
ms = 640
mascot = mascot.resize((ms, ms), Image.LANCZOS)
# 光晕
glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse((1150 - 160, 130 - 60, 1150 + ms - 160, 130 + ms - 60), fill=(255, 255, 255, 46))
glow = glow.filter(ImageFilter.GaussianBlur(60))
cover = Image.alpha_composite(cover.convert('RGBA'), glow)
cover.paste(mascot, (1150 - 120, 120), mascot)
cover = cover.convert('RGB')

# 浮动卡片
cards = [('📚 学习路径', 1010, 150), ('⚖️ 观点对照', 1360, 210), ('🃏 复习卡片', 1250, 700)]
# 不用 emoji（PIL 不支持彩色 emoji），改为纯文字
cards = [('学习路径', 1010, 140), ('观点对照', 1365, 200), ('复习卡片', 1240, 700)]
draw = ImageDraw.Draw(cover, 'RGBA')
for ctext, cx0, cy0 in cards:
    tw = draw.textlength(ctext, font=f_chip) + 56
    rounded(draw, (cx0, cy0, cx0 + tw, cy0 + 52), 26, (255, 255, 255, 235))
    draw.text((cx0 + 28, cy0 + 10), ctext, font=f_chip, fill=(7, 71, 166))

cover.save(os.path.join(OUT, 'cover.png'))
print('cover saved', cover.size)

# ---------- icon 512x512 ----------
IS = 512
icon = vgrad(IS, IS, (7, 71, 166), (0, 132, 255)).convert('RGBA')
di = ImageDraw.Draw(icon)
# 圆角遮罩
mask = Image.new('L', (IS, IS), 0)
md = ImageDraw.Draw(mask)
md.rounded_rectangle((0, 0, IS, IS), radius=112, fill=255)
icon.putalpha(mask)
# 装饰
di = ImageDraw.Draw(icon)
di.ellipse((352, 44, 472, 164), outline=(255, 255, 255, 46), width=4)
di.ellipse((330, 20, 494, 184), outline=(255, 255, 255, 26), width=2)
# 吉祥物
mascot_i = Image.open(os.path.join(MASCOT_DIR, 'wave-frame.png')).convert('RGBA').resize((340, 340), Image.LANCZOS)
icon.paste(mascot_i, (86, 60), mascot_i)
# 底部文字
di = ImageDraw.Draw(icon)
di.text((172, 428), '知遇', font=font(MSYH_BD, 52), fill=(255, 255, 255))
icon.save(os.path.join(OUT, 'icon.png'))
print('icon saved', icon.size)

# ---------- 页面小 logo（favicon 同款 256） ----------
logo = icon.resize((256, 256), Image.LANCZOS)
logo.save(os.path.join(OUT, 'icon-256.png'))
print('icon-256 saved')
