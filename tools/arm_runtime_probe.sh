#!/usr/bin/env bash
# Probe a disposable ARM Android container; no game files are downloaded here.
set -u
out="$GITHUB_WORKSPACE/analysis/arm-runtime-probe.txt"
mkdir -p "$(dirname "$out")"
{
  echo 'Architecture:'
  uname -m
  echo 'Kernel binder support:'
  grep -E 'binder' /proc/filesystems || true
  ls -l /dev/binder* /dev/ashmem 2>&1 || true
  sudo modprobe binder_linux devices=binder,hwbinder,vndbinder 2>&1 || true
  ls -l /dev/binder* /dev/ashmem 2>&1 || true
  echo 'Docker:'
  docker version --format '{{.Server.Version}}' 2>&1 || exit 0
  echo 'Pull Android container:'
  if ! timeout 420 docker pull redroid/redroid:13.0.0-latest; then
    echo 'Container pull failed'; exit 0
  fi
  echo 'Start Android container:'
  if ! docker run -d --name android-probe --privileged -p 5555:5555 redroid/redroid:13.0.0-latest androidboot.redroid_gpu_mode=guest; then
    echo 'Container start failed'; exit 0
  fi
  trap 'docker rm -f android-probe >/dev/null 2>&1 || true' EXIT
  sleep 30
  echo 'Container state:'
  docker inspect -f '{{.State.Status}} {{.State.ExitCode}}' android-probe
  echo 'Android boot property:'
  docker exec android-probe getprop sys.boot_completed 2>&1 || true
  echo 'Android ABI:'
  docker exec android-probe getprop ro.product.cpu.abilist 2>&1 || true
  echo 'Kernel/device diagnostics:'
  docker logs --tail 50 android-probe 2>&1 || true
} > "$out" 2>&1
