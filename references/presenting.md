# Presenting

The deck is a web page. It plays in Chrome from a static build; it does not need the dev server, the network, or PowerPoint.

## On the day

`scripts/present.command` (double-click on macOS, or run it with the slide id as the first argument) does, in order:

1. `npm run build` in the open-slide project.
2. `npm run preview`, which serves `dist/` at `http://localhost:4173/` with SPA routing.
3. Opens two Chrome tabs: the deck at `/s/<slide-id>` and the presenter at `/s/<slide-id>/presenter`.

Drag the deck tab to the projector display and press `F`. Keep the presenter tab on the laptop: it shows the current page, the next page, the speaker notes and a timer, and it follows the deck through a `BroadcastChannel`, so both tabs must be in the same Chrome profile. Keep the terminal window open; closing it stops the server.

Keys in play mode: `→` / Space / PgDn next, `←` / PgUp previous, `Home` / `End`, `1–9` + Enter jump, `O` overview, `B` black, `W` white, `L` laser, `P` presenter window, `?` help, `Esc` exit.

Fonts in the template are system fonts (Iowan Old Style / Songti TC / PingFang TC on macOS). If you change them to webfonts, the venue needs network or you need to self-host.

Do not open `dist/index.html` directly; module scripts do not load over `file://`.

## Projector test

Two days before, on the speaker's own laptop, through the venue's projector or one of the same resolution:

- Run the launcher from a cold start and time it.
- Walk every shot. Check text size on the side cards from the back of the room, and that the blurred scene does not band on the projector.
- Check the laptop keeps 60 fps with the projector attached. Integrated GPUs driving two displays can drop the blur overlay to 30 fps; reduce the blur radius or the picture size if it does.

## Fallbacks

- The walkthrough mp4 on the phone and on a USB stick. It plays anywhere, with no stepping.
- Per-shot clips: split the walkthrough at each key press into one mp4 per shot and drop them into PowerPoint, one per slide, set to play on entry and stop on the last frame. The audience sees the same camera moves; the speaker loses the ability to step back or change text.
- `impress.js` could host the same camera model in a day, but its 3D-transformed text goes soft and the project has not been maintained in years. Keynote Magic Move rebuilds by hand. Neither was needed.
