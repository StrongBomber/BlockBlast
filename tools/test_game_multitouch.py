#!/usr/bin/env python3
"""Exercise real three-finger input against the installed game in Redroid."""
import subprocess
import time
import xml.etree.ElementTree as ET


def adb(*args):
    return subprocess.run(['adb', *map(str, args)], text=True, capture_output=True, check=True, timeout=40).stdout


def visible(text):
    adb('shell', 'uiautomator', 'dump', '--compressed', '/sdcard/arena-fingers.xml')
    root = ET.fromstring(adb('exec-out', 'cat', '/sdcard/arena-fingers.xml'))
    return any(text in node.get('text', '') for node in root.iter('node'))


def fingers(count, retouch=False):
    cmd = ['shell', 'env', 'CLASSPATH=/data/local/tmp/arena-multitouch.jar',
           'app_process', '/system/bin', 'InjectMultiTouch', str(count)]
    if retouch:
        cmd.append('retouch')
    adb(*cmd)
    time.sleep(2)


assert visible('MOD MENÜ') and visible('By Raiwesy'), 'Initial menu/credit not visible'
fingers(2)
assert visible('MOD MENÜ'), 'Two fingers unexpectedly hid the menu'
fingers(3, retouch=True)
assert not visible('MOD MENÜ') and not visible('By Raiwesy'), 'Three fingers did not hide the menu'
fingers(3)
assert visible('MOD MENÜ') and visible('By Raiwesy'), 'Three fingers did not restore the menu'
print('Real-game multi-touch passed: two fingers ignored, three hide/show, retouch does not double-toggle.')
