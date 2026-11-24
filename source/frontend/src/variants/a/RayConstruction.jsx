import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Check, ChevronDown, CircleHelp, Crosshair, Expand, Keyboard, MousePointer2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { specimenUrl } from "./OpticalSpecimen";
import { gradeDrawing, grid, makeRayScene, numberText, onBoard, opticLessons, pointText, rayCrossing, rayRule, readStep } from "@/lib/rayOptics";
import RayBoard from "./RayBoard";
import "./ray-construction.css";

const steps = ["Луч 1", "Луч 2", "Изображение"];
const fields = [[0],[1],[2,3]];
const mountedSessions = new Map();
const tourKey = "purradox_optics_intro_v1";

function newAttempt(turn = 0) {
  return { turn, step: 0, values: ["","","",""], saved: [null,null,null], guides: false, compared: false };
}
function samePoint(a, b) {
  return Boolean(a && b && a.length === b.length && a.every((n,i) => Math.abs(n - b[i]) < .00001));
}
function firstTourStep() {
  try { return localStorage.getItem(tourKey) === "seen" ? null : 0; } catch { return 0; }
}

function Coachmark({ page, scene, onNext, onClose }) {
  const titleId = useId(), textId = useId();
  const titles = ["Поставь пробную точку", "Закрепи выбор", "Найди изображение S′"];
  const messages = [
    "Коснись одной из точек на вертикали x = " + numberText(scene.rail) + ". Следующее касание передвинет метку.",
    "Когда направление тебя устроит, подтверди луч кнопкой «Подтвердить луч». Только тогда откроется следующий этап.",
    "После двух лучей коснись места их пересечения. Если лучи расходятся, включи продолжения и найди, где встречается пунктир.",
  ];
  return <Card className="ray-coach" role="region" aria-label="Знакомство с тренажёром" tabIndex={-1} aria-describedby={titleId+" "+textId} data-page={page+1}
    style={{"--ray-coach-anchor": (50 + scene.rail * 23 / 360 * 100) + "%"}}>
    <div className="ray-coach-top"><span>Как пользоваться · {page+1} из 3</span>
      <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Закрыть знакомство"><X aria-hidden="true"/></Button></div>
    <strong id={titleId}>{titles[page]}</strong><p id={textId}>{messages[page]}</p>
    <div className="ray-coach-nav"><span aria-hidden="true">{[0,1,2].map(n => <i key={n} data-active={n===page}/>)}</span>
      <Button type="button" variant="ghost" onClick={onNext}>{page===2 ? "Понятно" : "Дальше"}<ArrowRight aria-hidden="true"/></Button></div>
  </Card>;
}

function Feedback({ scene, result, marked, onEdit, onNext }) {
  const badRay = result.rays.findIndex(ok => !ok);
  let geometric;
  if (!result.correct) {
    if (result.atCrossing) geometric = "Ты точно отметил пересечение своих лучей. Исправить нужно их ход.";
    else if (badRay < 0) geometric = "Оба луча построены верно. Проверь положение точки S′.";
    else if (!result.crossing) geometric = "В твоём построении лучи параллельны. Общей точки у них нет.";
    else if (!onBoard(result.crossing)) geometric = "Твои лучи пересеклись бы за пределами сетки.";
    else if (marked && result.imageCorrect) geometric = "Точка S′ стоит в верном месте, но построенные лучи в ней не сходятся.";
    else geometric = "Проверь направления лучей и место, где они встречаются.";
  }
  return <div className="ray-review">
    <div role="status" className="ray-feedback" data-correct={result.correct}>
      <strong>{result.correct ? "Построение верно" : "Сравни свой и верный ход"}</strong>
      <p>{result.correct ? (scene.virtual ? "Обратные продолжения встречаются в " : "Сами лучи сходятся в ")
        + "S′ " + pointText(scene.image) + ". Изображение " + (scene.virtual ? "мнимое." : "действительное.") : geometric}</p>
      {!result.correct && <>
        {result.rays.map((right,i) => !right && <p key={i} className="ray-rule" data-ray={i+1}><span aria-hidden="true">{i+1}</span>{rayRule(scene,i)}</p>)}
        <p className="ray-reference-note"><i aria-hidden="true"/>Верная точка S′ {pointText(scene.image)} отмечена кольцом.</p>
      </>}
    </div>
    <Button type="button" className="ray-next-task" onClick={onNext}>Попробовать с другими данными<ArrowRight aria-hidden="true"/></Button>
    <Button type="button" variant="ghost" className="ray-revise" onClick={() => onEdit(badRay < 0 ? 2 : badRay)}>
      {result.correct ? "Посмотреть свою точку" : "Исправить эту попытку"}</Button>
  </div>;
}

function Practice({ slug, focused }) {
  const instruments = opticLessons[slug];
  const { state } = useLocation();
  const [index,setIndex] = useState(() => mountedSessions.get(slug)?.index ?? 0);
  const [attempts,setAttempts] = useState(() => mountedSessions.get(slug)?.attempts ?? instruments.map(() => newAttempt()));
  const [tour,setTour] = useState(firstTourStep);
  const [notice,setNotice] = useState("");
  const [manual,setManual] = useState(false);
  const [resetOpen,setResetOpen] = useState(false);
  const benchRef = useRef(null);
  const moveTourFocus = useRef(false);
  useEffect(() => {
    if (!moveTourFocus.current) return;
    moveTourFocus.current = false;
    const target = benchRef.current?.querySelector(tour === null ? ".ray-board > svg" : ".ray-coach");
    if (!target) return;
    target.focus({ preventScroll: true });
    const visible = target.closest(".ray-coach") ?? target;
    const rect = visible.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) visible.scrollIntoView({ block: "nearest" });
  }, [tour]);
  useEffect(() => { mountedSessions.set(slug, { index, attempts }); }, [slug,index,attempts]);
  const directionId = useId(), switchId = useId();
  const attempt = attempts[index], { step, values, saved, guides } = attempt;
  const scene = makeRayScene(instruments[index], attempt.turn);
  const reviewed = step === null;
  const result = gradeDrawing(scene, values);
  const confirmed = saved.map((point,i) => samePoint(point,readStep(values,i)));
  const imageVerdict = !readStep(values,2) ? "empty" : result.correct ? "right"
    : result.atCrossing || result.imageCorrect ? "partial" : "wrong";
  const verdicts = reviewed ? [...result.rays.map(ok => ok ? "right" : "wrong"), imageVerdict] : [];
  const verdictLabels = {
    right: "Построено верно", wrong: "Нужно исправить", empty: "Точка не выбрана",
    partial: result.atCrossing ? "Пересечение твоих лучей отмечено верно" : "Координаты изображения верны, лучи проходят мимо",
  };
  const draft = reviewed ? null : readStep(values,step);
  const activeFields = reviewed ? [] : fields[step];
  const dirty = !reviewed && (saved[step] ? !samePoint(saved[step],draft) : activeFields.some(field => values[field] !== ""));
  const crossing = rayCrossing(scene, ...[0,1].map(i => readStep(values,i)?.[0] ?? null));
  const unreachable = step === 2 && confirmed[0] && confirmed[1] && !onBoard(crossing);
  const reference = attempt.compared && !result.correct;
  const Heading = focused ? "h1" : "h3";

  function update(fn) {
    setAttempts(prev => prev.map((item,i) => i === index ? fn(item) : item));
  }
  function edit(stepIndex) {
    setNotice(""); setManual(false); setResetOpen(false);
    update(a => ({ ...a, step: stepIndex }));
  }
  function replaceFields(changes) {
    setNotice("");
    update(a => ({ ...a, values: a.values.map((value,i) => i in changes ? changes[i] : value) }));
  }
  function put(x,y) {
    if (reviewed) return;
    replaceFields(step < 2 ? { [step]: String(y) } : { 2: String(x), 3: String(y) });
  }
  function cancelPoint() {
    const old = saved[step];
    replaceFields(Object.fromEntries(fields[step].map((field,i) => [field, old ? String(old[i]) : ""])));
  }
  function finishTour(restoreFocus = false) {
    moveTourFocus.current = restoreFocus === true;
    try { localStorage.setItem(tourKey,"seen"); } catch { /* The tutorial also works without storage. */ }
    setTour(null);
  }
  function confirm() {
    if (!draft || reviewed) return;
    setNotice("");
    update(a => {
      const old = a.saved[step], committed = [...a.saved];
      committed[step] = draft;
      if (step < 2 && old && !samePoint(old,draft)) committed[2] = null;
      const next = committed.findIndex((point,i) => !samePoint(point,readStep(a.values,i)));
      return { ...a, saved: committed, step: next < 0 ? null : next,
        compared: a.compared || (next < 0 && !gradeDrawing(scene,a.values).correct) };
    });
    if (tour === 0 || tour === 1) setTour(2);
    else if (tour === 2 && step === 2) finishTour();
  }
  function nextTask() {
    setNotice("Новые условия. Построй лучи самостоятельно."); setManual(false); setResetOpen(false);
    if (tour !== null) finishTour();
    update(a => newAttempt(a.turn + 1));
  }
  function keyOnBoard(event) {
    if (reviewed) return;
    const key = event.key;
    if (key === "Enter" || key === " ") { event.preventDefault(); confirm(); return; }
    if (key === "Escape") { if (tour !== null) { event.stopPropagation(); finishTour(); } else if (dirty) cancelPoint(); return; }
    if (!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(key)) return;
    event.preventDefault();
    if (step < 2 && (key === "ArrowLeft" || key === "ArrowRight")) return;
    const x = step < 2 ? scene.rail : (draft?.[0] ?? 0);
    const y = draft ? draft[draft.length-1] : 0;
    const dx = key === "ArrowRight" ? 1 : key === "ArrowLeft" ? -1 : 0;
    const dy = key === "ArrowUp" ? 1 : key === "ArrowDown" ? -1 : 0;
    put(Math.max(grid.left,Math.min(grid.right,x+dx)), Math.max(grid.bottom,Math.min(grid.top,y+dy)));
  }
  function tutorial(page) {
    return tour===page ? <Coachmark page={page} scene={scene} onNext={() => {
      moveTourFocus.current = true;
      if (page===2) finishTour(true); else setTour(page+1);
    }} onClose={() => finishTour(true)}/> : null;
  }
  const placeInstruction = step === 2
    ? "Коснись точки, где пересекаются лучи или их продолжения."
    : "Выбери высоту на подсвеченной вертикали x = " + numberText(scene.rail) + ".";
  const confirmLabel = step === 2 ? "Подтвердить S′ и проверить" : "Подтвердить луч " + (step+1);
  return <section ref={benchRef} className="ray-construction" data-presentation={focused ? "focused" : "embedded"} aria-label="Самостоятельное построение лучей" data-nodrag
    onKeyDown={event => { if (event.key === "Escape" && tour !== null) finishTour(true); }}>
    <header className="ray-cover">
      <div className="ray-cover-copy"><Heading>Построй изображение</Heading>
        <p>Проведи два луча от источника S и найди изображение S′.</p></div>
      {focused && <img src="/art/optics/study/student-320.webp"
        srcSet="/art/optics/study/student-320.webp 320w, /art/optics/study/student-640.webp 640w"
        sizes="(max-width:650px) 34vw, 300px" width="640" height="320" alt="" aria-hidden="true" draggable="false"/>}
      {!focused && <Link className="ray-expand" to={"/lesson/"+slug+"?block=rays&mode=practice"} state={state} aria-label="Открыть построение на весь экран" title="На весь экран"><Expand size={18} aria-hidden="true"/></Link>}
    </header>
    <div className="ray-body">
      <div className="ray-setup">
        {instruments.length > 1 ? <div className="ray-optics" role="group" aria-label={scene.direction > 0 ? "Вид линзы" : "Вид зеркала"}>
          {instruments.map((item,i) => <Button type="button" variant="ghost" key={item.name} aria-label={item.name} aria-pressed={index===i}
            onClick={() => { setIndex(i); setNotice(""); setManual(false); setResetOpen(false); }}><img src={specimenUrl(item.optic)} alt="" aria-hidden="true" draggable="false"/>{item.short}</Button>)}</div>
          : <p className="ray-single"><img src={specimenUrl(scene.optic)} alt="" aria-hidden="true"/>{scene.name}</p>}
        <Button type="button" variant="ghost" className="ray-help" aria-expanded={tour!==null} onClick={() => {
          moveTourFocus.current = true;
          if (tour === null) setTour(0); else finishTour(true);
        }}>
          <CircleHelp aria-hidden="true"/><span>Как пользоваться</span></Button>
      </div>
      <div className="ray-work" data-tour-page={tour === null ? undefined : tour+1}>
        <div className="ray-stage">
          <div className="ray-data"><strong>Источник S {pointText(scene.source)}</strong><span>1 клетка = 1 ед.</span></div>
          <RayBoard scene={scene} values={values} step={step} confirmed={confirmed}
            guides={guides || (reviewed && scene.virtual)} reference={reference} crossing={crossing}
            spotlight={tour===0} onPlace={put} onKeyboard={keyOnBoard} describedBy={directionId}
            onOffRail={() => setNotice("Для этого луча выбери точку прямо на отмеченной вертикали x = " + numberText(scene.rail) + ".")} />
        </div>
        <div className="ray-panel">
          <div className="ray-steps" role="group" aria-label="Этап построения">{steps.map((name,i) =>
            <Button key={name} type="button" variant="ghost" aria-pressed={step===i} data-done={confirmed[i]} data-verdict={verdicts[i]}
              aria-label={reviewed ? name+". "+verdictLabels[verdicts[i]] : name} title={reviewed ? verdictLabels[verdicts[i]] : undefined}
              disabled={i > 0 && !saved[i] && !saved[i-1]} onClick={()=>edit(i)}>
              <span aria-hidden="true" className="ray-step-mark">{verdicts[i]==="wrong" ? <X size={12}/> : verdicts[i]==="partial" ? <Crosshair size={13}/>
                : confirmed[i] ? <Check size={12}/> : i+1}</span>{name}</Button>)}</div>
          {tutorial(0)}
          {!reviewed && <div className="ray-instruction" id={directionId}>
            <p className="ray-step-title">{step < 2 ? (step === 0 ? "Проведи первый луч" : "Проведи второй луч") : "Отметь изображение S′"}</p>
            <p className="ray-direction"><MousePointer2 size={15} aria-hidden="true"/><span>{placeInstruction}</span></p>
          </div>}
          {!reviewed && <div className="ray-confirm-block">
            <div className="ray-selection" aria-live="polite">{draft
              ? (step < 2 ? "Выбрана высота y = "+numberText(draft[0]) : "Выбрана S′ "+pointText(draft))
              : "Точка пока не выбрана"}
              {dirty && <Button type="button" size="sm" variant="ghost" aria-label="Отменить выбор точки" onClick={cancelPoint}><RotateCcw aria-hidden="true"/>Отменить</Button>}</div>
            {tutorial(1)}
            <Button type="button" className="ray-submit" disabled={!draft} onClick={confirm}><Check aria-hidden="true"/>{confirmLabel}</Button>
          </div>}
          {!reviewed && <p role="status" className="ray-notice">{notice || (unreachable
            ? (crossing ? "Пересечение твоих лучей лежит за краем сетки." : "Твои лучи идут параллельно. Пересечения на сетке нет.") : "")}</p>}
          {unreachable && <Button type="button" variant="outline" className="ray-inspect" onClick={() => {
            finishTour(); setNotice(""); update(a => ({...a,step:null,compared:true})); }}>Разобрать ход лучей</Button>}
          {reviewed && <div id={directionId} className="ray-result-wrap"><Feedback scene={scene} result={result} marked={readStep(values,2)} onEdit={edit} onNext={nextTask}/></div>}
          <div className="ray-tools">
            {tutorial(2)}
            {reviewed && tutorial(1)}
            <div className="ray-tool-row">
              <Switch id={switchId} className="ray-switch" aria-label="Продолжения лучей"
                checked={guides || (reviewed && scene.virtual)} disabled={(!readStep(values,0) && !readStep(values,1)) || (reviewed && scene.virtual)}
                onCheckedChange={value=>update(a => ({...a,guides:value}))} />
              <label htmlFor={switchId}>Продолжения лучей</label>
            </div>
            {!reviewed && <details className="ray-manual" open={manual} onToggle={event=>setManual(event.currentTarget.open)}>
              <summary><Keyboard size={17} aria-hidden="true"/>Ввести координаты<ChevronDown size={16} aria-hidden="true"/></summary>
              <p>На сетке можно двигать точку стрелками и подтверждать клавишей Enter.</p>
              <div className="ray-fields">{activeFields.map(field => <label key={field}>{step<2 ? "Высота y" : field===2 ? "Координата x" : "Координата y"}
                <Input type="text" inputMode="decimal" autoComplete="off" value={values[field]}
                  onChange={event=>replaceFields({[field]:event.target.value})} onKeyDown={event=>{if(event.key==="Enter") {event.preventDefault();confirm();}}}/></label>)}</div>
              {activeFields.some(i => values[i]) && !draft && <p className="ray-field-hint">Введи число в пределах шкалы. По x от −6 до 6, по y от −4 до 5.</p>}
            </details>}
            {!reviewed && <details key={scene.optic+"-"+step} className="ray-manual ray-physics-help">
              <summary><CircleHelp size={17} aria-hidden="true"/>Как построить этот шаг<ChevronDown size={16} aria-hidden="true"/></summary>
              <p>{step < 2 ? rayRule(scene,step) : "У действительного изображения встречаются сами лучи. У мнимого пересекаются их обратные продолжения."}</p>
              {scene.optic.endsWith("-mirror") && step < 2 && <p>На схеме используем приближение для лучей вблизи оси. Точки отражения откладываем на вертикали через полюс зеркала.</p>}
            </details>}
            {values.some(Boolean) && <div className="ray-restart">
              {resetOpen ? <><span>Очистить эту попытку?</span>
                <Button type="button" variant="ghost" onClick={() => { update(a => newAttempt(a.turn)); setResetOpen(false); setNotice(""); setManual(false); }}>Очистить</Button>
                <Button type="button" variant="ghost" onClick={() => setResetOpen(false)}>Оставить</Button></>
                : <Button type="button" variant="ghost" aria-label="Очистить построение" onClick={() => setResetOpen(true)}><RotateCcw aria-hidden="true"/>Сначала</Button>}
            </div>}
          </div>
        </div>
      </div>
    </div>
  </section>;
}

export default function RayConstruction({ slug, focused = false }) {
  return <Practice key={slug} slug={slug} focused={focused}/>;
}
