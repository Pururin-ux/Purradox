import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Cat } from "lucide-react";
import { useInView } from "framer-motion";
import { cn } from "@/lib/utils";
import { CAT_NAME } from "@/lib/returnVoice";
import { COMPANION_RIGS } from "@/lib/companionRig";
import { createCompanionRenderer } from "@/lib/companionRenderer";

const motionPreference = () => window.matchMedia?.("(prefers-reduced-motion: reduce)");
const prefersReducedMotion = () => motionPreference()?.matches ?? false;
function subscribeToReducedMotion(update) {
  const preference = motionPreference();
  preference?.addEventListener?.("change", update);
  return () => preference?.removeEventListener?.("change", update);
}

export function CatName() {
  return <span className="companion-name" title="Мефистофель, кот">{CAT_NAME}<Cat aria-hidden="true" /></span>;
}

export function CompanionText({ text }) {
  const parts = text.split(CAT_NAME);
  return parts.map((part, index) => <Fragment key={index}>{index > 0 && <CatName />}{part}</Fragment>);
}

export function CompanionPortrait({ className }) {
  const reduceMotion = useSyncExternalStore(subscribeToReducedMotion, prefersReducedMotion);
  const figure = useRef(null);
  const image = useRef(null);
  const lids = useRef(null);
  const canvas = useRef(null);
  const renderer = useRef(null);
  const elapsed = useRef(0);
  const pointer = useRef({ target: [0, 0], current: [0, 0] });
  const inView = useInView(figure, { amount: 0.25 });
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [loaded, setLoaded] = useState(null);
  const [loadedLids, setLoadedLids] = useState(null);
  const [status, setStatus] = useState("loading");
  const rig = COMPANION_RIGS[loaded?.kind ?? "desktop"];
  useEffect(() => {
    const sync = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  const imageReady = event => {
    const img = event.currentTarget;
    setStatus("loading");
    setLoaded({ src: img.currentSrc || img.src, kind: (img.currentSrc || img.src).includes("return-mobile") ? "mobile" : "desktop" });
  };
  useEffect(() => {
    if (reduceMotion) {
      setLoadedLids(null);
      setStatus("loading");
      return;
    }
    if (!loaded || loadedLids !== rig.lids || !canvas.current || !image.current?.complete || !lids.current?.complete) return;
    let activeRenderer;
    try {
      activeRenderer = createCompanionRenderer(canvas.current, image.current, rig, lids.current);
      if (!activeRenderer || !activeRenderer.render(elapsed.current)) { activeRenderer?.dispose(); setStatus("unavailable"); return; }
      renderer.current = activeRenderer;
      setStatus("ready");
    } catch { setStatus("unavailable"); activeRenderer?.dispose(); return; }
    const surface = canvas.current;
    const lost = event => { event.preventDefault(); setStatus("unavailable"); };
    surface.addEventListener("webglcontextlost", lost);
    return () => {
      surface.removeEventListener("webglcontextlost", lost);
      activeRenderer.dispose(); renderer.current = null;
    };
  }, [loaded, loadedLids, reduceMotion, rig]);
  const playing = status === "ready" && inView && pageVisible && !reduceMotion;
  useEffect(() => {
    if (!playing || !renderer.current) return;
    let frame, previous, painted = 0;
    const draw = now => {
      if (previous !== undefined) elapsed.current += Math.min(now - previous, 100) / 1000;
      previous = now;
      // Paint at 30fps, with independent body/eye/lid/ear/tail channels.
      if (now - painted >= 1000 / 30) {
        const { current, target } = pointer.current;
        current[0] += (target[0] - current[0]) * 0.12;
        current[1] += (target[1] - current[1]) * 0.12;
        if (!renderer.current?.render(elapsed.current, current)) { setStatus("unavailable"); return; }
        painted = now;
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [playing, loaded]);
  return <figure ref={figure} className={cn("companion-portrait", className)}
    data-motion={!reduceMotion || undefined} data-playing={playing || undefined} data-rig-status={reduceMotion ? "static" : status}
    onPointerMove={event => {
      const rect = event.currentTarget.getBoundingClientRect();
      pointer.current.target = [(event.clientX - rect.left) / rect.width * 2 - 1, (event.clientY - rect.top) / rect.height * 2 - 1];
    }} onPointerLeave={() => { pointer.current.target = [0, 0]; }}>
    <div className="companion-surface"><picture>
      <source media="(max-width: 660px)" srcSet={COMPANION_RIGS.mobile.src} width={COMPANION_RIGS.mobile.size[0]} height={COMPANION_RIGS.mobile.size[1]} />
      <img ref={image} src={COMPANION_RIGS.desktop.src} width={COMPANION_RIGS.desktop.size[0]} height={COMPANION_RIGS.desktop.size[1]} onLoad={imageReady}
        alt="Девушка и кот Мефистофель смотрят на тебя." decoding="async" fetchPriority="high" draggable="false" />
    </picture>
    {!reduceMotion && <canvas ref={canvas} className="companion-rig" aria-hidden="true"
      style={{ left: (-18/rig.size[0]*100)+"%", top: (-18/rig.size[1]*100)+"%", width: ((rig.size[0]+36)/rig.size[0]*100)+"%", height: ((rig.size[1]+36)/rig.size[1]*100)+"%" }} />}
    {!reduceMotion && loaded && <img ref={lids} src={rig.lids} style={{ display:"none" }} alt="" aria-hidden="true"
      onLoad={() => setLoadedLids(rig.lids)} onError={() => setStatus("unavailable")} />}
    </div>
  </figure>;
}
