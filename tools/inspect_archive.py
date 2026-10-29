#!/usr/bin/env python3
"""Inventory the supplied XAPK without checking the game binaries into Git."""
import os
import sys
import zipfile

source, outdir = sys.argv[1:]
os.makedirs(outdir, exist_ok=True)
with zipfile.ZipFile(source) as archive:
    print('XAPK contents:')
    for item in archive.infolist():
        print(f'{item.filename}\t{item.file_size}')
    apks = [x for x in archive.infolist() if x.filename.lower().endswith('.apk')]
    for n, item in enumerate(apks):
        path = os.path.join(outdir, f'part-{n}.apk')
        with archive.open(item) as src, open(path, 'wb') as dst:
            import shutil
            shutil.copyfileobj(src, dst)
        print(f'\nAPK {item.filename} => part-{n}.apk')
        with zipfile.ZipFile(path) as apk:
            for x in apk.infolist():
                name = x.filename
                if (name.startswith('lib/') and name.endswith('.so')) or name in ('AndroidManifest.xml', 'assets/bin/Data/Managed/Metadata/global-metadata.dat') or name.endswith('.dex') or name.endswith('.obb'):
                    print(f'{name}\t{x.file_size}')
