import type { DesignSystem, Page, SlideMeta } from '@open-slide/core';
import { useIsActivePage, useSlidePageNumber } from '@open-slide/core';
import { useLayoutEffect, useRef, useState } from 'react';
import sceneJpg from './assets/scene.jpg';
import closeupJpg from './assets/closeup.jpg';
import appUi from './assets/app-ui.png';

/* ------------------------------------------------------------------ */
/* Scene deck template                                                 */
/*                                                                     */
/* One illustration, one camera. Every page is a camera position over  */
/* the same 2752 × 1536 picture; the words live on HUD cards drawn in  */
/* screen space. Copy this file into slides/<id>/index.tsx, swap the   */
/* assets, re-measure the anchors, then edit VIEWS, HudBody and PAGES. */
/* The engine (everything above "The scene") should not need changes.  */
/* ------------------------------------------------------------------ */

export const design: DesignSystem = {
  palette: { bg: '#f3eee4', text: '#283d33', accent: '#315745' },
  fonts: {
    display: '"Iowan Old Style", "Songti TC", "Noto Serif TC", Georgia, serif',
    body: '"Avenir Next", "PingFang TC", "Noto Sans TC", system-ui, sans-serif',
  },
  typeScale: { hero: 112, body: 36 },
  radius: 8,
};

const paper = '#fffefa';
const ink = '#283d33';
const brick = '#a04337';
const brickSoft = '#e0a79b';
const dim = '#7d8a83';
const mono = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

/* ================================================================== */
/* Camera math                                                         */
/* ================================================================== */

export type Cam = { x: number; y: number; w: number };
export type Pt = { x: number; y: number };

/** van Wijk & Nuij "smooth and efficient zooming and panning". √2 gives the calm, cinematic arc. */
const RHO = Math.SQRT2;

export function zoomPath(a: Cam, b: Cam): { at: (t: number) => Cam; S: number } {
  const rho2 = RHO * RHO;
  const rho4 = rho2 * rho2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d2 = dx * dx + dy * dy;
  if (d2 < 1e-6) {
    const S = Math.log(b.w / a.w) / RHO;
    return { S: Math.abs(S), at: (t) => ({ x: a.x + t * dx, y: a.y + t * dy, w: a.w * Math.exp(RHO * t * S) }) };
  }
  const d = Math.sqrt(d2);
  const b0 = (b.w * b.w - a.w * a.w + rho4 * d2) / (2 * a.w * rho2 * d);
  const b1 = (b.w * b.w - a.w * a.w - rho4 * d2) / (2 * b.w * rho2 * d);
  const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
  const r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
  const S = (r1 - r0) / RHO;
  const coshr0 = Math.cosh(r0);
  const sinhr0 = Math.sinh(r0);
  return {
    S,
    at: (t) => {
      const s = t * S;
      const u = (a.w / (rho2 * d)) * (coshr0 * Math.tanh(RHO * s + r0) - sinhr0);
      return { x: a.x + u * dx, y: a.y + u * dy, w: (a.w * coshr0) / Math.cosh(RHO * s + r0) };
    },
  };
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** The world layer transform that puts camera `c` (centre x,y; visible width w) on a 1920 × 1080 canvas. */
export const camTransform = (c: Cam) => {
  const s = 1920 / c.w;
  return `translate(960px, 540px) scale(${s.toFixed(5)}) translate(${(-c.x).toFixed(2)}px, ${(-c.y).toFixed(2)}px)`;
};
/** d3-zoom's duration rule, scaled by 1.1 and clamped: short hops stay snappy, long ones never drag. */
export const moveDuration = (S: number) => Math.min(1600, Math.max(700, (S * 1000 * RHO * 1.1) / Math.SQRT2));

export type Curve = { p0: Pt; p1: Pt; p2: Pt; p3: Pt };
const bez = (c: Curve, t: number): Pt => {
  const u = 1 - t;
  return {
    x: u * u * u * c.p0.x + 3 * u * u * t * c.p1.x + 3 * u * t * t * c.p2.x + t * t * t * c.p3.x,
    y: u * u * u * c.p0.y + 3 * u * u * t * c.p1.y + 3 * u * t * t * c.p2.y + t * t * t * c.p3.y,
  };
};
/** Arc-length table so a ride along the curve moves at constant speed instead of bunching at the ends. */
export function arcLength(c: Curve, n = 240) {
  const pts: Pt[] = [];
  const len: number[] = [0];
  for (let i = 0; i <= n; i++) pts.push(bez(c, i / n));
  for (let i = 1; i <= n; i++) len.push(len[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = len[n];
  return (f: number): Pt => {
    const target = f * total;
    let lo = 0;
    let hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (len[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    const i = Math.max(1, lo);
    const seg = len[i] - len[i - 1] || 1;
    const k = (target - len[i - 1]) / seg;
    return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k };
  };
}
const curveD = (c: Curve) => `M ${c.p0.x} ${c.p0.y} C ${c.p1.x} ${c.p1.y}, ${c.p2.x} ${c.p2.y}, ${c.p3.x} ${c.p3.y}`;

export type Move = { at: (t: number) => Cam; dur: number };

/** Either ride the view's curve (start/end offsets eased away) or take the van Wijk path. */
export function planMove(from: Cam, v: Pick<ViewCfg, 'cam' | 'follow'>): Move {
  if (v.follow) {
    const { curve, dur } = v.follow;
    const along = arcLength(curve);
    const startOff = { x: from.x - curve.p0.x, y: from.y - curve.p0.y };
    const endOff = { x: v.cam.x - curve.p3.x, y: v.cam.y - curve.p3.y };
    return {
      dur,
      at: (t) => {
        const e = easeInOutCubic(t);
        const p = along(e);
        const a = 1 - smoothstep(0, 0.3, e);
        const b = smoothstep(0.7, 1, e);
        return { x: p.x + a * startOff.x + b * endOff.x, y: p.y + a * startOff.y + b * endOff.y, w: from.w * Math.pow(v.cam.w / from.w, e) };
      },
    };
  }
  const p = zoomPath(from, v.cam);
  return { at: (t) => p.at(easeInOutCubic(t)), dur: moveDuration(p.S) };
}

/** ~12 ms apart: dense enough that the compositor's linear interpolation between frames is invisible. */
export const sampleFrames = (at: (t: number) => Cam, dur: number): Keyframe[] => {
  const n = Math.max(30, Math.round(dur / 12));
  const frames: Keyframe[] = [];
  for (let i = 0; i <= n; i++) frames.push({ transform: camTransform(at(i / n)) });
  return frames;
};

/** Maps the rect (0,0)-(w,h) onto four world points, as a CSS matrix3d. Used to pin a flat screenshot onto a painted screen. */
export function homography(w: number, h: number, q: Pt[]): string {
  const src = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const { x: X, y: Y } = q[i];
    A.push([x, y, 1, 0, 0, 0, -X * x, -X * y, X]);
    A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y, Y]);
  }
  for (let c = 0; c < 8; c++) {
    let piv = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k];
    }
  }
  const [a, b, c, d, e, f, g, hh] = A.map((row, i) => row[8] / row[i]);
  const n = (v: number) => v.toFixed(8);
  return `matrix3d(${n(a)}, ${n(d)}, 0, ${n(g)}, ${n(b)}, ${n(e)}, 0, ${n(hh)}, 0, 0, 1, 0, ${n(c)}, ${n(f)}, 0, 1)`;
}

/* Module-level camera memory: the next page starts where this one is, even mid-flight. */
let lastCam: Cam | null = null;
let lastView: ViewKey | null = null;
let lastHudShown = false;
let live: { at: (t: number) => Cam; start: number; dur: number } | null = null;
const currentCamera = (): Cam | null => {
  if (live) return live.at(Math.min(1, (performance.now() - live.start) / live.dur));
  return lastCam;
};

/* ================================================================== */
/* The scene: measured on assets/scene.jpg (2752 × 1536)               */
/* Re-measure every number below for your own picture (scripts/measure-grid.sh). */
/* ================================================================== */

const WORLD_W = 2752;
const WORLD_H = 1536;

const MOUTH: Pt = { x: 1014, y: 537 }; // the lecturer's mouth
const MIC: Pt = { x: 445, y: 1004 }; // top edge of the laptop screen
const WAVE: Curve = { p0: MOUTH, p1: { x: 875, y: 350 }, p2: { x: 500, y: 625 }, p3: MIC };
const UPLINK: Curve = { p0: { x: 445, y: 995 }, p1: { x: 700, y: 575 }, p2: { x: 1750, y: 325 }, p3: { x: 2160, y: 480 } };
const CLOUD: Pt = { x: 2160, y: 370 };

/* The laptop screen as painted (inner edge of the bezel, clockwise from top-left) and the flat rect the UI unfolds into. */
const LAPTOP_QUAD: Pt[] = [
  { x: 244, y: 1043 },
  { x: 642, y: 990 },
  { x: 680, y: 1224 },
  { x: 275, y: 1304 },
];
const SCREEN = { x: 91, y: 898, w: 750, h: 485 };
const SCREEN_SKEW = homography(SCREEN.w, SCREEN.h, LAPTOP_QUAD);
const SCREEN_FLAT = `translate(${SCREEN.x}px, ${SCREEN.y}px)`;

/* Close-up plate (assets/closeup.jpg, 1376 × 768): placed so its mouth lands on MOUTH, scaled so its head
   roughly matches the painted one. The close-up camera must sit INSIDE this rectangle. */
const CLOSEUP_SCALE = 0.165;
const CLOSEUP_W = 1376 * CLOSEUP_SCALE;
const CLOSEUP_H = 768 * CLOSEUP_SCALE;
const CLOSEUP_LEFT = MOUTH.x - 571 * CLOSEUP_SCALE;
const CLOSEUP_TOP = MOUTH.y - 427 * CLOSEUP_SCALE;

type ViewKey = 'cover' | 'closeup' | 'ride' | 'screen' | 'cloud' | 'lessons' | 'closing';

type HudMode = 'none' | 'center' | 'side' | 'title' | 'caption';
export type ViewCfg = {
  cam: Cam;
  /** ride along a curve instead of the van Wijk path */
  follow?: { curve: Curve; dur: number };
  closeup: boolean;
  waves: 'off' | 'pulse' | 'flow';
  uplink: 'off' | 'on';
  screenFlat: boolean;
  hud: HudMode;
  /** center cards sit on a blurred, darkened scene; side cards leave the scene readable */
  blur: boolean;
  /** ms to hold the landed scene before the blur + HUD come in (default 1000, side cards 800) */
  hold?: number;
};

const WIDE: Cam = { x: WORLD_W / 2, y: WORLD_H / 2, w: WORLD_W };
const base: Omit<ViewCfg, 'cam' | 'hud' | 'blur'> = { closeup: false, waves: 'off', uplink: 'off', screenFlat: false };

const VIEWS: Record<ViewKey, ViewCfg> = {
  cover: { ...base, cam: WIDE, waves: 'pulse', hud: 'title', blur: false, hold: 600 },
  closeup: { ...base, cam: { x: 1034, y: 529, w: 200 }, closeup: true, waves: 'pulse', hud: 'caption', blur: false },
  ride: { ...base, cam: { x: 575, y: 1100, w: 1150 }, follow: { curve: WAVE, dur: 2000 }, waves: 'flow', hud: 'center', blur: true, hold: 1400 },
  screen: { ...base, cam: { x: 466, y: 1112, w: 750 }, screenFlat: true, hud: 'side', blur: false },
  cloud: { ...base, cam: { x: CLOUD.x, y: CLOUD.y + 10, w: 750 }, uplink: 'on', hud: 'center', blur: true, hold: 1200 },
  lessons: { ...base, cam: { ...WIDE, w: 2650 }, hud: 'center', blur: true },
  closing: { ...base, cam: WIDE, waves: 'pulse', hud: 'center', blur: false },
};

/* ---- world layers ---- */

const Closeup = ({ on }: { on: boolean }) => (
  <img
    src={closeupJpg}
    alt=""
    style={{
      position: 'absolute',
      left: CLOSEUP_LEFT,
      top: CLOSEUP_TOP,
      width: CLOSEUP_W,
      height: CLOSEUP_H,
      opacity: on ? 1 : 0,
      // fades in over the tail of the flight so the crossfade hides in the motion; gets out of the way fast on exit
      transition: on ? 'opacity 900ms ease-out' : 'opacity 300ms ease-out',
      WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, #000 72%, transparent 100%)',
      maskImage: 'radial-gradient(ellipse at 50% 50%, #000 72%, transparent 100%)',
    }}
  />
);

/* The app on the laptop: skewed onto the painted screen from afar, unfolds flat when the camera enters it. */
const Screen = ({ flat }: { flat: boolean }) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width: SCREEN.w,
      height: SCREEN.h,
      transformOrigin: '0 0',
      transform: flat ? SCREEN_FLAT : SCREEN_SKEW,
      transition: 'transform 800ms cubic-bezier(0.4, 0, 0.2, 1)',
      overflow: 'hidden',
      borderRadius: 7,
      background: '#f4f4ef',
      boxShadow: flat ? '0 15px 40px rgba(40,61,51,0.25)' : 'none',
    }}
  >
    <img src={appUi} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }} />
  </div>
);

const Lines = ({ waves, uplink, animate }: { waves: ViewCfg['waves']; uplink: ViewCfg['uplink']; animate: boolean }) => {
  const rings = waves !== 'off';
  const flow = waves === 'flow';
  // Only attach the keyframe classes while visible: an animated SVG at opacity 0 still repaints the whole layer.
  const ringClass = animate && rings ? 'sc-ring' : undefined;
  return (
    <svg width={WORLD_W} height={WORLD_H} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
      <g style={{ opacity: rings ? 1 : 0, transition: 'opacity 500ms' }}>
        <circle className={ringClass} cx={MOUTH.x} cy={MOUTH.y} r={15} fill="none" stroke={brick} strokeWidth={2.5} />
        <circle className={ringClass} cx={MOUTH.x} cy={MOUTH.y} r={15} fill="none" stroke={brick} strokeWidth={2.5} style={{ animationDelay: '0.6s' }} />
        <circle className={ringClass} cx={MOUTH.x} cy={MOUTH.y} r={15} fill="none" stroke={brick} strokeWidth={2.5} style={{ animationDelay: '1.2s' }} />
      </g>
      <g style={{ opacity: flow ? 1 : 0, transition: 'opacity 600ms' }}>
        <path d={curveD(WAVE)} fill="none" stroke={brick} strokeWidth={4.5} strokeLinecap="round" strokeOpacity={0.25} />
        <path className={animate && flow ? 'sc-flow' : undefined} d={curveD(WAVE)} fill="none" stroke={brick} strokeWidth={4.5} strokeLinecap="round" strokeDasharray="13 26" />
      </g>
      <g style={{ opacity: uplink === 'off' ? 0 : 1, transition: 'opacity 600ms' }}>
        <path d={curveD(UPLINK)} fill="none" stroke={brick} strokeWidth={6} strokeLinecap="round" />
      </g>
    </svg>
  );
};

/* ================================================================== */
/* HUD                                                                 */
/* ================================================================== */

const EASE = 'cubic-bezier(0.2, 0.7, 0.2, 1)';

const Reveal = ({ on, i = 0, out = false, children }: { on: boolean; i?: number; out?: boolean; children: React.ReactNode }) => (
  <div
    style={{
      opacity: on ? 1 : 0,
      transform: on || out ? 'translateY(0px)' : 'translateY(18px)',
      transition: out ? 'opacity 220ms ease-out' : `opacity 520ms ${EASE} ${i * 80}ms, transform 520ms ${EASE} ${i * 80}ms`,
    }}
  >
    {children}
  </div>
);

type HudProps = { on: boolean; out?: boolean };

const Bullet = ({ children, size = 30 }: { children: React.ReactNode; size?: number }) => (
  <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', marginTop: 14 }}>
    <div style={{ width: 10, height: 10, marginTop: size * 0.75 - 4, flex: 'none', background: brickSoft, borderRadius: 2 }} />
    <div style={{ fontSize: size, lineHeight: 1.5, fontVariantNumeric: 'tabular-nums' }}>{children}</div>
  </div>
);

/* The card root fades too. A card whose children fade but whose box does not lingers as an empty rectangle. */
const Card = ({ kicker, title, on, out, width, compact = false, children }: HudProps & { kicker?: string; title?: string; width?: number; compact?: boolean; children?: React.ReactNode }) => (
  <div
    style={{
      width,
      background: 'rgba(40, 61, 51, 0.96)',
      color: paper,
      borderRadius: 20,
      padding: compact ? '40px 48px 44px' : '52px 64px 56px',
      boxSizing: 'border-box',
      boxShadow: '0 40px 120px rgba(20, 30, 26, 0.45)',
      border: '1px solid rgba(255,255,255,0.08)',
      opacity: on ? 1 : 0,
      transform: on || out ? 'translateY(0px)' : 'translateY(24px)',
      transition: out ? 'opacity 220ms ease-out' : `opacity 420ms ${EASE}, transform 520ms ${EASE}`,
    }}
  >
    {kicker || title ? (
      <Reveal on={on} out={out} i={0}>
        {kicker ? <div style={{ fontFamily: mono, fontSize: 22, letterSpacing: '0.14em', color: brickSoft }}>{kicker}</div> : null}
        {title ? <div style={{ fontFamily: 'var(--osd-font-display)', fontSize: compact ? 48 : 60, fontWeight: 700, lineHeight: 1.25, marginTop: kicker ? 10 : 0 }}>{title}</div> : null}
      </Reveal>
    ) : null}
    {children ? <div style={{ marginTop: kicker || title ? 24 : 0 }}>{children}</div> : null}
  </div>
);

const R = ({ on, out, i, children }: HudProps & { i: number; children: React.ReactNode }) => (
  <Reveal on={on} out={out} i={i}>
    {children}
  </Reveal>
);

/* One case per view. Keep each card to one idea; the scene is doing half the talking. */
function HudBody({ view, on, out }: { view: ViewKey } & HudProps) {
  const p = { on, out };
  switch (view) {
    case 'cover':
      return (
        <Card {...p} width={1100} compact>
          <R {...p} i={0}>
            <div style={{ fontFamily: mono, fontSize: 21, letterSpacing: '0.14em', color: brickSoft }}>SCENE DECK · TEMPLATE</div>
            <div style={{ fontFamily: 'var(--osd-font-display)', fontSize: 92, fontWeight: 700, lineHeight: 1.15, marginTop: 18 }}>One room, one camera.</div>
            <div style={{ fontFamily: 'var(--osd-font-display)', fontSize: 40, lineHeight: 1.3, marginTop: 14, color: brickSoft }}>A talk that travels through a single picture.</div>
          </R>
          <R {...p} i={1}>
            <div style={{ marginTop: 36, fontSize: 28, fontWeight: 600 }}>Your name</div>
            <div style={{ fontSize: 23, opacity: 0.8, marginTop: 4 }}>Your affiliation</div>
          </R>
        </Card>
      );
    case 'closeup':
      return null; // caption mode draws its own pill, see Hud()
    case 'ride':
      return (
        <Card {...p} width={1280} kicker="Station 1 · The microphone" title="Where the sound comes in">
          <R {...p} i={1}><Bullet>The camera just rode the sound wave from the mouth to the laptop.</Bullet></R>
          <R {...p} i={2}><Bullet>A center card sits on a blurred scene: use it when the words matter more than the picture.</Bullet></R>
          <R {...p} i={3}><Bullet>Three bullets at most. The audience is still looking at the room.</Bullet></R>
        </Card>
      );
    case 'screen':
      return (
        <Card {...p} compact kicker="Station 2 · The screen" title="Inside the laptop">
          <R {...p} i={1}><Bullet size={27}>The screenshot unfolded from the painted screen into a flat rectangle as the camera entered.</Bullet></R>
          <R {...p} i={2}><Bullet size={27}>A side card leaves the left two thirds readable. Point at real UI.</Bullet></R>
          <R {...p} i={3}><Bullet size={27}>Swap assets/app-ui.png for your own screenshot; keep it at least 1920 px wide.</Bullet></R>
        </Card>
      );
    case 'cloud':
      return (
        <Card {...p} width={1280} kicker="Station 3 · The cloud" title="A long jump">
          <R {...p} i={1}><Bullet>From the laptop to the window is a long way: the van Wijk path pulls up, glides, and dives.</Bullet></R>
          <R {...p} i={2}><Bullet>No intermediate page was needed. The path does the overview for you.</Bullet></R>
          <R {...p} i={3}><Bullet>The scene held for 1.2 s before this card arrived, so the room registered first.</Bullet></R>
        </Card>
      );
    case 'lessons':
      return (
        <Card {...p} width={1280} kicker="Takeaways" title="What to keep from this template">
          <R {...p} i={1}><Bullet>Storyboard the stations before touching code.</Bullet></R>
          <R {...p} i={2}><Bullet>Measure anchors with a grid, never by eye on a wide shot.</Bullet></R>
          <R {...p} i={3}><Bullet>Hold the scene, then show the card.</Bullet></R>
          <R {...p} i={4}><Bullet>Record a walkthrough and watch it on a phone before anyone else does.</Bullet></R>
        </Card>
      );
    case 'closing':
      return (
        <Card {...p} width={1200} title="Thanks.">
          <R {...p} i={1}><Bullet>Your links, licence, QR code.</Bullet></R>
          <R {...p} i={2}><Bullet>The lecturer is still talking; the rings keep pulsing. Leave this up for questions.</Bullet></R>
        </Card>
      );
  }
}

const Hud = ({ view, on, out }: { view: ViewKey } & HudProps) => {
  const mode = VIEWS[view].hud;
  if (mode === 'none') return null;
  if (mode === 'caption') {
    return (
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 96, display: 'flex', justifyContent: 'center' }}>
        <Reveal on={on} out={out}>
          <div style={{ background: 'rgba(40,61,51,0.94)', color: paper, fontFamily: 'var(--osd-font-display)', fontSize: 40, lineHeight: 1.3, padding: '20px 44px', borderRadius: 999, boxShadow: '0 24px 60px rgba(20,30,26,0.35)' }}>
            One sentence, over a close-up. The plate behind this is a separate image.
          </div>
        </Reveal>
      </div>
    );
  }
  if (mode === 'title') {
    return (
      <div style={{ position: 'absolute', left: 120, bottom: 110 }}>
        <HudBody view={view} on={on} out={out} />
      </div>
    );
  }
  if (mode === 'side') {
    return (
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 820, display: 'flex', alignItems: 'center', padding: '0 72px 0 0', boxSizing: 'border-box' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(40,61,51,0) 0%, rgba(40,61,51,0.35) 30%, rgba(40,61,51,0.6) 100%)', opacity: on ? 1 : 0, transition: 'opacity 500ms' }} />
        <div style={{ position: 'relative', width: 700 }}>
          <HudBody view={view} on={on} out={out} />
        </div>
      </div>
    );
  }
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <HudBody view={view} on={on} out={out} />
    </div>
  );
};

/* ================================================================== */
/* The shot                                                            */
/* ================================================================== */

const Footer = ({ source, light }: { source: string; light: boolean }) => {
  const { current, total } = useSlidePageNumber();
  return (
    <div style={{ position: 'absolute', left: 120, right: 120, bottom: 24, display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 20, letterSpacing: '0.04em', color: light ? 'rgba(255,255,255,0.7)' : dim, fontVariantNumeric: 'tabular-nums', transition: 'color 500ms' }}>
      <span>{source}</span>
      <span>
        {String(current).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </span>
    </div>
  );
};

const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const Shot = ({ view, source }: { view: ViewKey; source: string }) => {
  const active = useIsActivePage();
  const cfg = VIEWS[view];
  const worldRef = useRef<HTMLDivElement>(null);
  const init = useRef<{ from: Cam; prevView: ViewKey | null; prevHud: boolean } | null>(null);
  if (!init.current) {
    init.current = active
      ? { from: currentCamera() ?? { ...cfg.cam, w: cfg.cam.w * 1.06 }, prevView: lastView, prevHud: lastHudShown }
      : { from: cfg.cam, prevView: null, prevHud: false };
  }
  const { from, prevView, prevHud } = init.current;
  const prev = prevView ? VIEWS[prevView] : null;
  const [started, setStarted] = useState(!active);
  const [arrived, setArrived] = useState(!active); // 70 % of the flight
  const [settled, setSettled] = useState(!active); // animation finished
  const [hud, setHud] = useState(!active); // settled + hold

  useLayoutEffect(() => {
    if (!active) return;
    const el = worldRef.current;
    if (!el) return;
    const move = planMove(from, cfg);
    const still = reduceMotion();
    const dur = still ? 1 : move.dur;
    const hold = still ? 0 : (cfg.hold ?? (cfg.hud === 'side' ? 800 : 1000));
    const anim = el.animate(sampleFrames(move.at, dur), { duration: dur, easing: 'linear', fill: 'forwards' });
    const token = { at: move.at, start: performance.now(), dur };
    live = token;
    lastView = view;
    lastCam = cfg.cam;
    lastHudShown = false;
    const raf = requestAnimationFrame(() => setStarted(true));
    const t1 = setTimeout(() => setArrived(true), dur * 0.7);
    let t2: ReturnType<typeof setTimeout> | undefined;
    anim.onfinish = () => {
      if (live === token) live = null;
      setSettled(true);
      t2 = setTimeout(() => {
        setHud(true);
        lastHudShown = true;
      }, hold);
    };
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      if (t2) clearTimeout(t2);
      lastCam = move.at(Math.min(1, (performance.now() - token.start) / dur));
      if (live === token) live = null;
      anim.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scene = started ? cfg : (prev ?? cfg);
  const blurred = started ? hud && cfg.blur : (prev?.blur ?? false);
  const animating = !settled || scene.waves !== 'off';

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#e9e3d7', color: ink, fontFamily: 'var(--osd-font-body)' }}>
      <style>{`
        @keyframes sc-ring { 0% { transform: scale(0.4); opacity: 0.9; } 100% { transform: scale(3.4); opacity: 0; } }
        .sc-ring { transform-origin: ${MOUTH.x}px ${MOUTH.y}px; transform-box: view-box; animation: sc-ring 1.8s cubic-bezier(0.2, 0.6, 0.4, 1) infinite; }
        @keyframes sc-flow { to { stroke-dashoffset: -39; } }
        .sc-flow { animation: sc-flow 0.7s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .sc-ring, .sc-flow { animation: none; } }
      `}</style>
      <div
        ref={worldRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: WORLD_W,
          height: WORLD_H,
          transformOrigin: '0 0',
          willChange: settled ? 'auto' : 'transform', // drop it once landed so text re-rasterises sharp
          transform: camTransform(arrived ? cfg.cam : from),
        }}
      >
        <img src={sceneJpg} alt="" style={{ position: 'absolute', left: 0, top: 0, width: WORLD_W, height: WORLD_H, display: 'block' }} />
        <Screen flat={scene.screenFlat} />
        <Closeup on={cfg.closeup ? arrived : started ? false : (prev?.closeup ?? false)} />
        <Lines waves={scene.waves} uplink={scene.uplink} animate={animating} />
      </div>
      {/* Blur overlay: visibility hidden after the fade, because an opacity-0 backdrop-filter still costs a blur pass per frame. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          background: 'rgba(20, 30, 26, 0.55)',
          opacity: blurred ? 1 : 0,
          visibility: blurred ? 'visible' : 'hidden',
          transition: blurred ? 'opacity 600ms ease-out, visibility 0s' : 'opacity 600ms ease-out, visibility 0s 600ms',
          pointerEvents: 'none',
        }}
      />
      {prevView && prevView !== view && prevHud ? <Hud view={prevView} on={!started} out /> : null}
      <Hud view={view} on={hud} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: 'var(--osd-accent)' }} />
      <Footer source={source} light={blurred} />
    </div>
  );
};

/* ================================================================== */
/* Pages                                                               */
/* ================================================================== */

const S01: Page = () => <Shot view="cover" source="scene deck · template" />;
const S02: Page = () => <Shot view="closeup" source="close-up plate" />;
const S03: Page = () => <Shot view="ride" source="bezier ride" />;
const S04: Page = () => <Shot view="screen" source="perspective screen" />;
const S05: Page = () => <Shot view="cloud" source="van Wijk long jump" />;
const S06: Page = () => <Shot view="lessons" source="takeaways" />;
const S07: Page = () => <Shot view="closing" source="closing" />;

export const notes: (string | undefined)[] = [
  'Wide shot, title card bottom-left. Say who you are while the room sits still.',
  'Push into the mouth. The close-up plate fades in over the last 30 % of the flight. One sentence on the caption.',
  'Ride the wave to the laptop (2 s). Scene holds 1.4 s, then blur + card.',
  'Enter the screen. The screenshot unfolds flat; side card, no blur.',
  'Long jump to the cloud. Let the path do the overview; scene holds 1.2 s.',
  'Pull back almost to wide. Four takeaways, staggered.',
  'Full wide, rings keep pulsing. Leave it up for questions.',
];

export const meta: SlideMeta = {
  title: 'Scene deck template',
  createdAt: '2026-11-08T10:00:00.000Z',
};

export default [S01, S02, S03, S04, S05, S06, S07] satisfies Page[];
