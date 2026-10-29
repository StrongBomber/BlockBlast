#!/usr/bin/env python3
"""Locate the exact 'Accept Terms of Use' button in an emulator screenshot.

This only returns coordinates. The caller must separately obtain the user's
permission before tapping a legal agreement.
"""
import csv
import io
import subprocess
import sys

result = subprocess.run(['tesseract', sys.argv[1], 'stdout', '--psm', '6', 'tsv'],
                        check=True, capture_output=True, text=True)
rows = list(csv.DictReader(io.StringIO(result.stdout), delimiter='\t'))
lines = {}
for row in rows:
    text = row['text'].strip()
    if text:
        key = tuple(row[x] for x in ('page_num', 'block_num', 'par_num', 'line_num'))
        lines.setdefault(key, []).append(row)
target = [word.lower() for word in sys.argv[2:]] or ['accept', 'terms', 'of', 'use']
matches = []
for line in lines.values():
    words = [row['text'].strip().lower() for row in line]
    for i in range(len(words) - len(target) + 1):
        if words[i:i+len(target)] == target:
            button = line[i:i+len(target)]
            x1 = min(int(r['left']) for r in button)
            y1 = min(int(r['top']) for r in button)
            x2 = max(int(r['left']) + int(r['width']) for r in button)
            y2 = max(int(r['top']) + int(r['height']) for r in button)
            matches.append(((x1 + x2) // 2, (y1 + y2) // 2))
# Some builds render the white label on a bright green button that full-page
# OCR misses. Only for the approved terms screen, identify the visible green
# button after confirming all three contextual strings via OCR. Never apply
# this fallback to other targets such as the Android system hint.
if not matches and len(sys.argv) == 2:
    text = ' '.join(row['text'].strip().lower() for row in rows if row['text'].strip())
    if all(phrase in text for phrase in ('welcome to block blast', 'terms of use', 'privacy policy')):
        from PIL import Image
        from collections import deque
        image = Image.open(sys.argv[1]).convert('RGB')
        w, h = image.size
        # Limit color search to the lower part of the consent modal.
        scaled = image.resize((360, 640))
        px = scaled.load()
        mask = {(x, y) for y in range(384, 512) for x in range(18, 342)
                if px[x,y][1] > 120 and px[x,y][1] > 1.4*px[x,y][0]
                and px[x,y][1] > 1.25*px[x,y][2]}
        components = []
        while mask:
            p = mask.pop(); todo = deque([p]); component = [p]
            while todo:
                x, y = todo.popleft()
                for q in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                    if q in mask:
                        mask.remove(q); todo.append(q); component.append(q)
            if len(component) > 3000:
                xs, ys = zip(*component)
                x1, x2, y1, y2 = min(xs), max(xs), min(ys), max(ys)
                if x2-x1 > 180 and 25 < y2-y1 < 100 and x1 < 90 and x2 > 270:
                    components.append(((x1+x2)*w//720, (y1+y2)*h//1280))
        if len(components) == 1:
            matches = components
if len(matches) != 1:
    raise SystemExit('Expected exactly one matching button; found %d' % len(matches))
print(*matches[0])
