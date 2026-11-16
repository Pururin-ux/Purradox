import { useEffect, useState } from "react";

export const REACTION_DURATION = 4600;

export function TrainerReaction({ reaction }) {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    setSettled(false);
    const timer = window.setTimeout(() => setSettled(true), REACTION_DURATION);
    return () => window.clearTimeout(timer);
  }, [reaction.pose]);
  const desktopWidth = reaction.actor === "cat" ? 180 : 190;
  return <figure className="study-reaction" data-actor={reaction.actor} data-pose={reaction.pose}
    data-settled={settled || undefined} data-testid="trainer-reaction" aria-hidden="true">
    <img
      sizes={`(max-width: 660px) 124px, (max-width: 900px) 174px, ${desktopWidth}px`}
      srcSet={reaction.srcSet}
      src={reaction.src}
      width={reaction.width}
      height={reaction.height}
      alt=""
      draggable="false"
      decoding="async"
    />
  </figure>;
}
