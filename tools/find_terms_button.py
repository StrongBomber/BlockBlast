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
matches = []
for line in lines.values():
    words = [row['text'].strip().lower() for row in line]
    for i in range(len(words) - 3):
        if words[i:i+4] == ['accept', 'terms', 'of', 'use']:
            button = line[i:i+4]
            x1 = min(int(r['left']) for r in button)
            y1 = min(int(r['top']) for r in button)
            x2 = max(int(r['left']) + int(r['width']) for r in button)
            y2 = max(int(r['top']) + int(r['height']) for r in button)
            matches.append(((x1 + x2) // 2, (y1 + y2) // 2))
if len(matches) != 1:
    raise SystemExit('Expected exactly one Accept Terms of Use button; found %d' % len(matches))
print(*matches[0])
