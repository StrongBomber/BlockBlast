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


def start():
    adb('shell', 'am', 'start', '-n', APP + '/.MenuTestActivity')
    time.sleep(3)


adb('install', '--no-incremental', '-r', os.path.join(os.environ['RUNNER_TEMP'], 'menu-smoke.apk'))
adb('shell', 'pm', 'clear', APP)
start()
tap('Oyun alanı: 0')
node('Oyun alanı: 1')  # An empty area of the overlay must not consume gameplay taps.
tap('MOD MENÜ')
for choice in ('Kapalı (1x)', '10x', '100x', '1000x'):
    node(choice)
tap('1000x')
assert '✓' in node('1000x').get('text', '')
tap('MOD MENÜ')
adb('shell', 'am', 'force-stop', APP)
start()
tap('MOD MENÜ')
assert '✓' in node('1000x').get('text', '')  # Selection survives process restart.
tap('Kapalı (1x)')
assert '✓' in node('Kapalı (1x)').get('text', '')
tap('MOD MENÜ')
old = center(node('MOD MENÜ'))
adb('shell', 'input', 'swipe', str(old[0]), str(old[1]), str(old[0] + 160), str(old[1] + 160), '600')
time.sleep(1)
new = center(node('MOD MENÜ'))
assert new != old, 'Floating menu did not move when dragged'
print('Menu UI smoke test passed: choices, persistence, drag and input pass-through')
