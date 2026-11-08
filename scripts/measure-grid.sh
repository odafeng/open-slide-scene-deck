#!/usr/bin/env bash
# Crop a region of a picture, draw a coordinate grid aligned to picture pixels, scale it up, save a PNG.
# usage: measure-grid.sh picture.jpg X Y W H out.png [GRID=100] [SCALE=1]
# Thin lines every GRID px, thick lines every 5*GRID px, both aligned to multiples of GRID in picture coordinates,
# so a line's picture coordinate is X + (its position in the crop) and you can count from the crop origin.
set -euo pipefail
if [ $# -lt 6 ]; then
  sed -n '2,5p' "$0"
  exit 2
fi
img=$1 x=$2 y=$3 w=$4 h=$5 out=$6 grid=${7:-100} scale=${8:-1}
big=$((grid * 5))
# offsets so the first line falls on a multiple of grid / big in picture coordinates
ox=$(( (grid - x % grid) % grid )); oy=$(( (grid - y % grid) % grid ))
bx=$(( (big - x % big) % big ));   by=$(( (big - y % big) % big ))
ffmpeg -v error -y -i "$img" \
  -vf "crop=${w}:${h}:${x}:${y},drawgrid=x=${ox}:y=${oy}:w=${grid}:h=${grid}:t=1:c=red@0.45,drawgrid=x=${bx}:y=${by}:w=${big}:h=${big}:t=1:c=blue@0.9,scale=iw*${scale}:ih*${scale}:flags=neighbor" \
  "$out"
echo "wrote $out: crop origin (${x},${y}), thin grid ${grid} px, thick grid ${big} px, scale ${scale}x"
