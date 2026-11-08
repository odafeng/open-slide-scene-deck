#!/bin/zsh
# Presentation launcher for an open-slide project: build, serve dist/, open the deck and the presenter window.
# usage: present.command [slide-id] [project-dir]
#   Put a copy next to your open-slide project and double-click it on macOS, or run it from a terminal.
#   Closing this terminal window stops the server.
SLIDE=${1:-${SLIDE_ID:-}}
PROJECT=${2:-${PROJECT_DIR:-$(dirname "$0")/source}}
if [[ -z "$SLIDE" ]]; then
  echo "usage: present.command <slide-id> [project-dir]   (or set SLIDE_ID)"; exit 2
fi
cd "$PROJECT" || { echo "no project at $PROJECT"; exit 1; }
echo "building…"
npm run build >/tmp/open-slide-build.log 2>&1 || { echo "build failed, see /tmp/open-slide-build.log"; exit 1; }
npm run preview >/tmp/open-slide-preview.log 2>&1 &
for i in {1..40}; do curl -s -o /dev/null http://localhost:4173/ && break; sleep 0.5; done
DECK="http://localhost:4173/s/$SLIDE"
if [[ -z "$NO_OPEN" ]]; then
  open -a "Google Chrome" "$DECK/presenter"
  sleep 1
  open -a "Google Chrome" "$DECK"
fi
echo
echo "deck:      $DECK            (drag to the projector display, press F)"
echo "presenter: $DECK/presenter  (keep on the laptop: notes, timer, next page)"
echo "keys: → / Space next · ← prev · B black · O overview · P presenter · ? help · Esc exit"
echo "keep this window open; closing it stops the server."
wait
