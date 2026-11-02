#!/bin/bash
# Render arc/<name>-light.svg and arc/<name>-dark.svg to PNG via headless Chromium,
# wrapped in a page with GitHub's README surface colours at 2x.
set -e
cd "$(dirname "$0")"
for name in "$@"; do
  for mode in light dark; do
    bg=$([ $mode = dark ] && echo '#0d1117' || echo '#ffffff')
    w=$(grep -o 'width="[0-9]*"' arc/$name-$mode.svg | head -1 | tr -dc 0-9)
    h=$(grep -o 'height="[0-9]*"' arc/$name-$mode.svg | head -1 | tr -dc 0-9)
    cat > arc/_wrap-$name-$mode.html <<HTML
<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:$bg}img{display:block}</style></head>
<body><img src="$name-$mode.svg" width="$w" height="$h"></body></html>
HTML
    chromium-browser --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
      --window-size=$w,$h --screenshot=arc/$name-$mode.png "file://$PWD/arc/_wrap-$name-$mode.html" >/dev/null 2>&1
    echo "arc/$name-$mode.png"
  done
done
