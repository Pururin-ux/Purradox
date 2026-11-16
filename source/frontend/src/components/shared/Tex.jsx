import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import katex from "katex";
import { MoveHorizontal } from "lucide-react";
import { splitMathStatements } from "@/lib/mathLayout";
import { Dialog, DialogClose, DialogOverlay, DialogPortal, DialogSurface, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import "katex/dist/katex.min.css";

export function Tex({ tex, block = false, className = "" }) {
  const html = useMemo(
    () => katex.renderToString(tex, { displayMode: block, throwOnError: false, strict: "ignore" }),
    [tex, block],
  );
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

// Разметка урока: $формула$ — TeX, [[термин]] — выделенный термин (жирным).
export function Rich({ text, className = "", glossary }) {
  // Keep adjoining punctuation with the formula's last KaTeX line segment.
  const source = (text ?? "").replace(/\$([^$]+)\$([,.;:!?)]+)/g, (_, tex, mark) => "$" + tex + "\\text{" + mark + "}$");
  const parts = source.split(/\$([^$]+)\$/g);
  return (
    <span className={className}>
      {parts.map((p, i) => (i % 2 ? <Tex key={i} tex={p} /> : <RichTerms key={i} text={p} glossary={glossary} />))}
    </span>
  );
}

// [[форма]] или [[форма|ключ словаря]]: показываем форму из текста, определение ищем по ключу.
function RichTerms({ text, glossary }) {
  const parts = text.split(/\[\[([^\]]+)\]\]/g);
  return parts.map((p, i) => {
    if (!(i % 2)) return <Fragment key={i}>{p}</Fragment>;
    const [shown, key = shown] = p.split("|");
    const definition = glossary?.[key.trim().toLowerCase()];
    return definition
      ? <TermButton key={i} term={shown} title={key.trim()} definition={definition} />
      : <strong key={i} className="lesson-term">{shown}</strong>;
  });
}

// Термин открывает определение по нажатию: работает и на телефоне, где нет hover.
function TermButton({ term, title, definition }) {
  const [open, setOpen] = useState(false);
  const canonicalTitle = title ? title.charAt(0).toUpperCase() + title.slice(1) : term;
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>
      <Button type="button" variant="ghost" className="lesson-term lesson-term-button" aria-haspopup="dialog">{term}</Button>
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay className="lesson-term-overlay" />
      <DialogSurface className="lesson-term-dialog" aria-describedby={undefined}>
        <DialogTitle className="lesson-term-title">{canonicalTitle}</DialogTitle>
        <p className="lesson-term-definition">{definition}</p>
        <DialogClose asChild><Button type="button" className="lesson-term-close">Понятно</Button></DialogClose>
      </DialogSurface>
    </DialogPortal>
  </Dialog>;
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
      <Tex tex={tex} block />
    </span>
    {overflow && <><span className="math-overflow-cue" aria-hidden="true"><MoveHorizontal /></span>
      <span id={helpId} className="sr-only">Формулу можно прокрутить влево и вправо.</span></>}
  </span>;
}

export function Equation({ tex, label = "Формула", className = "" }) {
  const parts = useMemo(() => splitMathStatements(tex), [tex]);
  return <span className={`math-equations ${className}`}>
    {parts.map((part, index) => <EquationPart key={index} tex={part.tex + (part.separator[0] ?? "")}
      label={parts.length > 1 ? `${label}, часть ${index + 1}` : label} />)}
  </span>;
}
