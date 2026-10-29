#!/usr/bin/env bash
# Fetch the user-authorized, unmodified source archive from the GitHub release.
set -euo pipefail
if [ "$#" -ne 1 ]; then
  echo "Usage: $0 destination.xapk" >&2
  exit 2
fi
expected=b4e19afccd7fea17a7c6e8cea8e91747f4f242cbd62b1539c8d196dab66be503
url=https://github.com/StrongBomber/BlockBlast/releases/download/blockblast-source-10.9.2/BlockBlast-10.9.2-source.xapk
dest=$1
mkdir -p "$(dirname "$dest")"
tmp=$(mktemp "${dest}.partial.XXXXXXXX")
trap 'rm -f "$tmp"' EXIT
curl --fail --location --silent --show-error --retry 3 --output "$tmp" "$url"
printf '%s  %s\n' "$expected" "$tmp" | sha256sum --check --status || {
  echo 'Source archive SHA-256 mismatch; refusing to use it.' >&2
  exit 1
}
mv -f "$tmp" "$dest"
echo "Verified GitHub source archive: SHA-256 $expected"
