#!/usr/bin/env bash
# Disposable emulator probe; intentionally never uploads the game package.
set -u
out="$GITHUB_WORKSPACE/analysis/emulator-probe.txt"
mkdir -p "$(dirname "$out")" "$RUNNER_TEMP/parts"
{
  echo 'Emulator ABI:'
  adb shell getprop ro.product.cpu.abilist
  echo 'APK splits:'
  echo "Test splits are re-signed, and libnesec-x86.so is replaced by the ARM64 libnesec.so."
  echo 'Install result:'
  adb install-multiple --no-incremental -r "$RUNNER_TEMP"/signed/*.apk
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
    echo 'Native crash diagnostics:'
    adb logcat -d -v brief | grep -E '^F/DEBUG|^F/libc|Abort message|Check failed|^E/AndroidRuntime' | tail -100 || true
    echo 'Screenshot OCR (if available):'
    if command -v tesseract >/dev/null; then
      adb shell screencap -p /sdcard/probe.png && adb pull /sdcard/probe.png "$RUNNER_TEMP/probe.png" >/dev/null 2>&1 && tesseract "$RUNNER_TEMP/probe.png" stdout 2>/dev/null || true
    fi
    echo 'Relevant diagnostic log:'
    adb logcat -d -v brief | grep -E 'FATAL EXCEPTION|Fatal signal|com\.block\.juggle|INSTALL_FAILED|UnsatisfiedLinkError|Native bridge|native bridge' | tail -80 || true
  fi
} > "$out" 2>&1
