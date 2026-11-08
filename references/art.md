# Art: the scene, the plates, the anchors

## Generating the wide scene

The original deck used Gemini image generation (`gemini-3-pro-image` at 4K, 16:9 → 5504 × 3072). `scripts/genimg.py` sends a prompt on stdin and saves the image; `scripts/genedit.py` does image-to-image with one or more reference images. Both read `GEMINI_API_KEY` from the environment and never write it anywhere. Image models return 429 with `limit: 0` on a free-tier key; billing has to be on.

Make three candidates of the same prompt in three styles and let the speaker choose. The ones that worked: flat vector, paper-cut with risograph grain, soft clay 3D. Clay 3D won because it survives a 3× zoom without looking like a photo that ran out of pixels.

Prompt skeleton that produced a usable room:

- the place, the viewpoint (from the back-left of the room, slightly elevated), the time of day
- the characters, kept small ("the lecturer is a small figure by the whiteboard")
- the objects the stations need, each with an explicit position
- "the laptop screen is blank light grey" (you will put a real screenshot there)
- "large empty wall / sky area on the upper right" (cards need room)
- the forbidden list, stated positively and negatively ("no phones on any desk")
- the style line last

Then fix the picture with edits rather than regenerating: remove an object, add a cloud outside the window, lighten a wall. Use the wide shot as the reference image. Expect "medium shot of the same characters" prompts to come back as wide shots; crop the 4K base instead when you only need a medium shot.

## Close-up plates

Only where the camera will be within a few hundred world pixels of a subject. Prompt with the wide shot as reference for character consistency, ask for the pose you need (mouth open, mid-sentence), and ask for empty space on the side a path will leave from. Place the plate so its anchor (the mouth) lands on the painted anchor, scaled so the head sizes match; then set the close-up camera inside the plate. See `references/engine.md`.

## Measuring anchors

Coordinates are in picture pixels (the world is the picture). Never estimate them on a downscaled view; two of the first deck's anchors were 30 px off and one screenshot spilled over the laptop bezel.

`scripts/measure-grid.sh picture.jpg X Y W H out.png [GRID] [SCALE]` crops the region, draws a grid (thin lines every GRID px, thick every 5·GRID, aligned to multiples of GRID in picture coordinates), scales it up, and writes a PNG you can read with the image viewer. Two passes:

1. A 1× crop of the whole object with a 100 px grid, to find the rough corners.
2. A 3× crop of each corner with a 10 / 50 px grid, to place it within a few pixels.

Record every measured anchor in the deck file with a comment saying what it is. For a painted screen, measure the inner edge of the bezel, clockwise from the top-left, and keep the screenshot's aspect ratio in mind when choosing the flat rectangle it unfolds into.

## Sizes

- Base picture: 4K (5504 × 3072 from Gemini) is enough for a 3× push on a 1080p projector. Serve it as JPEG at quality ~85; a 6 MB file loaded fine.
- Plates: 2K is enough.
- Screenshots: at least 1920 px wide at the zoom level where the camera sits inside the screen.

## Checking the picture before building

Open the wide shot at 100 % and walk the storyboard with a finger: is each station where the camera can frame it without leaving the picture? Is there empty space where the center cards will blur the scene? Is anything on the forbidden list still visible? Fix it now; every later shot inherits the picture.
