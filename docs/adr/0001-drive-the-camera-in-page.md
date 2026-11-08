# 1. Drive the camera inside the page, not with MorphElement

Date: 2026-11-07

## Status

Accepted

## Context

open-slide 2.2 has no camera API. The first attempt at a zoom-and-pan deck wrapped the whole world in one `MorphElement` and gave every page the same world with a different camera, letting the framework's morph transition interpolate between them.

It worked visually on a six-page proof of concept, and froze on the real deck. The morph clones the morph node and calls `copyComputedStyles` on every descendant, synchronously, before the animation starts: about 5 ms per element on the main thread. 92 elements froze for half a second; the full deck froze for five. The morph is also a single two-keyframe FLIP with one easing, so zooms feel mechanical, and descendants are index-paired, so the DOM has to be identical on every page.

## Decision

Each page animates the world itself. A module-level record of the last camera (and of the in-flight position, through a token) lets the new page start where the old one was. The path is a van Wijk–Nuij zoom path (ρ = √2) or a constant-speed ride along a bezier, sampled into one WAAPI keyframe per 12 ms and handed to `element.animate()`. Pages use no `SlideTransition`; they snap, and the world animation carries the continuity.

## Consequences

- The main thread is idle during flights; measured 0 long tasks and 0 frame gaps over 50 ms across 22 page changes in headed Chrome.
- Long moves no longer need intermediate pages; the path pulls up and dives on its own.
- Each page re-mounts the whole world. Overlay layers must read their state from `started ? cfg : prev` so they do not flash to the new state before the flight begins.
- The engine lives in the slide file, about 400 lines above the content. Decks copy it; there is no shared package to update.
- Nothing from the framework's morph tooling (inspector, pairing) applies.
