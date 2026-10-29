#!/usr/bin/env python3
"""Add the experimental lifecycle provider to a decoded Block Blast manifest.

This does not implement a score hook and must not be interpreted as a complete
modification of the game. The caller must add the compiled provider dex too.
"""
import sys
import xml.etree.ElementTree as ET

ANDROID = 'http://schemas.android.com/apk/res/android'
ET.register_namespace('android', ANDROID)
name = '{%s}name' % ANDROID
path = sys.argv[1]
tree = ET.parse(path)
root = tree.getroot()
if root.tag != 'manifest' or root.get('package') != 'com.block.juggle':
    raise SystemExit('Unexpected package; refusing to modify manifest')
apps = root.findall('application')
if len(apps) != 1:
    raise SystemExit('Expected exactly one application')
app = apps[0]
provider = 'ai.arena.blockblast.menu.MenuBootstrapProvider'
if any(n.get(name) == provider for n in app.findall('provider')):
    raise SystemExit('Provider already present; refusing to patch twice')
ET.SubElement(app, 'provider', {
    name: provider,
    '{%s}authorities' % ANDROID: 'com.block.juggle.arena.menu.bootstrap',
    '{%s}exported' % ANDROID: 'false',
})
tree.write(path, encoding='utf-8', xml_declaration=True)
