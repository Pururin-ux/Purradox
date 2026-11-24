import { Fragment, lazy, memo, Suspense, useState } from "react";
import { Dialog, DialogClose, DialogOverlay, DialogPortal, DialogSurface, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

let readyMarkup;
let pendingMarkup;
function loadFormulaMarkup() {
  return pendingMarkup ??= import("./FormulaMarkup").then(module => {
    readyMarkup = module;
    return module;
  }, error => {
    pendingMarkup = undefined;
    throw error;
  });
}
const Formula = lazy(() => loadFormulaMarkup().then(module => ({ default: module.Formula })));
const FormulaBlock = lazy(() => loadFormulaMarkup().then(module => ({ default: module.FormulaBlock })));
// Short ASCII expressions in trainer feedback can use the browser's math layout.
const inlineExpression = /^([a-zA-Z0-9 +\-/|=<>]{1,18})(?:\\text\{([,.;:!?)]+)\})?$/;
const hasMathML = () => typeof globalThis.MathMLElement === "function";

export function preloadFormulaMarkup() {
  // The renderer will surface a load error if a formula actually needs this chunk.
  void loadFormulaMarkup().catch(() => {});
}
function FormulaPending() {
  return <span data-math-pending="" aria-busy="true" aria-label="Загружается формула">…</span>;
}

function InlineMath({ expression, punctuation, className }) {
  const tokens = expression.match(/[a-zA-Z]|[0-9]+|[+\-/|=<>]/g);
  return <math className={className}><mrow>
    {tokens.map((token, index) => {
      if (/^[a-z]/i.test(token)) return <mi key={index}>{token}</mi>;
      if (/^\d/.test(token)) return <mn key={index}>{token}</mn>;
      return <mo key={index}>{token === "-" ? "−" : token}</mo>;
    })}
    {punctuation && <mtext>{punctuation}</mtext>}
  </mrow></math>;
}

export function preloadReviewFormulas(steps) {
  if (!Array.isArray(steps)) return;
  const native = hasMathML();
  const needsRenderer = steps.some(({ tex, text }) => tex
    || (text ?? "").split(/\$([^$]+)\$/g).some((part, index) => index % 2 && (!native || !inlineExpression.test(part))));
  if (needsRenderer) preloadFormulaMarkup();
}

export function Tex(props) {
  const { nativeInline, ...formula } = props;
  const simple = nativeInline && !formula.block && hasMathML() && formula.tex.match(inlineExpression);
  if (simple && simple[1].trim()) return <InlineMath expression={simple[1]} punctuation={simple[2]} className={formula.className} />;
  if (readyMarkup) return <readyMarkup.Formula {...formula} />;
  return <Suspense fallback={<FormulaPending />}><Formula {...formula} /></Suspense>;
}

export function Equation(props) {
  if (readyMarkup) return <readyMarkup.FormulaBlock {...props} />;
  return <Suspense fallback={<FormulaPending />}><FormulaBlock {...props} /></Suspense>;
}

// Разметка урока: $формула$ — TeX, [[термин]] — выделенный термин (жирным).
export const Rich = memo(function Rich({ text, className = "", glossary, nativeInline = false }) {
  // Keep adjoining punctuation with the formula's last KaTeX line segment.
  const source = (text ?? "").replace(/\$([^$]+)\$([,.;:!?)]+)/g, (_, tex, mark) => "$" + tex + "\\text{" + mark + "}$");
  const parts = source.split(/\$([^$]+)\$/g);
  return (
    <span className={className}>
      {parts.map((p, i) => (i % 2 ? <Tex key={i} tex={p} nativeInline={nativeInline} /> : <RichTerms key={i} text={p} glossary={glossary} />))}
    </span>
  );
});

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
