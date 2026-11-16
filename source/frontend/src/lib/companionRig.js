// Hand-placed controls in source-image pixels. The approved PNGs remain the
// texture: no regenerated face, cut-out seams, or whole-picture CSS scaling.
export const LEGACY_COMPANION_RIGS = {
  desktop: {
    size: [1448, 1086],
    eyes: [[592, 394, 58, 17], [749, 341, 37, 20], [891, 687, 33, 21], [1019, 725, 36, 22]],
    angles: [-0.18, -0.58, 0.52, -0.31],
    girlChest: [489, 775, 408, 290], catChest: [943, 852, 222, 163],
    ear: [1096, 678, 1160, 565], tail: [1360, 960, 1148, 1057],
    src: "/art/approved-cast/return-desktop-20261104-v2.png",
    lids: "/art/approved-cast/motion-20261105/desktop-lids.png",
  },
  mobile: {
    size: [1594, 986],
    eyes: [[790, 546, 64, 21], [995, 478, 57, 24], [436, 648, 47, 25], [615, 639, 48, 27]],
    angles: [-0.12, -0.41, 0.20, -0.26],
    girlChest: [1144, 802, 338, 156], catChest: [474, 813, 238, 127],
    ear: [636, 561, 656, 385], tail: [0, 0, 0, 0],
    src: "/art/approved-cast/return-mobile-20261104-v3.png",
    lids: "/art/approved-cast/motion-20261105/mobile-lids.png",
  },
};

// 2026-11-07 graphic cast. Controls are hand-placed in native raster pixels;
// eyelids sample a registered closed-eye texture, never a replacement face.
export const COMPANION_RIGS = {
  desktop: {
    size:[1448,1086],
    eyes:[[716,460,35,32],[816,413,30,35],[418,650,32,29],[494,629,30,29]],
    angles:[-.23,-.35,-.27,-.29],
    girlChest:[805,761,270,191],catChest:[441,830,115,145],
    ear:[500,601,528,510],tail:[511,953,714,970],
    src:"/art/full-site-20261107/return-desktop-v2.webp",
    lids:"/art/full-site-20261107/return-desktop-closed-v1.webp",
  },
  mobile: {
    size:[1448,1086],
    eyes:[[760,452,40,36],[877,400,35,39],[458,605,39,35],[565,570,35,34]],
    angles:[-.22,-.35,-.25,-.28],
    girlChest:[879,793,285,212],catChest:[474,823,140,173],
    ear:[578,543,570,423],tail:[574,992,796,1008],
    src:"/art/full-site-20261107/return-mobile-v1.webp",
    lids:"/art/full-site-20261107/return-mobile-closed-v1.webp",
  },
};

const clamp = value => Math.min(1, Math.max(0, value));
const smooth = value => { const x = clamp(value); return x * x * (3 - 2 * x); };

function breath(time, period) {
  const phase = (time % period) / period;
  // Shorter inhalation, longer exhalation. Both ends have zero velocity.
  return phase < 0.4 ? smooth(phase / 0.4) : 1 - smooth((phase - 0.4) / 0.6);
}

function blink(time, start, duration) {
  const p = (time - start) / duration;
  if (p < 0 || p > 1) return 0;
  if (p < 0.34) return smooth(p / 0.34);
  if (p < 0.43) return 1;
  return 1 - smooth((p - 0.43) / 0.57);
}

function glance(time, start, duration) {
  const p = (time - start) / duration;
  if (p < 0 || p > 1) return 0;
  return p < 0.2 ? smooth(p / 0.2) : p > 0.7 ? 1 - smooth((p - 0.7) / 0.3) : 1;
}

// An authored 59-second performance. Unequal rests keep the two characters
// from blinking/twitching together. This has no relation to study progress.
export function companionPose(seconds, pointer = [0, 0]) {
  const t = ((seconds % 59) + 59) % 59;
  const girlBlink = [2.8, 7.3, 13.9, 20.6, 28.2, 28.57, 35.8, 44.1, 52.7]
    .reduce((amount, at) => Math.max(amount, blink(t, at, 0.23)), 0);
  const catBlink = [[5.5, 0.38], [16.8, 0.31], [25.0, 0.44], [38.6, 0.36], [49.2, 0.42]]
    .reduce((amount, [at, duration]) => Math.max(amount, blink(t, at, duration)), 0);
  const ear = glance(t, 8.8, 0.75) - 0.45 * glance(t, 9.7, 0.5)
    + 0.8 * glance(t, 23.1, 0.65) + 0.7 * glance(t, 42.8, 0.85);
  return {
    girlBreath: breath(seconds, 5.2), catBreath: breath(seconds + 0.8, 3.9),
    girlBlink, catBlink, ear,
    tail: Math.sin(glance(t, 10.7, 4.4) * Math.PI / 2) * 0.8
      - glance(t, 32.8, 3.3) * 0.7 + glance(t, 51.7, 3.8) * 0.55,
    girlGaze: [pointer[0] * 2.1 + glance(t, 10.3, 2.7) * 2.8 - glance(t, 40.0, 2.3) * 1.8,
      pointer[1] * 1.2 + glance(t, 10.3, 2.7) * 1.0],
    catGaze: [pointer[0] * 2.8 - glance(t, 12.1, 2.6) * 3.8 + glance(t, 33.6, 2.9) * 2.4,
      pointer[1] * 1.6 - glance(t, 12.1, 2.6) * 1.0],
  };
}
