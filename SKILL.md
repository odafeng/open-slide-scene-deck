---
name: open-slide-scene-deck
description: Build a Prezi-style "one picture, one camera" talk deck in open-slide. Covers storyboarding the stations, generating a 4K scene with Gemini, driving the camera inside the page (van Wijk zoom paths, bezier rides, a beat of hold before each card), checking smoothness with Playwright, recording a walkthrough for phone review, and presenting with a launcher. Use when someone wants a zooming or panning presentation, a Prezi-like deck, a cinematic slide deck, or a camera that flies through an illustration instead of flipping pages.
---

# Scene deck: one picture, one camera

A scene deck is a talk that lives inside a single illustration. Every page is a camera position over the same picture. The camera pushes into a detail, rides along a drawn path to the next object, jumps across the room, and pulls back to the wide shot at the end. The words sit on cards drawn in screen space, and they arrive a beat after the camera lands, so the audience sees the place before they read about it.

This skill is the method that produced a 22-shot, 20-minute conference talk in `@open-slide/core` 2.2. open-slide has no camera API, so the camera is driven inside the page component. `template/index.tsx` is the whole engine plus seven example shots; copy it and replace the scene, the anchors and the cards.

## When to reach for it

- The talk has a place: a classroom, an operating room, a factory floor, a city block. Objects in that place map onto the stations of the story.
- The speaker wants the Prezi feel (zoom in to talk, pull out to see the whole, glide to the next spot) without Prezi.
- 15 to 25 shots. Fewer and a normal deck is fine; more and the camera moves become wallpaper.

Do not use it for data-heavy decks, live demos, or anything that needs to be edited by someone else in PowerPoint. It is a web page; it plays in Chrome.

## The work, in order

1. **Storyboard first.** One scene, a list of stations, one camera position and one card per station, and a list of the real material you still need (screenshots, logs, photos). Write it down before any art or code. `references/storyboard.md` has the table and the questions to settle with the speaker.
2. **Make the scene.** Generate three style candidates of the wide shot, let the speaker pick, then fix the picture with image-to-image edits (remove objects, add the one thing the story needs, leave the screen blank). Generate close-up plates only where the camera gets within a few hundred world pixels. `references/art.md`.
3. **Measure the anchors with a grid**, never by eye on a wide shot. `scripts/measure-grid.sh` crops a region of the picture with a 100 px grid; use a 3× corner crop for anything a screenshot has to fit inside. `references/art.md`.
4. **Build the deck from the template.** Add a `ViewKey`, a `VIEWS` entry (camera, HUD mode, blur, hold), a `HudBody` case, a page, a note. The engine does not change. `references/engine.md` explains every knob.
5. **Verify, don't eyeball.** Run `scripts/perf-probe.cjs` in headed Chrome: zero long tasks and no frame gap over 50 ms across all page changes is the bar. Measure without taking screenshots; screenshots cost 300 ms each and look like jank. `references/verification.md`.
6. **Record a walkthrough and watch it on a phone.** `scripts/record-walkthrough.cjs` plays the deck with per-shot dwell and records it; convert to mp4 and send it to the speaker's phone. Every round of feedback in the original project came from this loop, not from the browser.
7. **Present from a build.** `scripts/present.command` builds, serves `dist/`, and opens the deck and the presenter window (notes, timer, next page). Test on the venue projector with the speaker's own laptop. `references/presenting.md`.

## Rules that were paid for

- Hold the scene before the card. The card waits until the camera has landed plus `hold` ms (default 1 s). A card that pops at 70 % of the flight turns the scene into a desktop background.
- A close-up camera must sit inside its plate. If the view is wider than the plate, the magnified base picture bleeds in around it and reads as a shadow or a ghost hand.
- Screenshots go on painted screens through a homography, mapped to the inner edge of the bezel. Measure the four corners at 3×.
- Long jumps need no intermediate page. The van Wijk path pulls up and dives on its own; put the far stations at the far ends of the picture and let it fly.
- Plain language on the cards. The picture is doing half the talking; the card gets one idea and at most four lines.
- Never use `MorphElement` for this. It copies computed styles of every descendant on the main thread before the animation starts; a real deck froze for five seconds. See `docs/adr/0001-drive-the-camera-in-page.md`.

## What is in this folder

| Path | What it is |
| --- | --- |
| `template/index.tsx` | The engine and seven example shots. Copy into `slides/<id>/index.tsx`. |
| `template/assets/` | Example scene (2752 × 1536), close-up plate, app screenshot. Replace them. |
| `references/engine.md` | How the camera, HUD, hold, plates and perspective screen work; how to add a shot. |
| `references/storyboard.md` | The storyboard table and the decisions to make before art. |
| `references/art.md` | Prompting the scene, fixing it, measuring anchors, plates. |
| `references/verification.md` | Performance probe, walkthrough recording, phone review loop. |
| `references/presenting.md` | Build, preview, presenter window, launcher, fallbacks. |
| `references/pitfalls.md` | Everything that went wrong once, so it does not go wrong twice. |
| `scripts/` | `perf-probe.cjs`, `record-walkthrough.cjs`, `measure-grid.sh`, `genimg.py`, `genedit.py`, `present.command`. |
| `docs/adr/` | Why the camera lives in the page, why the HUD waits. |

## Working with the speaker

Decide with them, in this order: the story order of the stations; whether far jumps should go via the wide shot (they do, automatically); which real material they will supply and when; the art style (show three, pick one); what must not appear in the picture. Write each decision into the storyboard with a date. Then build the whole deck, record it, and send the video. Expect three or four rounds of notes that each touch five shots.
