# 2. Hold the landed scene before showing the HUD

Date: 2026-11-08

## Status

Accepted

## Context

The first finished deck revealed each shot's card at 70 % of the camera flight, so the text was already arriving while the camera decelerated. Watching the walkthrough video on a phone, the speaker reported that the scene never registered: by the time the camera landed, the picture was already blurred and covered, so the illustration read as a desktop background rather than the place the talk happens in.

## Decision

The blur overlay and the HUD wait for two things: the WAAPI animation's `finish` event, and then a per-view `hold` (default 1000 ms, 800 ms for side cards, longer where the arrival itself is the point). The close-up plate still starts fading at 70 % so the crossfade hides in the motion. The previous shot's HUD is faded out only if it had actually appeared, tracked by a module-level flag, so advancing early never flashes a card that was never on screen.

## Consequences

- Each shot costs about one extra second; 22 shots add roughly 20 seconds to the talk and the walkthrough video.
- The scene reads first, the card second. The speaker can name what is on screen before the words appear.
- Pressing next during the hold cancels the pending timer; nothing leaks between shots.
- Shots where the camera does not move (same position, different card) still hold, which can feel like a pause. Set `hold: 300` on those.
