import { useEffect, useId, useMemo, useRef, useState } from "react";
import katex from "katex";
import { MoveHorizontal } from "lucide-react";
import { splitMathStatements } from "@/lib/mathLayout";
import "katex/dist/katex.min.css";

export function Formula({ tex, block = false, className = "" }) {
  const html = useMemo(
    () => katex.renderToString(tex, { displayMode: block, throwOnError: false, strict: "ignore" }),
    [tex, block],
  );
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

function EquationPart({ tex, label }) {
  const scroll = useRef(null);
  const helpId = useId();
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    const node = scroll.current;
    if (!node) return;
    const measure = () => setOverflow(node.scrollWidth - node.clientWidth > 2);
    measure();
    const observer = typeof window.ResizeObserver === "function" ? new window.ResizeObserver(measure) : null;
    observer?.observe(node);
    const display = node.querySelector(".katex-display");
    if (display) observer?.observe(display);
    window.addEventListener("resize", measure);
    return () => { observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, [tex]);

  return <span className="math-part" data-overflow={overflow || undefined}>
    <span ref={scroll} className="math-scroll" data-nodrag tabIndex={overflow ? 0 : undefined}
      onKeyDown={event => { if (overflow && (event.key === "ArrowLeft" || event.key === "ArrowRight")) event.stopPropagation(); }}
      role={overflow ? "region" : undefined} aria-label={overflow ? label : undefined} aria-describedby={overflow ? helpId : undefined}>
      <Formula tex={tex} block />
    </span>
    {overflow && <><span className="math-overflow-cue" aria-hidden="true"><MoveHorizontal /></span>
      <span id={helpId} className="sr-only">Формулу можно прокрутить влево и вправо.</span></>}
  </span>;
}

export function FormulaBlock({ tex, label = "Формула", className = "" }) {
  const parts = useMemo(() => splitMathStatements(tex), [tex]);
  return <span className={`math-equations ${className}`}>
    {parts.map((part, index) => <EquationPart key={index} tex={part.tex + (part.separator[0] ?? "")}
      label={parts.length > 1 ? `${label}, часть ${index + 1}` : label} />)}
  </span>;
}
