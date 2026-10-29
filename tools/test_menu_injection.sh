#!/usr/bin/env bash
# Experimental packaging and smoke test using the verified GitHub source release.
# This is not a finished mod and produces no artifact.
set -euo pipefail
work="$RUNNER_TEMP/menu-injection"
mkdir -p "$work/splits" "$work/classes" "$work/dex" "$work/output"
unzip -j -q "$RUNNER_TEMP/source.xapk" '*.apk' -d "$work/splits"
echo 'Patch the binary manifest without rebuilding game resources:'
curl -fsSL https://github.com/REAndroid/APKEditor/releases/download/V1.4.9/APKEditor-1.4.9.jar -o "$work/apkeditor.jar"
unzip -p "$work/splits/com.block.juggle.apk" AndroidManifest.xml > "$work/original-manifest.xml"
javac -cp "$work/apkeditor.jar" -d "$work" tools/InjectBinaryManifest.java
java -cp "$work/apkeditor.jar:$work" InjectBinaryManifest "$work/original-manifest.xml" "$work/AndroidManifest.xml"
cp "$work/splits/com.block.juggle.apk" "$work/base-rebuilt.apk"
zip -q -d "$work/base-rebuilt.apk" AndroidManifest.xml
(cd "$work" && zip -q "$work/base-rebuilt.apk" AndroidManifest.xml)
mkdir -p "$work/assets"
cp menu/src/main/assets/arena_score_hook.js "$work/assets/arena_score_hook.js"
(cd "$work" && zip -q "$work/base-rebuilt.apk" assets/arena_score_hook.js)
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
echo 'Merge the signed splits into an experimental standalone ARM64 APK:'
java -jar "$work/apkeditor.jar" m -i "$work/output" -o "$work/merged.apk" -clean-meta -f
zipalign -f -p 4 "$work/merged.apk" "$work/merged-aligned.apk"
apksigner sign --ks "$work/test.keystore" --ks-pass pass:android --key-pass pass:android --out "$RUNNER_TEMP/BlockBlast-10.9.2-mod-arm64.apk" "$work/merged-aligned.apk"
apksigner verify --verbose "$RUNNER_TEMP/BlockBlast-10.9.2-mod-arm64.apk"
sha256sum "$RUNNER_TEMP/BlockBlast-10.9.2-mod-arm64.apk"
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
echo 'Install experimental standalone APK:'
timeout 120 adb install --no-incremental -r "$RUNNER_TEMP/BlockBlast-10.9.2-mod-arm64.apk"
adb logcat -c
adb shell am start -n com.block.juggle/org.cocos2dx.javascript.AppActivity.Default || true
sleep 75
echo "pid=$(adb shell pidof com.block.juggle | tr -d '\r')"
echo 'Bootstrap and crash logs:'
adb logcat -d -v brief | grep -E 'ArenaMenuBootstrap|ArenaScoreBridge|ArenaScoreHook|AndroidRuntime|F/libc|Force finishing|Process com.block.juggle' | tail -100 || true
adb shell screencap -p /sdcard/menu.png && adb pull /sdcard/menu.png "$work/menu.png" >/dev/null
echo 'Screen text:'
tesseract "$work/menu.png" stdout 2>/dev/null || true
if ! adb logcat -d -s ArenaMenuBootstrap:I '*:S' | grep -q 'Menu attached'; then
  echo 'Bootstrap attachment was not observed.'
  exit 1
fi
if ! adb logcat -d -s ArenaScoreHook:I '*:S' | grep -q 'installed'; then
  echo 'Score hook was not installed.'
  exit 1
fi
echo 'Testing the menu selections and score awards on the disposable game:'
python3 tools/test_game_score.py # exercise real game choices and restart
echo 'In-game score multiplier test passed.'
