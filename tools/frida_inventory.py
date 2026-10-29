#!/usr/bin/env python3
"""Collect a bounded, read-only Frida runtime inventory."""
import json
import sys
import threading
import frida

pid, source = int(sys.argv[1]), sys.argv[2]
done = threading.Event()
device = frida.get_device_manager().add_remote_device('127.0.0.1:27042')
session = device.attach(pid)
script = session.create_script(open(source, encoding='utf-8').read())

def message(msg, data):
    print(json.dumps(msg, ensure_ascii=True), flush=True)
    if msg.get('type') == 'error' or msg.get('payload', {}).get('type') in ('done', 'error'):
        done.set()

script.on('message', message)
script.load()
done.wait(30)
script.unload()
session.detach()
