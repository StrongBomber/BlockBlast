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
  echo 'Errors:'
  adb logcat -d -v brief | grep -E '^E/AndroidRuntime|^F/libc|Abort message|UnsatisfiedLinkError|Process com.block.juggle|Displayed com.block.juggle|Start proc .*block.juggle|com.netease.nis|Force finishing'  | tail -70 || true
  if [ -n "$pid" ]; then
    echo 'Frida inventory:'
    xz -dc "$RUNNER_TEMP/frida-server.xz" > "$RUNNER_TEMP/frida-server"
    adb push "$RUNNER_TEMP/frida-server" /data/local/tmp/frida-server >/dev/null
    adb shell chmod 755 /data/local/tmp/frida-server
    adb shell /data/local/tmp/frida-server -D -l 0.0.0.0:27042
    sleep 4
    "$RUNNER_TEMP/frida-venv/bin/python" tools/frida_inventory.py "$pid" tools/frida_inventory.js || true
  fi
} > "$out" 2>&1
