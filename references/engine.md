# The engine

Everything above the line `/* The scene */` in `template/index.tsx` is the engine. It has not needed a change since the first real deck. This file explains what it does and which numbers you are allowed to touch.

## The model

- The world is one `<div>` of the picture's pixel size, holding the scene `<img>` and a few overlay layers (a perspective screen, a close-up plate, SVG lines).
- A camera is `{ x, y, w }`: the world point at the centre of the screen and the visible width in world pixels. Height follows from 16:9.
- The camera is applied as one transform on the world div: `translate(960px, 540px) scale(1920 / w) translate(-x, -y)`.
- Each page is a `<Shot view="…">`. When it becomes the active page it animates the world from wherever the camera was to its own camera, then (after a hold) shows its HUD.

## What happens on a page change

1. The new page mounts. `currentCamera()` returns the previous page's camera, or the mid-flight position if the user advanced early (module-level `live` token).
2. `planMove(from, cfg)` returns either a van Wijk zoom path or a ride along a curve, plus a duration.
3. `sampleFrames` turns the path into about one keyframe per 12 ms and hands them to `el.animate()`. The compositor runs it; the main thread is idle.
4. Four flags flip in order: `started` (next frame: previous HUD fades out, overlay layers switch), `arrived` (70 %: close-up plate starts fading in), `settled` (animation finished: `will-change` is dropped so text re-rasterises sharp), `hud` (settled + `hold` ms: blur and card come in).
5. The previous HUD is only faded out if it had actually appeared (`lastHudShown`), so skipping ahead never flashes a card.

`prefers-reduced-motion` turns every flight into a 1 ms snap and the hold into 0.

## Camera paths

**van Wijk–Nuij** (`zoomPath`, ρ = √2). For any pair of cameras it produces the pull-up, glide, dive arc that looks like a real crane. ρ = √2 is calmer than d3's 1.3 default. Duration comes from d3's rule scaled by 1.1 and clamped to 700–1600 ms. A far jump across the picture takes 1.6 s and needs no intermediate page.

**Ride** (`follow: { curve, dur }`). The camera follows a cubic bezier at constant speed (arc-length table), width interpolated exponentially, and the offsets from the curve's endpoints are eased away over the first 30 % and eased in over the last 30 %. Use it when a drawn line in the picture should be the path: a sound wave, a cable, a road. Make the line visible (`waves: 'flow'`) during the ride.

## HUD modes

| mode | where | blur | use for |
| --- | --- | --- | --- |
| `title` | bottom-left | no | cover |
| `caption` | bottom centre pill | no | one sentence over a close-up |
| `side` | right third with a gradient scrim | no | pointing at real UI on screen |
| `center` | middle, on a blurred darkened scene | yes | explanation; the picture becomes context |
| `none` | | | pure camera move |

`hold` is per view: default 1000 ms, side cards 800 ms. Give more (1200–1800 ms) to arrivals the audience has not seen yet or where something in the scene moves (a line flickering, a plate fading in).

Card reveals stagger 80 ms apart through `<R i={n}>`. The card root fades with its children; a card whose box stays while its text fades lingers as an empty rectangle.

## Source code and diagrams on cards

For a developer audience, put the real lines on the card: a small `Code` block (monospace on a darker panel, line numbers that match the repository, keyword and string colours) under the bullets, four lines at most. Build diagrams from divs and flex rows (boxes, brackets, a row of minute blocks, a double-line "pipe" with payload labels), not from images, so they inherit the palette and can be revealed in stages.

Speaker-paced reveals inside a card use open-slide's `<Steps>` / `<Step>`: the always-visible part first, then one `<Step>` per beat. Two rules: hidden steps keep their layout, so design the card at its final height; and the copy of the previous shot's HUD that the engine renders for the fade-out (`out` is true) must be the fully expanded tree **without** `Steps`, otherwise the stale step group steals the next shot's first keypress. Tell the walkthrough recorder how many extra presses a page needs (`STEPS_JSON`).

## Close-up plates

A plate is a separately generated image placed in the world at the scale where its subject matches the painted one, masked with a radial gradient. Rules:

- The plate fades in from `arrived` over 900 ms, so the crossfade hides in the motion, and fades out in 300 ms on exit.
- The close-up camera must sit inside the plate's rectangle, with margin. Otherwise the view shows the magnified base picture around the plate, blurry and misaligned.
- Expect a slight double image during the crossfade when the plate's face differs from the painted one. Shrink the plate until head sizes match; a larger plate looks like a jump.

## Perspective screen

A screenshot sits on the painted laptop through `homography(w, h, quad)`, a hand-solved 8×8 system that returns a CSS `matrix3d`. When the camera enters the screen (`screenFlat: true`) the transform transitions to a plain translate, and Chrome interpolates the matrices into a natural "screen turns to face you" move. Cameras for shots inside the screen are positions inside the flat rectangle, so swapping the screenshot means re-checking those cameras.

Measure the quad at the inner edge of the bezel with a 3× corner crop. The first deck measured the outer edge by eye and the screenshot spilled over the frame.

## Performance rules (all measured)

- SVG keyframe animations inside the world repaint the whole layer every frame even at opacity 0. Attach the animation class only while visible.
- An opacity-0 `backdrop-filter` overlay still costs a blur pass per frame. Set `visibility: hidden` after the fade.
- Drop `will-change: transform` once settled.
- Keep the base picture at 4K at most. One 5504 × 3072 JPEG plus a 2K plate plus a screenshot ran at zero long tasks on an M-series MacBook.

## Adding a shot

1. Add the key to `ViewKey`.
2. Add a `VIEWS` entry: `cam`, optional `follow`, which overlay layers are on, `hud`, `blur`, `hold`.
3. Add a `case` in `HudBody` (or `return null` for a caption or a pure move).
4. Add `const Sxx: Page = () => <Shot view="…" source="…" />` and append it to the default export.
5. Add a speaker note at the same index.
6. Check the camera is inside the picture: `x ± w/2` and `y ± (w · 1080/1920)/2` must stay within the world, or the background colour shows at the edge.

## Knobs you may touch

| knob | where | default | notes |
| --- | --- | --- | --- |
| ρ | `RHO` | √2 | 1.3 is faster and more mechanical |
| duration clamp | `moveDuration` | 700–1600 ms | keep under 1.6 s |
| hold | per view | 1000 / 800 | see above |
| blur | overlay style | 18 px, 55 % dark | |
| plate mask | `Closeup` | 72 % → 100 % | widen the solid part if corners show |
| stagger | `Reveal` | 80 ms | |
