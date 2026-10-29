#!/usr/bin/env python3
"""Extract XAPK splits and substitute the ARM native library for emulator testing.

This is an experimental compatibility probe, not an APK build or mod patch.
It does not modify the input archive or touch any score logic.
"""
import io
import os
from pathlib import Path
import sys
import zipfile

xapk_path, out_dir = sys.argv[1:]
out = Path(out_dir)
out.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(xapk_path) as archive:
    for info in archive.infolist():
        if not info.filename.endswith('.apk'):
            continue
        if Path(info.filename).name != info.filename:
            raise ValueError('Unexpected split APK path')
        data = archive.read(info)
        if info.filename == 'config.arm64_v8a.apk':
            src = io.BytesIO(data)
            dst = io.BytesIO()
            with zipfile.ZipFile(src) as apk, zipfile.ZipFile(dst, 'w') as rewritten:
                source = apk.read('lib/arm64-v8a/libnesec.so')
                replaced = False
                for entry in apk.infolist():
                    if entry.filename == 'lib/arm64-v8a/libnesec-x86.so':
                        payload = source
                        replaced = True
                    else:
                        payload = apk.read(entry)
                    rewritten.writestr(entry, payload)
                if not replaced:
                    raise ValueError('Expected emulator library not found')
            data = dst.getvalue()
        (out / info.filename).write_bytes(data)
