#!/usr/bin/env bash
# Disposable emulator probe; intentionally never uploads the game package.
set -u
out="$GITHUB_WORKSPACE/analysis/emulator-probe.txt"
mkdir -p "$(dirname "$out")" "$RUNNER_TEMP/parts"
{
  echo 'Emulator ABI:'
  adb shell getprop ro.product.cpu.abilist
  echo 'APK splits:'
  unzip -j -q "$RUNNER_TEMP/source.xapk" '*.apk' -d "$RUNNER_TEMP/parts"
  echo 'Install result:'
  adb install-multiple -r "$RUNNER_TEMP"/parts/*.apk
  status=$?
  echo "install_exit=$status"
  if [ "$status" -eq 0 ]; then
    echo 'Launch result:'
    adb logcat -c
    adb shell monkey -p com.block.juggle -c android.intent.category.LAUNCHER 1
    sleep 60
    echo 'Process:'
    adb shell pidof com.block.juggle || true
    echo 'Resumed activity:'
    adb shell dumpsys activity activities | grep -E 'mResumedActivity|topResumedActivity' | head -5 || true
    echo 'Relevant diagnostic log:'
    adb logcat -d -v brief | grep -E 'FATAL EXCEPTION|Fatal signal|com\.block\.juggle|INSTALL_FAILED|UnsatisfiedLinkError|Native bridge|native bridge' | tail -80 || true
  fi
} > "$out" 2>&1
