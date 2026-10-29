#!/usr/bin/env python3
"""Collect short score-related context from selected JS assets in an XAPK."""
import io, re, sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as xapk:
    with zipfile.ZipFile(io.BytesIO(xapk.read('com.block.juggle.apk'))) as apk:
        for name in apk.namelist():
            if not (name.endswith('.js') and (name.startswith('assets/assets/main/') or name.startswith('assets/assets/mainTraits/') or name == 'assets/main.js')):
                continue
            b = apk.read(name)
            print(f'\n{name}: {len(b)} bytes; prefix={b[:24]!r}')
            try:
                text = b.decode('utf-8')
            except UnicodeDecodeError:
                print('Not UTF-8; no textual score inspection possible.')
                continue
            matches = list(re.finditer(r'(?i)score', text))
            print(f'Score occurrences: {len(matches)}')
            for match in matches[:60]:
                print(repr(text[max(0, match.start()-120):min(len(text), match.end()+180)]))
