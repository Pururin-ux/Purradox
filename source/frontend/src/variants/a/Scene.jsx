import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function Scene({ name, pos = "50% 50%", fx, className = "", testid, children }) {
  const root = useRef(null);
  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const img = root.current.querySelector("img");
    gsap.fromTo(img, { scale: 1.16, xPercent: -2 }, { scale: 1.05, xPercent: 2, duration: 16, ease: "sine.inOut", yoyo: true, repeat: -1 });
    gsap.from(root.current, { clipPath: "inset(10% 10% 10% 10% round 26px)", opacity: 0, duration: 1, ease: "expo.out" });
  }, { scope: root });
  return (
    <div ref={root} className={`scene ${className}`} data-testid={testid}>
      <img
        src={`/art/${name}.webp`}
        srcSet={`/art/${name}_sm.webp 720w, /art/${name}.webp 1400w`}
        sizes="(max-width: 768px) 100vw, 760px"
        alt=""
        style={{ objectPosition: pos }}
        draggable={false}
      />
      {fx && <div className={`scene-fx fx-${fx}`} />}
      {children}
    </div>
  );
}
