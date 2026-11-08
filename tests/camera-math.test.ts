import { describe, expect, it } from 'vitest';
import { arcLength, camTransform, homography, moveDuration, planMove, sampleFrames, zoomPath, type Cam, type Curve, type Pt } from '../template/index';

const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

describe('zoomPath (van Wijk & Nuij)', () => {
  const a: Cam = { x: 1000, y: 600, w: 2752 };
  const b: Cam = { x: 2160, y: 370, w: 750 };

  it('starts at the source camera and ends at the target camera', () => {
    const p = zoomPath(a, b);
    const s = p.at(0);
    const e = p.at(1);
    expect(close(s.x, a.x, 1e-3) && close(s.y, a.y, 1e-3) && close(s.w, a.w, 1e-3)).toBe(true);
    expect(close(e.x, b.x, 1e-3) && close(e.y, b.y, 1e-3) && close(e.w, b.w, 1e-3)).toBe(true);
  });

  it('pulls up before diving on a long pan between two tight cameras', () => {
    const tightA: Cam = { x: 500, y: 1100, w: 750 };
    const tightB: Cam = { x: 2160, y: 370, w: 750 };
    const p = zoomPath(tightA, tightB);
    let maxW = 0;
    for (let i = 0; i <= 100; i++) maxW = Math.max(maxW, p.at(i / 100).w);
    expect(maxW).toBeGreaterThan(750 * 1.5);
  });

  it('handles a pure zoom with no pan', () => {
    const p = zoomPath({ x: 500, y: 500, w: 2000 }, { x: 500, y: 500, w: 400 });
    expect(p.S).toBeGreaterThan(0);
    expect(close(p.at(0.5).x, 500)).toBe(true);
    expect(p.at(0.5).w).toBeGreaterThan(400);
    expect(p.at(0.5).w).toBeLessThan(2000);
  });
});

describe('moveDuration', () => {
  it('clamps to 700–1600 ms', () => {
    expect(moveDuration(0)).toBe(700);
    expect(moveDuration(100)).toBe(1600);
    const mid = moveDuration(1.2);
    expect(mid).toBeGreaterThan(700);
    expect(mid).toBeLessThan(1600);
  });
});

describe('arcLength', () => {
  const line: Curve = { p0: { x: 0, y: 0 }, p1: { x: 100, y: 0 }, p2: { x: 200, y: 0 }, p3: { x: 300, y: 0 } };
  it('moves at constant speed along the curve', () => {
    const along = arcLength(line);
    expect(close(along(0.5).x, 150, 0.5)).toBe(true);
    expect(close(along(0.25).x, 75, 0.5)).toBe(true);
    expect(close(along(1).x, 300, 1e-6)).toBe(true);
  });
});

describe('planMove', () => {
  const from: Cam = { x: 1014, y: 537, w: 200 };
  const curve: Curve = { p0: { x: 1014, y: 537 }, p1: { x: 875, y: 350 }, p2: { x: 500, y: 625 }, p3: { x: 445, y: 1004 } };
  const cam: Cam = { x: 575, y: 1100, w: 1150 };

  it('rides a curve from the current camera to the target camera', () => {
    const m = planMove(from, { cam, follow: { curve, dur: 2000 } });
    expect(m.dur).toBe(2000);
    const s = m.at(0);
    const e = m.at(1);
    expect(close(s.x, from.x, 1e-3) && close(s.y, from.y, 1e-3) && close(s.w, from.w, 1e-3)).toBe(true);
    expect(close(e.x, cam.x, 1e-3) && close(e.y, cam.y, 1e-3) && close(e.w, cam.w, 1e-3)).toBe(true);
  });

  it('falls back to the zoom path with a clamped duration', () => {
    const m = planMove(from, { cam });
    expect(m.dur).toBeGreaterThanOrEqual(700);
    expect(m.dur).toBeLessThanOrEqual(1600);
    expect(close(m.at(1).w, cam.w, 1e-3)).toBe(true);
  });
});

describe('sampleFrames / camTransform', () => {
  it('samples about one keyframe per 12 ms with the camera transform', () => {
    const frames = sampleFrames((t) => ({ x: 100 + t * 100, y: 50, w: 1920 }), 1200);
    expect(frames.length).toBe(101);
    expect(frames[0].transform).toBe(camTransform({ x: 100, y: 50, w: 1920 }));
    expect(String(frames[0].transform)).toContain('scale(1.00000)');
  });
});

describe('homography', () => {
  const quad: Pt[] = [
    { x: 244, y: 1043 },
    { x: 642, y: 990 },
    { x: 680, y: 1224 },
    { x: 275, y: 1304 },
  ];
  const w = 750;
  const h = 485;

  // CSS matrix3d is column-major; for a 2D point (x, y, 0, 1):
  // x' = (m11 x + m21 y + m41) / (m14 x + m24 y + m44), y' = (m12 x + m22 y + m42) / (same)
  const apply = (m: number[], p: Pt): Pt => {
    const d = m[3] * p.x + m[7] * p.y + m[15];
    return { x: (m[0] * p.x + m[4] * p.y + m[12]) / d, y: (m[1] * p.x + m[5] * p.y + m[13]) / d };
  };

  it('maps the four corners of the rect onto the quad', () => {
    const str = homography(w, h, quad);
    expect(str.startsWith('matrix3d(')).toBe(true);
    const m = str.slice('matrix3d('.length, -1).split(',').map(Number);
    expect(m.length).toBe(16);
    const corners: Pt[] = [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ];
    // the string carries 8 decimals, so the projective terms round to ~1e-3 px
    corners.forEach((c, i) => {
      const q = apply(m, c);
      expect(close(q.x, quad[i].x, 0.01)).toBe(true);
      expect(close(q.y, quad[i].y, 0.01)).toBe(true);
    });
  });
});
