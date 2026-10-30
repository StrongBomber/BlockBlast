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


def scroll_node(match):
    """Find a visible menu control in either scroll direction."""
    for direction in ('up', 'down'):
        for _ in range(4):
            root = tree()
            nodes = [n for n in root.iter('node') if match(n)]
            if len(nodes) == 1:
                x1, y1, x2, y2 = map(int, re.findall(r'\d+', nodes[0].get('bounds', '')))
                if y2 - y1 >= 35:
                    return nodes[0]
            scrolls = [n for n in root.iter('node') if n.get('class') == 'android.widget.ScrollView']
            if len(scrolls) != 1:
                raise AssertionError('Expected a scrollable menu')
            x1, y1, x2, y2 = map(int, re.findall(r'\d+', scrolls[0].get('bounds', '')))
            x = (x1 + x2) // 2
            top, bottom = y1 + (y2-y1)//4, y2 - (y2-y1)//4
            adb('shell', 'input', 'swipe', x, top if direction == 'up' else bottom,
                x, bottom if direction == 'up' else top, 500)
            time.sleep(1)
    raise AssertionError('Could not find menu control')


def choice_node(label):
    return scroll_node(lambda n: n.get('text', '').removeprefix('✓').strip() == label)


def select_factor(factor):
    tap_node(text_contains('MOD MENÜ'))
    label = 'Kapalı (1x)' if factor == 1 else str(factor) + 'x'
    if factor == 37:
        adb('shell', 'input', 'tap', *center(scroll_node(lambda n: n.get('content-desc') == 'Özel çarpan değeri')))
        time.sleep(1)
        adb('shell', 'input', 'text', '37')
        adb('shell', 'input', 'tap', *center(scroll_node(text_contains('Çarpanı uygula'))))
        time.sleep(1)
        if not any(n.get('text') == 'Aktif: 37x' for n in tree().iter('node')):
            raise AssertionError('Custom multiplier was not selected')
    else:
        adb('shell', 'input', 'tap', *center(choice_node(label)))
        time.sleep(1)
        if '✓' not in choice_node(label).get('text', ''):
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

# Queue a one-shot combo request via the actual menu and wait for the GL bridge.
tap_node(text_contains('MOD MENÜ'))
field = scroll_node(lambda n: n.get('content-desc') == 'Özel kombo değeri')
adb('shell', 'input', 'tap', *center(field))
adb('shell', 'input', 'text', '90')
adb('shell', 'input', 'tap', *center(scroll_node(text_contains('Komboyu ayarla'))))
time.sleep(5)
tap_node(text_contains('MOD MENÜ'))
combo_logs = adb('logcat', '-d', '-s', 'ArenaComboHook:I', '*:S')
if not re.search(r'"applied":90', combo_logs):
    raise AssertionError('Custom combo request did not reach the actual game: ' + combo_logs)
print('Verified custom combo 90 applied to actual game counter.', flush=True)

# Try candidate tray/board positions; require a genuine awarded score for each
# factor, rather than inferring success merely from a UI selection or install.
for factor in (1, 37, 10, 100, 1000, 10000, 100000):
    select_factor(factor)
    adb('logcat', '-c')
    award = None
    attempts = [(150, 150, 780), (360, 350, 780), (570, 360, 780)]
    attempts += [(x, tx, ty) for ty in (780, 620, 480) for x in (150, 360, 570) for tx in (240, 360, 480)]
    for x, target_x, target_y in attempts:
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
    if factor == 1:
        combo_logs = adb('logcat', '-d', '-s', 'ArenaComboHook:I', '*:S')
        steps = [json.loads(m.group(1)) for m in re.finditer(r'(\{"step":true[^\n]*?\})', combo_logs)]
        if not steps or steps[0].get('before') != 90 or steps[0].get('after') not in (90, 91):
            raise AssertionError('First game move did not continue from combo 90: ' + combo_logs)
        print('Verified next real-game combo calculation:', json.dumps(steps[0], sort_keys=True), flush=True)
    print('Verified game award:', json.dumps(award, sort_keys=True), flush=True)
print('All preset and custom in-game multiplier settings affected actual awards as expected.', flush=True)
expected_score = int(award['current'] + award['after'])
adb('shell', 'am', 'force-stop', 'com.block.juggle')
adb('logcat', '-c')
adb('shell', 'am', 'start', '-n', 'com.block.juggle/org.cocos2dx.javascript.AppActivity.Default')
time.sleep(10)
for item in tree().iter('node'):
    if item.get('resource-id', '').startswith('com.android.permissioncontroller:id/permission_deny'):
        adb('shell', 'input', 'tap', *center(item))
        print('Declined repeated optional notification request', flush=True)
        break
time.sleep(70)
logs = adb('logcat', '-d', '-s', 'ArenaScoreHook:I', '*:S')
loaded = re.findall(r'loaded-score:(\d+)', logs)
if not loaded or int(loaded[-1]) != expected_score:
    from PIL import Image
    import base64, io
    adb('shell', 'screencap', '-p', '/sdcard/restart.png')
    restart = os.path.join(os.environ['RUNNER_TEMP'], 'arena-restart.png')
    adb('pull', '/sdcard/restart.png', restart)
    image = Image.open(restart).convert('RGB'); image.thumbnail((360, 800))
    buffer = io.BytesIO(); image.save(buffer, format='JPEG', quality=65)
    with open('analysis/score-test-failure.txt', 'w') as f:
        f.write(base64.b64encode(buffer.getvalue()).decode() + '\n')
    print('Restart UI:', [(n.get('text'), n.get('resource-id')) for n in tree().iter('node') if n.get('text')], flush=True)
    raw = adb('logcat', '-d', '-v', 'brief')
    print('Restart diagnostics:', '\n'.join(line for line in raw.splitlines() if any(s in line for s in ('ArenaScore', 'ArenaMenu', 'AndroidRuntime', 'F/libc', 'Force finishing', 'block.juggle'))) [-10000:], flush=True)
    raise AssertionError('Score did not survive restart: expected %s; loaded %s' % (expected_score, loaded))
tap_node(text_contains('MOD MENÜ'))
if '✓' not in choice_node('100000x').get('text', ''):
    raise AssertionError('Multiplier did not survive restart')
tap_node(text_contains('MOD MENÜ'))
print('Restart verified: saved score %d and 100000x selection persisted.' % expected_score, flush=True)
