"""Encode original RGBA atlases and record alpha bounds; no artwork modification."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
sources = json.loads((root / 'docs/miniature-sources.json').read_text(encoding='utf8'))
sources += [json.loads(p.read_text(encoding='utf8')) for p in sorted((root / 'docs/miniature-generation').glob('*.json'))]
out = root / 'assets/miniatures'
out.mkdir(exist_ok=True)
atlases = []
for entry in sources:
    im = Image.open(entry['source']).convert('RGBA')
    w, h = im.size
    cols, rows = (3, 2) if entry['kind'] == 'units' else (4, 4)
    alpha = im.getchannel('A')
    assert alpha.histogram()[0] / (w*h) > .2, entry['key'] + ': missing transparency'
    rects = []
    for row in range(rows):
        for col in range(cols):
            x, y = col*w//cols, row*h//rows
            right, bottom = (col+1)*w//cols, (row+1)*h//rows
            mask = alpha.crop((x,y,right,bottom)).point(lambda a: 255 if a > 32 else 0)
            # Ignore thin fragments from the adjacent row when finding sprite bounds.
            bands = []; start = None
            for yy in range(mask.height+1):
                occupied = yy < mask.height and mask.crop((0,yy,mask.width,yy+1)).histogram()[255] >= 6
                if occupied and start is None: start = yy
                if not occupied and start is not None:
                    if yy-start >= 4: bands.append((start,yy))
                    start = None
            assert bands, entry['key'] + ': empty sprite band'
            top, bot = max(bands,key=lambda b:b[1]-b[0])
            box = mask.crop((0,top,mask.width,bot)).getbbox()
            assert box, entry['key'] + ': empty sprite'
            l,t,r,b = box
            t += top; b += top
            rects.append([x+l,y+t,r-l,b-t])
    file = 'assets/miniatures/' + entry['key'] + '.webp'
    if not (root / file).exists(): im.save(root / file, 'WEBP', quality=90, method=6, exact=True)
    atlases.append({k:entry[k] for k in ('key','kind','stage')} | {'file':file,'width':w,'height':h,'rects':rects})
    print(entry['key'],len(rects),'sprites')
assert len(atlases) == 20
existing = json.loads((root/'data/miniatures.json').read_text(encoding='utf8')) if (root/'data/miniatures.json').exists() else {'atlases':[]}
atlases += [a for a in existing['atlases'] if a['kind'] not in ('units','buildings')]
(root/'data/miniatures.json').write_bytes((json.dumps({'atlases':atlases},indent=2)+'\n').encode('utf8'))
print('Total:',sum(len(a['rects']) for a in atlases),'sprites;',round(sum(p.stat().st_size for p in out.glob('*.webp'))/1048576,2),'MiB')
