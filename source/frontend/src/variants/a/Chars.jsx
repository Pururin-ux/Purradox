import { useEffect, useId, useState } from "react";

// Stable keys preserve existing progress and artifact voices while the cast changes.
export const NAMES = { sena: "Рута", quirk: "Тум", tahi: "Шелест" };
const ALT = { sena: "Рута, изобретательница", quirk: "Тум, собиратель находок", tahi: "Шелест, хранитель времени" };
const ATLAS = "/art/crew-workshop-v1.png";
const FRAME = { sena: "20 0 490 1000", quirk: "530 415 420 575", tahi: "960 0 576 1000" };
const FACE = { sena: "145 15 215 240", quirk: "625 410 290 290", tahi: "1135 125 275 280" };

function Portrait({ who, face = false, decorative = false }) {
  const clipId = useId();
  const frame = (face ? FACE : FRAME)[who] ?? FRAME.sena;
  const [x, y, width, height] = frame.split(" ").map(Number);
  return (
    <svg className="crew-art" viewBox={frame} role={decorative ? undefined : "img"} aria-label={decorative ? undefined : ALT[who]} aria-hidden={decorative || undefined} focusable="false">
      <defs>
        {/* Clip atlas pixels in image coordinates: overflow:hidden only clips
            the outer viewport and leaves neighbouring figures in its gutters. */}
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse"><rect x={x} y={y} width={width} height={height} /></clipPath>
      </defs>
      <image href={ATLAS} width="1536" height="1024" clipPath={`url(#${clipId})`} />
    </svg>
  );
}

export function preloadChars() {
  const run = () => { new Image().src = ATLAS; };
  if (window.requestIdleCallback) window.requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 2500);
}

export function Char({ who, pose = "idle", size, className = "", float = false, onClick, testid, showName = false }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick} style={size ? { width: size, height: size } : undefined} className={`ch crew-${who} ${float ? "ch-float" : ""} ${className}`} data-testid={testid ?? `${who}-character`} data-pose={pose} aria-label={onClick ? `Поговорить: ${NAMES[who]}` : undefined}>
      <Portrait who={who} decorative={Boolean(onClick)} />
      {showName && <span className="ch-name">{NAMES[who]}</span>}
    </Tag>
  );
}

export function Avatar({ who, size = 44, className = "" }) {
  return <span className={`ava ava-${who} ${className}`} style={{ width: size, height: size }}><Portrait who={who} face decorative /></span>;
}

function useTyped(text) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(text.length);
      return undefined;
    }
    setN(0);
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setN(i);
      if (i >= text.length) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [text]);
  return text.slice(0, n);
}

export function Bubble({ who, text = "", className = "", testid = "character-dialog", avatar = false }) {
  const typed = useTyped(text);
  return (
    <div className={`a-bubble is-${who} ${className}`} data-testid={testid}>
      <div className="flex items-center gap-2">
        {avatar && <Avatar who={who} size={28} />}
        <span className="who">{NAMES[who]}</span>
      </div>
      <p className="relative mt-1.5 text-[15px] font-semibold leading-snug">
        <span className="sr-only">{text}</span>
        <span className="invisible" aria-hidden="true">{text}</span>
        <span className="absolute inset-0" aria-hidden="true">{typed}</span>
      </p>
    </div>
  );
}
