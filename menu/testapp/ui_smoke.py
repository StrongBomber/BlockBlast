#!/usr/bin/env python3
"""Run on a disposable Android emulator after the test harness APK is built."""
import os
import re
import subprocess
import time
import xml.etree.ElementTree as ET

APP = 'ai.arena.blockblast.testapp'


def adb(*args):
    return subprocess.run(['adb', *args], check=True, text=True, capture_output=True).stdout


def tree():
    adb('shell', 'uiautomator', 'dump', '--compressed', '/sdcard/window.xml')
    return ET.fromstring(adb('exec-out', 'cat', '/sdcard/window.xml'))


def node(text):
    for item in tree().iter('node'):
        if text in item.get('text', ''):
            return item
    raise AssertionError('Could not find text: ' + text)


def center(item):
    nums = list(map(int, re.findall(r'\d+', item.attrib['bounds'])))
    if len(nums) != 4:
        raise AssertionError('Invalid bounds: ' + item.attrib['bounds'])
    return (nums[0] + nums[2]) // 2, (nums[1] + nums[3]) // 2


def tap(text):
    x, y = center(node(text))
    adb('shell', 'input', 'tap', str(x), str(y))
    time.sleep(1)


def choice(label):
    for direction in ('up', 'down'):
        for _ in range(4):
            root = tree()
            nodes = [n for n in root.iter('node') if n.get('text', '').removeprefix('✓').strip() == label]
            if len(nodes) == 1:
                x1, y1, x2, y2 = map(int, re.findall(r'\d+', nodes[0].get('bounds', '')))
                if y2 - y1 >= 35:
                    return nodes[0]
            scrolls = [n for n in root.iter('node') if n.get('class') == 'android.widget.ScrollView']
            assert len(scrolls) == 1, 'Expected a scrollable menu'
            x1, y1, x2, y2 = map(int, re.findall(r'\d+', scrolls[0].get('bounds', '')))
            x = (x1 + x2) // 2
            top, bottom = y1 + (y2-y1)//4, y2 - (y2-y1)//4
            adb('shell', 'input', 'swipe', str(x), str(top if direction == 'up' else bottom),
                str(x), str(bottom if direction == 'up' else top), '500')
            time.sleep(1)
    raise AssertionError('Could not find choice: ' + label)


def select(label):
    x, y = center(choice(label))
    adb('shell', 'input', 'tap', str(x), str(y))
    time.sleep(1)
    assert '✓' in choice(label).get('text', '')


def start():
    adb('shell', 'am', 'start', '-n', APP + '/org.cocos2dx.javascript.AppActivity')
    time.sleep(3)


adb('install', '--no-incremental', '-r', os.path.join(os.environ['RUNNER_TEMP'], 'menu-smoke.apk'))
adb('shell', 'pm', 'clear', APP)
start()
tap('Oyun alanı: 0')
node('Oyun alanı: 1')  # An empty area of the overlay must not consume gameplay taps.
node('By Raiwesy')
tap('MOD MENÜ')
for label in ('Kapalı (1x)', '10x', '100x', '1000x', '10000x', '100000x'):
    select(label)

# Send complete multi-pointer MotionEvents through the activity's real window
# callback. A retouch before all fingers lift must not toggle a second time.
def fingers(count, retouch=False):
    adb('shell', 'am', 'broadcast', '-a', APP + '.FINGERS', '-p', APP,
        '--ei', 'count', str(count), '--ez', 'retouch', str(retouch).lower())
    time.sleep(1)

adb('logcat', '-c')
fingers(2)
node('MOD MENÜ')  # Two fingers must not hide the panel.
fingers(3, retouch=True)
assert not any('MOD MENÜ' in n.get('text', '') for n in tree().iter('node')), 'Three fingers did not hide menu'
assert not any('By Raiwesy' in n.get('text', '') for n in tree().iter('node')), 'Credit remained visible'
assert 'pointers=3' in adb('logcat', '-d', '-s', 'ArenaTestInput:I', '*:S'), 'Touches did not reach the game'
fingers(3)
node('MOD MENÜ')
node('By Raiwesy')
assert '✓' in choice('100000x').get('text', ''), 'Selection changed while hidden'
tap('MOD MENÜ')
fingers(3)
assert not any('MOD MENÜ' in n.get('text', '') for n in tree().iter('node')), 'Collapsed menu did not hide'
fingers(3)
node('MOD MENÜ')
adb('shell', 'am', 'force-stop', APP)
start()
tap('MOD MENÜ')
assert '✓' in choice('100000x').get('text', '')  # Selection survives process restart.
select('Kapalı (1x)')
tap('MOD MENÜ')
old = center(node('MOD MENÜ'))
adb('shell', 'input', 'swipe', str(old[0]), str(old[1]), str(old[0] + 160), str(old[1] + 160), '600')
time.sleep(1)
new = center(node('MOD MENÜ'))
assert new != old, 'Floating menu did not move when dragged'
print('Menu UI test passed: choices, persistence, drag, credit, three-finger visibility and input pass-through')
