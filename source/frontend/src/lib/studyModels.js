export function gasState(T, volumeLitres, moles = 1) {
  return { pressureKpa: moles * 8.31 * T / volumeLitres, densityMoles: moles / (volumeLitres / 1000) };
}
export function circuitState(voltage, r1, r2, parallel) {
  const resistance = parallel ? r1 * r2 / (r1 + r2) : r1 + r2;
  const current = voltage / resistance;
  return { resistance, current, i1: parallel ? voltage / r1 : current, i2: parallel ? voltage / r2 : current,
    u1: parallel ? voltage : current * r1, u2: parallel ? voltage : current * r2 };
}
export function lensState(focal, distance) {
  if (Math.abs(distance - focal) < 1e-9) return { atFocus: true, b: null, magnification: null };
  const b = focal * distance / (distance - focal);
  return { atFocus: false, b, magnification: -b / distance };
}
export function waveState(speed, frequency) { return { wavelength: speed / frequency, period: 1 / frequency }; }
export function motionState(v0, accel, t) { return { v: v0 + accel * t, x: v0 * t + accel * t * t / 2 }; }

// Sphere with gravitational parameter mu. All distances use the same unit.
export function circularOrbitComparison(mu, radius, time) {
  const speed = Math.sqrt(mu / radius);
  const tangentX = speed * time;
  const angle = tangentX / radius;
  return {
    speed, angle, tangentX,
    orbitX: radius * Math.sin(angle),
    orbitY: radius * Math.cos(angle),
    tangentRadius: Math.hypot(radius, tangentX),
  };
}

// Ideal uniform lift. The elapsed time may extend past the end of the lift.
export function uniformLift(weight, targetHeight, duration, time) {
  const height = targetHeight * Math.min(1, Math.max(0, time / duration));
  return { height, work: weight * height, averagePower: weight * targetHeight / duration };
}

// The oscillator is released at +amplitude with zero velocity.
export function harmonicState(amplitude, period, time) {
  const angularSpeed = 2 * Math.PI / period;
  const phase = angularSpeed * time;
  return { x: amplitude * Math.cos(phase), v: -amplitude * angularSpeed * Math.sin(phase) };
}

// One-dimensional projections in a box of unit width; no intermolecular collisions.
// One normal-speed round trip takes two seconds. Each phase offsets the first right-wall hit.
const gasWallPhases = [0.19, 0.47, 0.81, 1.13, 1.49, 1.77];

export function gasWallTrial(time, speed) {
  const elapsed = time * speed;
  const particles = gasWallPhases.map(firstHit => {
    const fromHit = elapsed - firstHit;
    const hits = Math.floor(fromHit / 2) + 1;
    const phase = fromHit - 2 * Math.floor(fromHit / 2);
    return { position: Math.abs(phase - 1), hits, onWall: fromHit >= 0 && phase < 0.07 * speed };
  });
  const hits = particles.reduce((total, p) => total + p.hits, 0);
  return { particles, hits, transfer: hits * speed };
}

// One-dimensional impact. Velocities are signed along the track; e is the restitution coefficient.
export function collisionState(m1, m2, u1, u2, e) {
  const momentum = m1 * u1 + m2 * u2;
  const centerVelocity = momentum / (m1 + m2);
  const relativeAfter = e * (u1 - u2);
  const v1 = centerVelocity - (m2 / (m1 + m2)) * relativeAfter;
  const v2 = centerVelocity + (m1 / (m1 + m2)) * relativeAfter;
  return {
    v1, v2, momentum,
    initialEnergy: (m1 * u1 ** 2 + m2 * u2 ** 2) / 2,
    finalEnergy: (m1 * v1 ** 2 + m2 * v2 ** 2) / 2,
  };
}

// Initially unenergized ideal inductor and resistor in series with a DC source.
export function rlStep(voltage, resistance, inductance, t) {
  const tau = inductance / resistance;
  const exponent = -t / tau;
  return {
    current: -(voltage / resistance) * Math.expm1(exponent),
    emfMagnitude: voltage * Math.exp(exponent),
  };
}

// Angles in degrees, with air approximated by n = 1.
export function prismAngles(incidence, index) {
  const degree = Math.PI / 180;
  const apex = 60;
  const inside = Math.asin(Math.sin(incidence * degree) / index) / degree;
  const exitSine = index * Math.sin((apex - inside) * degree);
  if (exitSine > 1) return { inside, exit: null, deviation: null };
  const exit = Math.asin(exitSine) / degree;
  return { inside, exit, deviation: incidence + exit - apex };
}

export function motionTrack(v0, accel, duration) {
  const turn = accel === 0 ? null : -v0 / accel;
  const positionAt = t => motionState(v0, accel, t).x;
  const end = positionAt(duration);
  const extreme = turn > 0 && turn < duration ? positionAt(turn) : 0;
  return {
    min: Math.min(0, end, extreme),
    max: Math.max(0, end, extreme),
    distance(from, to) {
      const start = positionAt(from);
      const end = positionAt(to);
      if (turn !== null && from < turn && turn < to) {
        const reversal = positionAt(turn);
        return Math.abs(reversal - start) + Math.abs(end - reversal);
      }
      return Math.abs(end - start);
    },
  };
}
