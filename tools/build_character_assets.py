#!/usr/bin/env python3
"""Build small local game sprites from the documented, downloaded character art.

Requires Pillow. Does not redraw characters or claim to provide official poses.
Run from any directory; sources live in assets/references/.
"""
from collections import deque
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / 'assets' / 'references'
OUT = ROOT / 'assets' / 'characters'
OUT.mkdir(parents=True, exist_ok=True)
RESAMPLE = Image.Resampling.LANCZOS


def remove_edge_white(image):
    """Remove only near-white pixels connected to an edge, preserving eye whites."""
    im = image.convert('RGBA')
    pixels = im.load()
    w, h = im.size
    visited = set()
    pending = deque([(x, y) for x in range(w) for y in (0, h - 1)] +
                    [(x, y) for y in range(h) for x in (0, w - 1)])
    while pending:
        x, y = pending.popleft()
        if (x, y) in visited or not (0 <= x < w and 0 <= y < h):
            continue
        visited.add((x, y))
        r, g, b, a = pixels[x, y]
        if a == 0 or (min(r, g, b) > 235 and max(r, g, b) - min(r, g, b) < 20):
            pixels[x, y] = (r, g, b, 0)
            pending.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))
    return im


def largest_component(image):
    """Discard a tiny fragment of Xiaohei's foot adjacent to Heixiu's crop."""
    im = image.convert('RGBA')
    p = im.load()
    seen, components = set(), []
    for y in range(im.height):
        for x in range(im.width):
            if p[x, y][3] == 0 or (x, y) in seen:
                continue
            points, todo = [], [(x, y)]
            seen.add((x, y))
            while todo:
                a, b = todo.pop()
                points.append((a, b))
                for c, d in ((a-1,b),(a+1,b),(a,b-1),(a,b+1)):
                    if 0 <= c < im.width and 0 <= d < im.height and (c,d) not in seen and p[c,d][3]:
                        seen.add((c,d))
                        todo.append((c,d))
            components.append(points)
    keep = set(max(components, key=len))
    for y in range(im.height):
        for x in range(im.width):
            if (x,y) not in keep:
                r,g,b,a = p[x,y]
                p[x,y] = (r,g,b,0)
    return im


def fit(image, size=210):
    image = image.crop(image.getbbox())
    ratio = size / max(image.size)
    return image.resize((round(image.width*ratio),round(image.height*ratio)),RESAMPLE)


def on_canvas(image, bottom=238):
    canvas = Image.new('RGBA', (256,256))
    canvas.alpha_composite(image, ((256-image.width)//2, bottom-image.height))
    return canvas


def build_states(key, image, size=210):
    base = fit(image, size)
    on_canvas(base).save(OUT / f'{key}-idle.png', optimize=True)
    portrait = Image.new('RGBA',(256,256))
    portrait.alpha_composite(base,((256-base.width)//2,(256-base.height)//2))
    portrait.save(OUT / f'{key}-portrait.png', optimize=True)
    states = {
        'charge': (1.12,0.76,0),
        'jump': (0.94,1.04,-9),
        'fall': (0.95,0.95,24),
    }
    for state,(sx,sy,angle) in states.items():
        pose = base.resize((round(base.width*sx),round(base.height*sy)),RESAMPLE)
        if angle:
            pose = pose.rotate(angle,Image.Resampling.BICUBIC,expand=True)
        if pose.width > 246 or pose.height > 238:
            pose.thumbnail((246,238),RESAMPLE)
        on_canvas(pose).save(OUT / f'{key}-{state}.png',optimize=True)


xia = Image.open(REF/'licking-the-claw.gif')
xia.seek(0)
build_states('xiaohei',xia.convert('RGBA'))
hei = Image.open(REF/'play-heixiu.gif')
hei.seek(0)
heixiu = hei.convert('RGBA').crop((180,185,222,219))
# The original drawing has the foot touching Heixiu; follow Heixiu's outer contour.
mask = Image.new('L',(42*4,34*4))
ImageDraw.Draw(mask).polygon([(x*4,y*4) for x,y in
    [(6,8),(11,5),(18,1),(30,1),(34,3),(39,9),(42,18),
     (40,26),(34,32),(9,34),(1,30),(0,21),(2,14)]],fill=255)
from PIL import ImageChops
heixiu.putalpha(ImageChops.multiply(heixiu.getchannel('A'),mask.resize((42,34),RESAMPLE)))
build_states('heixiu',heixiu,170)
for key in ('wuxian','shanxin'):
    build_states(key,remove_edge_white(Image.open(REF/f'{key}-chibi.jpg')))

names = {'xiaohei':'罗小黑','heixiu':'嘿咻','wuxian':'无限','shanxin':'山新'}
urls = {
    'xiaohei':'https://github.com/jiang-taibai/IXiaoHei/blob/94d7eb55b85dcf10e47ad002d0417d0fb4d91436/src/org/taibai/hellohei/img/licking%20the%20claw.gif',
    'heixiu':'https://github.com/jiang-taibai/IXiaoHei/blob/94d7eb55b85dcf10e47ad002d0417d0fb4d91436/src/org/taibai/hellohei/img/play%20heixiu.gif',
    'wuxian':'https://github.com/Hakuin123/2048LXH/blob/20e465f85a525ed283a51579b5c6174f3abca127/src/img/512.jpg',
    'shanxin':'https://github.com/Hakuin123/2048LXH/blob/20e465f85a525ed283a51579b5c6174f3abca127/src/img/64.jpg',
}
manifest = {}
for key,name in names.items():
    manifest[key] = {
        'name':name,
        'sourceUrl':urls[key],
        'credit':'《罗小黑战记》角色；网络素材收录：'+('IXiaoHei' if key in ('xiaohei','heixiu') else '2048LXH'),
        'portrait':f'assets/characters/{key}-portrait.png',
        'sprites':{state:f'assets/characters/{key}-{state}.png' for state in ('idle','charge','jump','fall')},
        'processing':'原图裁剪/透明处理；蓄力、跳跃、下落差分由缩放和旋转制作，并非官方动作原画。',
    }
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('Built 20 transparent PNGs and assets/characters/manifest.json')
