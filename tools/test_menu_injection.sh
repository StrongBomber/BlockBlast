#!/usr/bin/env bash
# Experimental packaging and smoke test; not a finished mod and produces no artifact.
set -euo pipefail
work="$RUNNER_TEMP/menu-injection"
mkdir -p "$work/splits" "$work/classes" "$work/dex" "$work/output"
unzip -j -q "$RUNNER_TEMP/source.xapk" '*.apk' -d "$work/splits"
curl -fsSL https://github.com/iBotPeaches/Apktool/releases/download/v2.11.1/apktool_2.11.1.jar -o "$work/apktool.jar"
echo 'Decode base APK resources and manifest, retaining original dex:'
java -jar "$work/apktool.jar" d -f -s "$work/splits/com.block.juggle.apk" -o "$work/decoded"
python3 tools/inject_menu_manifest.py "$work/decoded/AndroidManifest.xml"
echo 'Rebuild with experimental lifecycle provider declaration:'
java -jar "$work/apktool.jar" b "$work/decoded" -o "$work/base-rebuilt.apk"
echo 'Compile experimental menu dex:'
curl -fsSL https://github.com/Sable/android-platforms/raw/master/android-35/android.jar -o "$work/android.jar"
curl -fsSL https://storage.googleapis.com/r8-releases/raw/8.5.35/r8.jar -o "$work/r8.jar"
javac --release 8 -cp "$work/android.jar" -d "$work/classes" $(find menu/src/main/java -name '*.java')
java -cp "$work/r8.jar" com.android.tools.r8.D8 --min-api 23 --lib "$work/android.jar" --output "$work/dex" $(find "$work/classes" -name '*.class')
python3 - "$work/base-rebuilt.apk" "$work/dex/classes.dex" <<'PY'
import re, sys, zipfile
apk, dex = sys.argv[1:]
with zipfile.ZipFile(apk, 'a', allowZip64=True) as z:
    numbers = [1 if n == 'classes.dex' else int(m.group(1)) for n in z.namelist()
               if n == 'classes.dex' or (m := re.fullmatch(r'classes(\d+)\.dex', n))]
    name = f'classes{max(numbers, default=1)+1}.dex'
    if name in z.namelist(): raise SystemExit('Duplicate dex')
    print('Adding', name)
    z.write(dex, name)
PY
keytool -genkeypair -keystore "$work/test.keystore" -storepass android -keypass android -alias test -dname 'CN=Disposable Test' -keyalg RSA -keysize 2048 -validity 2 >/dev/null 2>&1
zipalign -f -p 4 "$work/base-rebuilt.apk" "$work/base-aligned.apk"
apksigner sign --ks "$work/test.keystore" --ks-pass pass:android --key-pass pass:android --out "$work/output/com.block.juggle.apk" "$work/base-aligned.apk"
for apk in "$work"/splits/*.apk; do
  [ "$(basename "$apk")" = 'com.block.juggle.apk' ] && continue
  apksigner sign --ks "$work/test.keystore" --ks-pass pass:android --key-pass pass:android --out "$work/output/$(basename "$apk")" "$apk"
done
echo 'Boot disposable ARM64 Android:'
sudo modprobe binder_linux devices=binder,hwbinder,vndbinder || true
docker pull redroid/redroid:13.0.0-latest >/dev/null
docker run -d --name android-menu-injection --privileged -p 5555:5555 redroid/redroid:13.0.0-latest androidboot.redroid_gpu_mode=guest
trap 'docker rm -f android-menu-injection >/dev/null 2>&1 || true' EXIT
sleep 35
adb connect 127.0.0.1:5555
export ANDROID_SERIAL=127.0.0.1:5555
timeout 120 adb wait-for-device
adb shell settings put secure immersive_mode_confirmations confirmed || true
echo 'Install experimental patched split APKs:'
timeout 120 adb install-multiple --no-incremental -r "$work"/output/*.apk
adb logcat -c
adb shell am start -n com.block.juggle/org.cocos2dx.javascript.AppActivity.Default || true
sleep 75
echo "pid=$(adb shell pidof com.block.juggle | tr -d '\r')"
echo 'Bootstrap and crash logs:'
adb logcat -d -v brief | grep -E 'ArenaMenuBootstrap|AndroidRuntime|F/libc|Force finishing|Process com.block.juggle' | tail -100 || true
adb shell screencap -p /sdcard/menu.png && adb pull /sdcard/menu.png "$work/menu.png" >/dev/null
echo 'Screen text:'
tesseract "$work/menu.png" stdout 2>/dev/null || true
if ! adb logcat -d -s ArenaMenuBootstrap:I '*:S' | grep -q 'Menu attached'; then
  echo 'Bootstrap attachment was not observed.'
  exit 1
fi
echo 'Experimental menu bootstrap attached; score hook remains unimplemented.'
