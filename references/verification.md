# Verification and review

Two tools, one loop: measure smoothness in a real Chrome, then record the deck and put the video on the speaker's phone.

## Playwright setup

Both scripts take the Playwright module path in `PW` and an optional Chrome binary in `EXE`. With a global `@playwright/cli` install on macOS:

```sh
export PW=/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright
export EXE="$HOME/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
```

Always run headed (`headless: false`). Headless Chrome does not composite the same way, and the whole point is to measure the compositor.

## Performance probe

```sh
node scripts/perf-probe.cjs http://localhost:5174/s/<slide-id> <pages>
```

It presses `F`, then `→` once per page, and for each page change prints long tasks (PerformanceObserver `longtask`) and requestAnimationFrame gaps over 50 ms. The bar for a scene deck is zero long tasks and zero gaps. One 70 ms gap on a page with a backdrop blur is tolerable; anything repeated is a bug.

Do not take screenshots while measuring. A Playwright screenshot costs about 300 ms and shows up as a gap. The first probe of the finished deck looked terrible for this reason alone.

When a probe is bad, the usual suspects are in `references/pitfalls.md`: an SVG animation left running at opacity 0, an opacity-0 backdrop-filter, `will-change` left on after landing, or `MorphElement` anywhere in the tree.

## Frame checks

For a single shot, screenshot it at several moments after the key press and tile them with ffmpeg:

```sh
ffmpeg -i a.png -i b.png -i c.png -i d.png \
  -filter_complex "[0:v]scale=640:-1[a];[1:v]scale=640:-1[b];[2:v]scale=640:-1[c];[3:v]scale=640:-1[d];[a][b][c][d]xstack=inputs=4:layout=0_0|640_0|0_360|640_360[out]" \
  -map "[out]" sheet.png
```

A contact sheet at 700 / 1300 / 1700 / 2100 ms after the press shows whether a plate pops, whether the hold works, and what the exit looks like. To check a screenshot against a painted frame, crop the laptop region of a landed frame and scale it 2×.

## Walkthrough recording

```sh
node scripts/record-walkthrough.cjs http://localhost:5174/s/<slide-id> <pages> out/
ffmpeg -i out/*.webm -c:v libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart walkthrough.mp4
```

The script records the viewport with Playwright's `recordVideo`, pressing `→` per page with a dwell that defaults to 5.5 s and can be set per page through `DWELL_JSON='{"1":3500,"8":8500}'`. Twenty-two shots come out at about 150 s and 40 MB.

Playwright's bundled ffmpeg may lack the VP8 encoder (the 1013 build does; recording then fails silently with an empty directory). Point `~/Library/Caches/ms-playwright/ffmpeg-<n>/ffmpeg-mac` at a Homebrew ffmpeg that has libvpx, where `<n>` is the version your Playwright asks for in the error message.

## The phone loop

Send the mp4 to the speaker's phone (Taildrop: `tailscale file cp walkthrough.mp4 <device>:`; AirDrop works too). Every useful note on the original deck came from watching the video on a phone, not from the browser: cards arriving too early, a screenshot spilling over a frame, a shadow around a close-up, language too technical. Expect three or four rounds. Name the files v1, v2, … and tell the speaker which one is current; a stale video on the phone causes confused feedback.

After each round: fix, typecheck, build, re-record, re-send, and log the round in the project's status file with the date and what changed.
