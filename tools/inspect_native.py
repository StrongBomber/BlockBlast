#!/usr/bin/env python3
"""Report likely script-loading symbols from the ARM64 Cocos library."""
import io, re, sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as xapk:
    with zipfile.ZipFile(io.BytesIO(xapk.read('config.arm64_v8a.apk'))) as apk:
        data = apk.read('lib/arm64-v8a/libcocos2djs.so')
strings = re.findall(rb'[ -~]{6,}', data)
patterns = (b'HEK:', b'XXTEA', b'xxtea', b'decrypt', b'Decrypt', b'evalString', b'evalScript', b'runScript', b'ScriptEngine', b'jsb_set_xxtea_key', b'getStringFromFile')
for pattern in patterns:
    matches = [s.decode('ascii')[:350] for s in strings if pattern in s]
    print(f'\n{pattern.decode()}: {len(matches)} matches')
    for match in matches[:20]:
        print(match)
