#!/usr/bin/env python3
"""Exercise the actual game and all multiplier choices in a disposable device.

The user's explicit approval to accept the terms is required via the environment.
This does not access a real user account and declines notification permission.
"""
import json
import os
import re
import subprocess
import time
import xml.etree.ElementTree as ET

if os.environ.get('USER_APPROVED_TERMS') != '1':
    raise SystemExit('User consent for the test device is required')


def adb(*args):
    return subprocess.run(['adb', *map(str, args)], text=True, capture_output=True, check=True, timeout=30).stdout


def tree():
    adb('shell', 'uiautomator', 'dump', '--compressed', '/sdcard/arena-ui.xml')
    return ET.fromstring(adb('exec-out', 'cat', '/sdcard/arena-ui.xml'))


def center(node):
    values = list(map(int, re.findall(r'\d+', node.get('bounds', ''))))
    if len(values) != 4:
        raise AssertionError('Invalid node bounds')
    x1, y1, x2, y2 = values
    return (x1 + x2) // 2, (y1 + y2) // 2


def tap_node(match):
    nodes = [node for node in tree().iter('node') if match(node)]
    if len(nodes) != 1:
        raise AssertionError('Expected one matching UI node, found ' + str(len(nodes)))
    adb('shell', 'input', 'tap', *center(nodes[0]))
    time.sleep(1)


def text_contains(value):
    return lambda node: value in node.get('text', '')


def select_factor(factor):
    tap_node(text_contains('MOD MENÜ'))
    label = 'Kapalı (1x)' if factor == 1 else str(factor) + 'x'
    tap_node(lambda n: n.get('text', '').removeprefix('✓').strip() == label)
    selected = [n for n in tree().iter('node') if n.get('text', '').removeprefix('✓').strip() == label]
    if len(selected) != 1 or '✓' not in selected[0].get('text', ''):
        raise AssertionError('Menu did not select ' + label)
    tap_node(text_contains('MOD MENÜ'))
    print('Selected:', label, flush=True)


def read_awards():
    output = adb('logcat', '-d', '-s', 'ArenaScoreHook:I', '*:S')
    awards = []
    for line in output.splitlines():
        m = re.search(r'(\{"factor":.*\})', line)
        if m:
            awards.append(json.loads(m.group(1)))
    return awards


# Accept exactly the approved legal dialog in the disposable test installation.
adb('shell', 'screencap', '-p', '/sdcard/terms.png')
image = os.path.join(os.environ['RUNNER_TEMP'], 'arena-terms.png')
adb('pull', '/sdcard/terms.png', image)
coords = subprocess.run(['python3', 'tools/find_terms_button.py', image], check=True,
                        text=True, capture_output=True, timeout=40).stdout.split()
if len(coords) != 2:
    raise AssertionError('Could not uniquely locate the consent button')
adb('shell', 'input', 'tap', *coords)
time.sleep(8)
for item in tree().iter('node'):
    if item.get('resource-id') == 'com.android.permissioncontroller:id/permission_deny_button':
        adb('shell', 'input', 'tap', *center(item))
        print('Declined optional notifications')
        break
time.sleep(10)
# The tutorial has one blue 2x2 piece and requires a specific drop location.
for y in (480, 540, 600, 700, 780):
    adb('shell', 'input', 'swipe', 360, 1050, 360, y, 1200)
    time.sleep(3)
time.sleep(8)

# Try candidate tray/board positions; require a genuine awarded score for each
# factor, rather than inferring success merely from a UI selection or install.
for factor in (1, 10, 100, 1000):
    select_factor(factor)
    adb('logcat', '-c')
    award = None
    for x, target_x, target_y in ((150, 150, 780), (360, 350, 780), (570, 550, 780),
                                  (150, 150, 620), (360, 350, 620), (570, 550, 620),
                                  (150, 150, 480), (360, 350, 480), (570, 550, 480)):
        adb('shell', 'input', 'swipe', x, 1050, target_x, target_y, 1200)
        time.sleep(4)
        candidates = [a for a in read_awards() if a.get('factor') == factor and a.get('before', 0) > 0]
        if candidates:
            award = candidates[-1]
            break
    if award is None:
        from PIL import Image
        import base64, io
        adb('shell', 'screencap', '-p', '/sdcard/failure.png')
        failure = os.path.join(os.environ['RUNNER_TEMP'], 'arena-failure.png')
        adb('pull', '/sdcard/failure.png', failure)
        im = Image.open(failure).convert('RGB'); im.thumbnail((360, 800))
        buffer = io.BytesIO(); im.save(buffer, format='JPEG', quality=65)
        with open('analysis/score-test-failure.txt', 'w') as f:
            f.write(base64.b64encode(buffer.getvalue()).decode() + '\n')
        print('Visible UI:', [(n.get('text'), n.get('resource-id')) for n in tree().iter('node') if n.get('text')], flush=True)
        print('Awards:', read_awards(), flush=True)
        raise AssertionError('No actual score award observed for factor ' + str(factor))
    if award['after'] != award['before'] * factor:
        raise AssertionError('Wrong score multiplier: ' + repr(award))
    print('Verified game award:', json.dumps(award, sort_keys=True), flush=True)
print('All four in-game multiplier settings affected actual awards as expected.', flush=True)
expected_score = int(award['current'] + award['after'])
adb('shell', 'am', 'force-stop', 'com.block.juggle')
adb('logcat', '-c')
adb('shell', 'am', 'start', '-n', 'com.block.juggle/org.cocos2dx.javascript.AppActivity.Default')
time.sleep(70)
logs = adb('logcat', '-d', '-s', 'ArenaScoreHook:I', '*:S')
loaded = re.findall(r'loaded-score:(\d+)', logs)
if not loaded or int(loaded[-1]) != expected_score:
    raise AssertionError('Score did not survive restart: expected %s; loaded %s' % (expected_score, loaded))
tap_node(text_contains('MOD MENÜ'))
selected = [n for n in tree().iter('node') if n.get('text', '').removeprefix('✓').strip() == '1000x']
if len(selected) != 1 or '✓' not in selected[0].get('text', ''):
    raise AssertionError('Multiplier did not survive restart')
tap_node(text_contains('MOD MENÜ'))
print('Restart verified: saved score %d and 1000x selection persisted.' % expected_score, flush=True)
