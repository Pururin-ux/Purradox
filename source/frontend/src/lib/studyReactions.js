const root = "/art/cast-reactions/20261106-graphic/";
// Provisional graphic studies derived from the same evening-room pair.
// The retained soft originals and rejected chibi studies remain archived.
export const REACTION_ART_ENABLED = true;

function createPose(actor, pose, widths) {
  return {
    actor,
    pose,
    src: `${root}${pose}.png`,
    srcSet: widths.map((width) => `${root}${pose}-${width}.webp ${width}w`).join(", "),
    width: 1448,
    height: 1086,
  };
}

const poses = {
  "girl-win": createPose("girl", "girl-win", [192, 384]),
  "girl-focus": createPose("girl", "girl-focus", [192, 384]),
  "cat-blink": createPose("cat", "cat-blink", [180, 360]),
  "cat-curious": createPose("cat", "cat-curious", [144, 288, 360]),
};

// The same pair can both celebrate and think. Previous failures come from
// actual checks in this route, including a restored wrong result on retry.
export function reactionForAnswer(correct, previousFailures = 0) {
  return poses[correct
    ? previousFailures > 0 ? "cat-blink" : "girl-win"
    : previousFailures > 0 ? "cat-curious" : "girl-focus"];
}
