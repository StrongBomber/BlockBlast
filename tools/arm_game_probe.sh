#!/usr/bin/env bash
# Test the unmodified game on a disposable ARM64 Android instance.
set -u
out="$GITHUB_WORKSPACE/analysis/arm-game-probe.txt"
mkdir -p "$(dirname "$out")" "$RUNNER_TEMP/game-splits"
{
  echo 'Boot native ARM64 Android container:'
  sudo modprobe binder_linux devices=binder,hwbinder,vndbinder 2>&1 || true
  docker pull redroid/redroid:13.0.0-latest >/dev/null || exit 0
  docker run -d --name android-game --privileged -p 5555:5555 -p 27042:27042 redroid/redroid:13.0.0-latest androidboot.redroid_gpu_mode=guest || exit 0
  trap 'docker rm -f android-game >/dev/null 2>&1 || true' EXIT
  sleep 35
  adb connect 127.0.0.1:5555
  export ANDROID_SERIAL=127.0.0.1:5555
  timeout 120 adb wait-for-device || exit 0
  echo "boot=$(adb shell getprop sys.boot_completed | tr -d '\r')"
  echo "abi=$(adb shell getprop ro.product.cpu.abilist | tr -d '\r')"
  echo 'Extracting split APKs for this test only.'
  unzip -j -q "$RUNNER_TEMP/source.xapk" '*.apk' -d "$RUNNER_TEMP/game-splits" || exit 0
  echo 'Install original split APKs:'
  adb install-multiple --no-incremental -r "$RUNNER_TEMP"/game-splits/*.apk
  rc=$?
  echo "install_exit=$rc"
  [ "$rc" -eq 0 ] || exit 0
  # Disable the Android system's immersive-mode tutorial in the disposable device.
  adb shell settings put secure immersive_mode_confirmations confirmed || true
  adb logcat -c
  echo 'Resolve launch activity:'
  adb shell cmd package resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.LAUNCHER com.block.juggle
  echo 'Launch:'
  timeout 30 adb shell am start -n com.block.juggle/org.cocos2dx.javascript.AppActivity.Default || true
  sleep 70
  pid=$(adb shell pidof com.block.juggle | tr -d '\r' | awk '{print $1}')
  echo "game_pid=$pid"
  echo 'Resumed activity:'
  adb shell dumpsys activity activities | grep -E 'mResumedActivity|topResumedActivity' | head -5 || true
  echo 'Screen text (OCR):'
  timeout 15 adb shell screencap -p /sdcard/probe.png && timeout 15 adb pull /sdcard/probe.png "$RUNNER_TEMP/probe.png" >/dev/null 2>&1 && timeout 20 tesseract "$RUNNER_TEMP/probe.png" stdout 2>/dev/null || true
  if [ "${USER_APPROVED_TERMS:-0}" = 1 ] && [ -f "$RUNNER_TEMP/probe.png" ]; then
    echo 'Test user explicitly approved accepting the displayed terms.'
    # Android's full-screen education overlay can cover the terms dialog.
    if coords=$(python3 tools/find_terms_button.py "$RUNNER_TEMP/probe.png" GOT IT 2>/dev/null); then
      echo 'Dismissing Android fullscreen hint.'
      read -r x y <<< "$coords"; adb shell input tap "$x" "$y"; sleep 3
      adb shell screencap -p /sdcard/probe.png && adb pull /sdcard/probe.png "$RUNNER_TEMP/probe.png" >/dev/null 2>&1 || true
    fi
    if coords=$(python3 tools/find_terms_button.py "$RUNNER_TEMP/probe.png"); then
      echo "Confirmed terms button at: $coords"
      read -r x y <<< "$coords"; adb shell input tap "$x" "$y"
      sleep 5
      timeout 15 adb shell screencap -p /sdcard/after.png && timeout 15 adb pull /sdcard/after.png "$RUNNER_TEMP/after.png" >/dev/null 2>&1 || true
      # If the first tap summoned the Android hint, dismiss it, re-identify the
      # exact terms button, and only then perform the user-authorized tap.
      if coords=$(python3 tools/find_terms_button.py "$RUNNER_TEMP/after.png" GOT IT 2>/dev/null); then
        echo 'Dismissing Android fullscreen hint and retrying authorized tap.'
        read -r x y <<< "$coords"; adb shell input tap "$x" "$y"; sleep 3
        adb shell screencap -p /sdcard/probe.png && adb pull /sdcard/probe.png "$RUNNER_TEMP/probe.png" >/dev/null 2>&1 || true
        if coords=$(python3 tools/find_terms_button.py "$RUNNER_TEMP/probe.png"); then
          read -r x y <<< "$coords"; adb shell input tap "$x" "$y"
        else
          echo 'Terms button not confirmed after dismissing hint; no retry.'
        fi
      fi
      sleep 40
      timeout 15 adb shell screencap -p /sdcard/after.png && timeout 15 adb pull /sdcard/after.png "$RUNNER_TEMP/after.png" >/dev/null 2>&1 || true
      if [ -f "$RUNNER_TEMP/after.png" ]; then
        echo 'Screen text after terms:'
        tesseract "$RUNNER_TEMP/after.png" stdout 2>/dev/null || true
        python3 - "$RUNNER_TEMP/after.png" "$GITHUB_WORKSPACE/analysis/screen-capture.txt" <<'PYSCREEN'
import base64, io, sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
im.thumbnail((360, 800))
b = io.BytesIO()
im.save(b, format='JPEG', quality=65)
open(sys.argv[2], 'w').write(base64.b64encode(b.getvalue()).decode() + '\n')
PYSCREEN
      fi
    else
      echo 'Terms button not located; no tap performed.'
    fi
  fi
  echo 'Errors:' 
  adb logcat -d -v brief | grep -E '^E/AndroidRuntime|^F/libc|Abort message|UnsatisfiedLinkError|Process com.block.juggle|Displayed com.block.juggle|Start proc .*block.juggle|com.netease.nis|Force finishing'  | tail -70 || true
  if [ -n "$pid" ]; then
    echo 'Frida inventory:'
    echo 'Preparing server'
    xz -dc "$RUNNER_TEMP/frida-server.xz" > "$RUNNER_TEMP/frida-server"
    docker cp "$RUNNER_TEMP/frida-server" android-game:/data/local/tmp/frida-server
    docker exec android-game chmod 755 /data/local/tmp/frida-server
    echo 'Starting server'
    docker exec -d android-game /data/local/tmp/frida-server -l 0.0.0.0:27042
    sleep 5
    echo 'Attaching runtime inventory'
    timeout 45 "$RUNNER_TEMP/frida-venv/bin/python" tools/frida_inventory.py "$pid" tools/frida_inventory.js || echo 'Runtime inventory failed or timed out'
    echo 'JavaScript global probe:'
    timeout 15 adb logcat -d -s ArenaJS:I '*:S' | tail -100 || true

  fi
} > "$out" 2>&1
