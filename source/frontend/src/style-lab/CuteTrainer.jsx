import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown, PawPrint, RotateCcw } from "lucide-react";
import { LESSON_SLUG, checkTask, useTrainerTasks } from "@/lib/hooks";
import { LINKS, NAV } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Rich } from "@/components/shared/Tex";
import { AnswerA, Steps } from "@/variants/a/AnswerA";
import { BrandMark } from "@/variants/a/BrandMark";
import { BrandWordmark } from "@/variants/a/BrandWordmark";
import "./cute-style.css";

const ART = "/art/cute-style-lab-20261106/";
const ROOM_ART = "/art/ambient-graphic-20261106/";
const POSES = {
  thinking: { x: 60, y: 70, w: 520, h: 520, alt: "Мефистофель задумался и коснулся щеки лапой." },
  idea: { x: 670, y: 40, w: 540, h: 520, alt: "У Мефистофеля появилась идея; он приподнял лапу." },
};

function keepMeasurementsTogether(text) {
  return text.replace(/(\$[^$]+\$)|(\d)[ \t]+(м\/с(?:²)?|м|с)(?=[\s.,;:!?)]|$)/g,
    (match, tex, digit, unit) => tex ?? `${digit}\u00a0${unit.replace("/", "/\u2060")}`);
}

function Reaction({ pose }) {
  const p = POSES[pose];
  return <figure className="lab-reaction" style={{ aspectRatio: `${p.w} / ${p.h}` }}>
    <img src={ART + "reactions-study-v1.png"} alt={p.alt} width="1231" height="1277" draggable="false"
      style={{ width: `${1231 / p.w * 100}%`, left: `${-p.x / p.w * 100}%`, top: `${-p.y / p.h * 100}%` }} />
  </figure>;
}

function Header() {
  return <header className="lab-header">
    <Link to="/style-lab" className="lab-logo" aria-label="Пуррадокс — проба оформления"><BrandMark /><BrandWordmark /></Link>
    <nav className="lab-nav" aria-label="Основная навигация">
      {NAV.map(item => <Button asChild variant="ghost" key={item.id}>
        <Link to={item.id === "trainer" ? "/style-lab" : item.to} aria-current={item.id === "trainer" ? "page" : undefined}>
          <span className="lab-nav-icon"><item.icon aria-hidden="true" /></span><span>{item.label}</span>
        </Link>
      </Button>)}
    </nav>
    <Button asChild variant="outline" className="lab-compare"><Link to={LINKS.trainer}>Текущий вид<ArrowUpRight aria-hidden="true" /></Link></Button>
  </header>;
}

export default function CuteTrainer() {
  const query = useTrainerTasks(LESSON_SLUG);
  return <div className="cute-lab">
    <Header />
    {!query.data ? <main className="lab-load">
      {query.isError ? <Alert className="lab-load-error" role="alert">
        <AlertTitle>Задачи не загрузились</AlertTitle>
        <AlertDescription>Попробуй загрузить их ещё раз.</AlertDescription>
        <Button disabled={query.isFetching} onClick={() => query.refetch()} className="lab-primary">{query.isFetching ? "Загружаем…" : "Повторить загрузку"}</Button>
      </Alert> : <div role="status"><h1>Загружаем задачи…</h1><div className="lab-loading-shape" aria-hidden="true" /></div>}
    </main> : query.data.tasks?.length ? <TrainerContent data={query.data} /> : <main className="lab-load"><h1>В этой теме пока нет задач</h1><Button asChild className="lab-primary"><Link to={LINKS.lesson}>К учебнику</Link></Button></main>}
  </div>;
}

function TrainerContent({ data }) {
  const [current, setCurrent] = useState(0);
  const [drafts, setDrafts] = useState({});
  const [results, setResults] = useState({});
  const [attempts, setAttempts] = useState({});
  const [busy, setBusy] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const pending = useRef(false);
  const heading = useRef(null);
  const previousTask = useRef(null);
  const task = data.tasks[current];
  const result = results[task.id];

  useEffect(() => {
    if (previousTask.current && previousTask.current !== task.id) {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView?.({ block: "start" });
    }
    previousTask.current = task.id;
  }, [task.id]);

  const check = useCallback(async (id, answer) => {
    pending.current = true;
    setBusy(true);
    try { return await checkTask(id, answer, data._assessment?.revision); }
    finally { pending.current = false; setBusy(false); }
  }, [data._assessment?.revision]);

  const go = delta => {
    if (pending.current) return;
    const index = current + delta;
    if (index < 0 || index >= data.tasks.length) return;
    setSolutionOpen(false);
    setCurrent(index);
  };
  const retry = () => {
    if (pending.current) return;
    setResults(saved => { const next = { ...saved }; delete next[task.id]; return next; });
    setAttempts(saved => ({ ...saved, [task.id]: (saved[task.id] ?? 0) + 1 }));
    setSolutionOpen(false);
  };

  return <main className="lab-main">
    <section className="lab-study">
    <section className="lab-heading">
      <h1>Тренажёр</h1>
      <p className="lab-topic">{data.title}</p>
      <div className="lab-heading-meta"><span>{data.grade} класс</span><span className="lab-preview-label">Проба оформления</span></div>
    </section>
    <picture className="lab-room" aria-hidden="true">
      <source media="(max-width: 1100px)" srcSet={ROOM_ART + "evening-mobile-v2.webp"} />
      <img src={ROOM_ART + "evening-wide-v1.webp"} width="1672" height="941" alt="" draggable="false" decoding="async" />
    </picture>
    <div className="lab-position">
      <span>{current + 1} из {data.tasks.length}</span>
      <Progress value={(current + 1) / data.tasks.length * 100} aria-label={`Задача ${current + 1} из ${data.tasks.length}`} />
      <PawPrint aria-hidden="true" />
    </div>
    <div className="lab-workspace">
      <Card className="lab-card">
        <CardHeader className="lab-question-heading">
          <span className="lab-task-code" data-testid="cute-task-code">{task.code}</span>
          <CardTitle ref={heading} role="heading" aria-level={2} tabIndex={-1}>{task.kind === "number" ? "Впиши ответ" : task.kind === "multi" ? "Выбери все подходящие ответы" : "Выбери ответ"}</CardTitle>
        </CardHeader>
        <CardContent className="lab-card-content">
          <p className="lab-condition"><Rich text={keepMeasurementsTogether(task.text)} /></p>
          <AnswerA key={`${task.id}-${attempts[task.id] ?? 0}`} item={task} check={check} tid="cute-answer"
            draft={drafts[task.id]} onDraftChange={value => setDrafts(saved => ({ ...saved, [task.id]: value }))}
            initialResult={result} onResult={value => {
              setResults(saved => ({ ...saved, [task.id]: value }));
              setSolutionOpen(!value.correct);
            }} />
          {result && <section className="lab-result" data-testid="cute-result" data-correct={result.correct}>
            <Alert role="status">
              <Reaction pose={result.correct ? "idea" : "thinking"} />
              <AlertTitle>{result.correct ? "Верно" : "Сверим решение"}</AlertTitle>
            </Alert>
            {result.solution?.length > 0 && <Collapsible open={solutionOpen} onOpenChange={setSolutionOpen} className="lab-solution">
              <CollapsibleTrigger asChild><Button variant="ghost">Разбор решения<ChevronDown aria-hidden="true" /></Button></CollapsibleTrigger>
              <CollapsibleContent><Steps steps={result.solution} /></CollapsibleContent>
            </Collapsible>}
            {!result.correct && <Button variant="outline" onClick={retry} className="lab-retry" data-testid="cute-retry-answer"><RotateCcw aria-hidden="true" />Ещё попытка</Button>}
          </section>}
        </CardContent>
        <CardFooter className="lab-card-footer">
          <Button variant="ghost" disabled={current === 0 || busy} onClick={() => go(-1)} data-testid="cute-prev"><ArrowLeft aria-hidden="true" />Назад</Button>
          <Button variant={result ? "default" : "ghost"} className={result ? "lab-primary" : "lab-next-quiet"} disabled={current === data.tasks.length - 1 || busy} onClick={() => go(1)} data-testid="cute-next">Дальше<ArrowRight aria-hidden="true" /></Button>
        </CardFooter>
      </Card>
    </div>
    </section>
  </main>;
}
