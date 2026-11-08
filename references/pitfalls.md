# Pitfalls, each hit once

**Engine**

- `MorphElement` across pages freezes the main thread for 5 ms per descendant before the animation starts: 0.5 s on a toy, 5 s on a real deck. Drive the camera in the page instead (ADR 0001).
- A card that appears at 70 % of the flight hides the scene before anyone saw it. Wait for landing plus a hold (ADR 0002).
- A close-up camera wider than its plate shows the magnified base picture around the plate: blurry, misaligned, read as a shadow or a ghost hand. Keep the view inside the plate.
- A plate that fades in while the camera is still wide shows as a rectangle with a soft edge. Start the fade at 70 % of the flight and give it 900 ms.
- A plate whose head is bigger than the painted one makes a visible double head during the crossfade. Shrink the plate until the heads match.
- A screenshot mapped to the outer edge of a painted bezel spills over the frame. Measure the inner edge at 3× with a grid.
- A camera near the picture's edge shows the page background colour as a strip. Check `x ± w/2` against the world size for every view.

**Rendering cost**

- SVG keyframe animations inside the world layer repaint it every frame even at opacity 0. Attach the class only while visible.
- An opacity-0 `backdrop-filter` overlay still costs a blur pass per frame. `visibility: hidden` after the fade.
- `will-change: transform` left on after landing keeps text slightly soft. Drop it once settled.
- Playwright screenshots cost ~300 ms each and look like jank in a probe. Measure without screenshots.

**Art**

- Generated scenes add phones, logos and extra people unless the prompt forbids them. Keep a forbidden list and check every candidate against it.
- "Medium shot of the same characters" prompts come back as wide shots. Crop the 4K base instead.
- Anchors estimated on a downscaled view are 20–40 px off. Use the grid script.

**Recording**

- Playwright's bundled ffmpeg (build 1013) has no VP8 encoder; `recordVideo` fails silently and leaves no file. Point the cached `ffmpeg-mac` at a Homebrew ffmpeg with libvpx.
- Several videos on the speaker's phone cause confused notes. Name them v1, v2, … and say which one is current.

**Content**

- Technical nouns on cards (PCM16, WebSocket, interim, queue) lose half the room. Say what the thing does: small packets, a draft, a bucket.
- Twenty-two shots in twenty minutes leaves no buffer. Count characters in the notes (about 200 Mandarin characters a minute on stage) and plan for questions.
- Things the speaker does not want shown (a device, a vendor switch, a feature) must be written down as rules; they come back through notes, footers and kickers otherwise.

**Presenting**

- `dist/index.html` over `file://` does not load. Serve it.
- The presenter window syncs through `BroadcastChannel`; a different browser profile shows "not linked".
