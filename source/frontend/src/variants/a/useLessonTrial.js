import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

export function updateTrialReading(node, value) {
  if (node && node.textContent !== value) node.textContent = value;
}

// Draw every frame. Publish time to React at the boundaries used by the reading.
export function useLessonTrial(duration, { drawFrame, readAt, initialTime = 0 }) {
  const reduceMotion = useReducedMotion();
  const [time, setTime] = useState(initialTime);
  const [playing, setPlaying] = useState(false);
  const animation = useRef(null);
  const instant = useRef(initialTime);
  const painter = useRef(drawFrame);
  const reading = useRef(readAt?.(initialTime));

  useLayoutEffect(() => {
    painter.current = drawFrame;
    drawFrame(instant.current);
  }, [drawFrame]);

  const show = useCallback((elapsed, boundary) => {
    instant.current = elapsed;
    painter.current(elapsed);
    const nextReading = readAt?.(elapsed);
    if (boundary || nextReading !== reading.current) {
      reading.current = nextReading;
      setTime(elapsed);
    }
  }, [readAt]);

  const stop = useCallback(() => {
    if (animation.current !== null) cancelAnimationFrame(animation.current);
    animation.current = null;
  }, []);
  useLayoutEffect(() => stop, [stop]);

  const seek = useCallback(value => {
    if (!Number.isFinite(value)) return;
    stop();
    show(Math.max(0, Math.min(value, duration)), true);
    setPlaying(false);
  }, [duration, show, stop]);
  useLayoutEffect(() => {
    if (reduceMotion && animation.current !== null) seek(duration);
  }, [duration, reduceMotion, seek]);

  function launch() {
    if (animation.current !== null) return;
    if (reduceMotion) {
      seek(duration);
      return;
    }
    show(0, true);
    setPlaying(true);
    let start;
    function step(now) {
      start ??= now;
      const elapsed = Math.min((now - start) / 1000, duration);
      show(elapsed, elapsed === duration);
      if (elapsed < duration) animation.current = requestAnimationFrame(step);
      else {
        animation.current = null;
        setPlaying(false);
      }
    }
    animation.current = requestAnimationFrame(step);
  }

  return { time, playing, complete: time === duration, launch, seek };
}
