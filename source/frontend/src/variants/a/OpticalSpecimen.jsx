import "./optical-paper.css";

// The anchor is measured on the painted optical surface at the principal axis.
// Surface heights exclude the brass foot. The construction uses the paraxial principal plane.
const profiles = {
  "concave-mirror": { size:[209,474], axis:[152,190], aperture:384, aspect:.37 },
  "convex-mirror":  { size:[209,474], axis:[34,190], aperture:373, aspect:.37 },
  "convex-glass":   { size:[216,462], axis:[106,184], aperture:354, aspect:.52 },
  "concave-glass":  { size:[218,462], axis:[105,184], aperture:352, aspect:.53 },
  plane:            { size:[220,462], axis:[94,184], aperture:354, aspect:.48 },
};
// Left edge of the painted silver, sampled at rows in the cropped Krita specimens.
const surfaceRows = [6,18,32,48,64,80,96,112,128,144,160,176,190,208,224,240,256,272,288,304,320,336,352,368];
const silver = {
  "concave-mirror":[46,66,87,103,115,125,133,139,144,147,150,151,152,152,150,147,144,139,134,126,118,108,96,80],
  "convex-mirror":[137,115,98,84,72,63,56,49,44,40,37,35,34,34,35,37,40,43,48,54,61,71,82,96],
};

function mirrorFaceOffset(kind, dy, aperture) {
  const edge = silver[kind];
  if (!edge) return 0;
  const profile = profiles[kind], scale = aperture / profile.aperture;
  const row = Math.min(surfaceRows.at(-1), Math.max(surfaceRows[0], profile.axis[1] + dy / scale));
  const next = surfaceRows.findIndex((sample,i) => i > 0 && row <= sample);
  const fraction = (row - surfaceRows[next-1]) / (surfaceRows[next] - surfaceRows[next-1]);
  const x = edge[next-1] + fraction * (edge[next] - edge[next-1]);
  return (x - profile.axis[0]) * scale * profile.aspect;
}

export const specimenUrl = name => "/art/optics/study/" + name + ".webp";

export function OpticalInstrument({ kind, x, y, aperture, hitOffset }) {
  const profile = profiles[kind];
  const vertical = aperture / profile.aperture, horizontal = vertical * profile.aspect;
  // Register the painted silver at both reflection marks of the paraxial construction.
  // This is a horizontal shear of the illustration. The ray paths stay straight up to the surface.
  const shear = hitOffset ? -mirrorFaceOffset(kind,hitOffset,aperture) / hitOffset : 0;
  const placement = shear ? "matrix(1 0 "+shear+" 1 "+(-shear*y)+" 0)" : undefined;
  return <image transform={placement} className="optical-instrument" href={specimenUrl(kind)} data-optic={kind}
    x={x - profile.axis[0]*horizontal} y={y - profile.axis[1]*vertical}
    width={profile.size[0]*horizontal} height={profile.size[1]*vertical}
    preserveAspectRatio="none" aria-hidden="true"/>;
}

export function OpticalLamp({ x, y, height }) {
  // Fractions measured at the luminous filament in the exported Krita composite.
  const width = height * 229 / 384;
  return <image className="optical-emitter" href={specimenUrl("lamp")} x={x - width * 114/229}
    y={y - height * 120/384} width={width} height={height} aria-hidden="true"/>;
}
