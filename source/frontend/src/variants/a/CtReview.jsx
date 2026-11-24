import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, Clock3, Minus, RotateCcw, X } from "lucide-react";
import { ReviewedSteps } from "./AnswerA";
import { useUpdatedFeedback } from "@/lib/hooks";
import { CtReviewFigure } from "./CtReviewFigures";
import { TrainerFigure } from "./TrainerFigures";
import { VtGraph } from "@/components/shared/VtGraph";
import { Rich } from "@/components/shared/Tex";
import { hasAnswer } from "@/components/shared/useCtExam";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { answerText, clock } from "@/lib/format";
import { LINKS } from "@/lib/nav";

const outcomes = ["correct", "mistakes", "blank"];
const reviewState = item => item.correct ? "correct" : hasAnswer(item.given) ? "mistakes" : "blank";
const statusLabel = { correct: "Верно", mistakes: "Ошибка", blank: "Пропуск" };
const filterLabel = { all: "Все", correct: "Верные", mistakes: "Ошибки", blank: "Пропуски" };
const statusIcon = { correct: Check, mistakes: X, blank: Minus };
const countOutcomes = rows => {
  const counts = { all: rows.length, correct: 0, mistakes: 0, blank: 0 };
  for (const item of rows) counts[reviewState(item)]++;
  return counts;
};
const partOf = (item, task) => task?.part ?? (/^[AА]/.test(item.code ?? item.id) ? "A" : "B");
const demoLessons = {
  A1: ["svobodnoe-padenie", "Свободное падение и бросок вверх"],
  A2: ["gazovye-zakony", "Уравнение состояния и газовые процессы"],
  A3: ["tok-i-soprotivlenie", "Ток, сопротивление и закон Ома"],
  A4: ["svet-i-otrazhenie", "Свет и отражение"],
  B1: ["uprugost-i-trenie", "Силы упругости и трения"],
  B2: ["teplovoj-balans-i-fazovye-perehody", "Тепловой баланс и фазовые переходы"],
  B3: ["tonkie-linzy", "Тонкие линзы"],
  B4: ["radioaktivnost-i-poluraspad", "Радиоактивность и период полураспада"],
};

function ReportAnswer({ task, value, unit }) {
  if (!hasAnswer(value)) return "Пропуск";
  if (task?.options?.length) {
    const indices = Array.isArray(value) ? [...value].sort((a, b) => a - b) : [value];
    return indices.map((index, i) => <span className="ct-report-option" key={i}>
      <span className="ct-report-option-index">{answerText(null, index)}</span>
      {task.options[index - 1] && <Rich text={task.options[index - 1]} />}
    </span>);
  }
  return <>{answerText(null, value)}{unit ? " " + unit : ""}</>;
}

function MultiAnswer({ item, task, state }) {
  const given = Array.isArray(item.given) ? item.given : [];
  const expected = item.answer;
  const marks = [...new Set([...given, ...expected])].sort((a, b) => a - b);
  return <div className="ct-report-multiple">
    <p>{state === "blank" ? "Верные пункты" : "Отмеченные и верные пункты"}</p>
    <ul>{marks.map(index => {
      const chosen = given.includes(index), correct = expected.includes(index);
      const outcome = !correct ? "mistakes" : chosen || state === "blank" ? "correct" : "blank";
      const label = !correct ? "Лишний" : state === "blank" ? "Верно" : chosen ? "Совпало" : "Не отмечено";
      const Icon = statusIcon[outcome];
      return <li key={index} data-outcome={outcome}>
        <span className="ct-report-mark"><Icon aria-hidden="true" />{label}</span>
        <ReportAnswer task={task} value={index} />
      </li>;
    })}</ul>
  </div>;
}

function TaskAnswers({ item, task, state }) {
  if (task?.kind === "multi" && state !== "correct" && Array.isArray(item.answer)) {
    return <MultiAnswer item={item} task={task} state={state} />;
  }
  return <dl className="ct-report-answers">
    {state === "mistakes" && <div data-outcome={state}><dt>Твой ответ</dt><dd><ReportAnswer task={task} value={item.given} unit={item.unit} /></dd></div>}
    <div data-outcome="correct"><dt>{state === "correct" ? "Твой ответ верный" : "Верный ответ"}</dt><dd><ReportAnswer task={task} value={item.answer} unit={item.unit} /></dd></div>
  </dl>;
}

function ReviewVisual({ task, item, guide }) {
  const custom = guide?.figure;
  if (task?.graph) {
    const g = task.graph;
    const graph = custom === "area" ? { ...g, fill_from: g.points[0][0], fill_to: g.points[1][0] } : g;
    return <figure className="ct-report-graph">
      <VtGraph graph={graph} theme="study" compact />
      {guide?.caption && <figcaption>{guide.caption}</figcaption>}
    </figure>;
  }
  if (custom) return <CtReviewFigure name={custom} />;
  if (task?.trainerTaskId && task.trainerTaskId === item.trainerTaskId) {
    return <TrainerFigure task={task} figureId={task.trainerTaskId} phase="solution" fallbackToQuestion />;
  }
  return null;
}

function ReviewItem({ item, task, section, data, open, onOpen, nextIssue, jumpToItem, backToMap, toggleRef, panelId }) {
  const state = reviewState(item);
  const Icon = statusIcon[state];
  const current = !item.historical ? task : undefined;
  const [lessonSlug, lessonTitle] = (!data.variantId && current && demoLessons[item.id]) || [item.lessonSlug, item.lessonTitle];
  const demoBlocks = { A1:"vertical", A2:"processes", A3:"ohm", A4:"rays", B1:"sliding", B2:"warming", B3:"signs", B4:"random" };
  const block = item.lessonBlock || current?.lessonBlock || (!data.variantId && demoBlocks[item.id]);
  const location = useLocation();
  const back = new URLSearchParams(location.search);
  back.set("item", item.id);
  const feedback = useUpdatedFeedback(current, item, open, data.variantId);
  const guide = current && feedback.item?.guide;
  const note = state !== "correct" && guide?.note;
  const title = guide?.title || (current && item.lessonTitle) || section || "Задание";
  return <Collapsible open={open} onOpenChange={onOpen}>
    <Card className="ct-card ct-review" data-testid={`ct-review-${item.id.toLowerCase()}`}>
      <CardHeader className="ct-review-heading"><CardTitle className="ct-review-title" role="heading" aria-level={3}>
        <CollapsibleTrigger asChild><Button ref={open ? toggleRef : undefined} type="button" variant="ghost" className="ct-review-toggle"
          aria-controls={panelId} aria-label={`${item.code ?? item.id}. ${title}. ${statusLabel[state]}`}>
          <span className="ct-review-state" data-outcome={state}><Icon aria-hidden="true" /></span>
          <span className="ct-review-summary"><strong>{item.code ?? item.id}</strong><span>{title}</span></span>
          <span className="ct-report-status" data-outcome={state}>{statusLabel[state]}</span>
          <ChevronDown aria-hidden="true" className="ct-review-chevron" />
        </Button></CollapsibleTrigger>
      </CardTitle></CardHeader>
      <CollapsibleContent className="ct-review-panel" id={panelId}><CardContent className="ct-review-content">
        {current ? <p className="ct-report-prompt"><Rich text={current.text} /></p> : <p>Задание из прежней версии. Сохранился разбор этой попытки.</p>}
        <TaskAnswers item={item} task={current} state={state} />
        {note && <div className="ct-review-note" data-testid="ct-review-note"><Rich text={note} /></div>}
        <ReviewVisual task={current} item={item} guide={guide} />
        <h4 className="ct-solution-title">Ход решения</h4>
        <ReviewedSteps feedback={feedback} />
        <div className="ct-review-actions">
          {lessonSlug && <Button asChild variant="secondary" className="ct-review-lesson"><Link to={"/lesson/" + lessonSlug + (block ? "?block=" + encodeURIComponent(block) : "")} state={{reviewOrigin: location.pathname + "?" + back}}>
            <BookOpen aria-hidden="true" /><span>{lessonTitle || "К уроку"}</span><ArrowRight aria-hidden="true" />
          </Link></Button>}
          {lessonSlug && data.independent && state !== "correct" &&
            <Button asChild variant="ghost" className="ct-secondary"><Link to={"/trainer/" + lessonSlug}>
              К задачам по теме<ArrowRight aria-hidden="true" />
            </Link></Button>}
          <div>
            <Button type="button" variant="ghost" className="ct-secondary" onClick={backToMap}><ArrowLeft aria-hidden="true" />К номерам</Button>
            {nextIssue && <Button type="button" variant="ghost" className="ct-secondary" onClick={() => jumpToItem(nextIssue)}>
              {nextIssue.code ?? nextIssue.id}<ArrowRight aria-hidden="true" />
            </Button>}
          </div>
        </div>
      </CardContent></CollapsibleContent>
    </Card>
  </Collapsible>;
}

function ResultMap({ rows, tasks, counts, filter, setFilter, sectionName, clearSection, openId, jumpToItem, titleRef, mapRefs }) {
  return <Card className="ct-card ct-result-map">
    <CardHeader className="ct-map-head">
      <h2 ref={titleRef} tabIndex={-1}>Бланк после проверки</h2>
      {sectionName && <Button type="button" variant="secondary" className="ct-section-chip" onClick={clearSection} aria-label="Сбросить фильтр по разделу">
        {sectionName}<X aria-hidden="true" />
      </Button>}
    </CardHeader>
    <CardContent className="ct-map-content">
      <ToggleGroup type="single" value={filter} onValueChange={value => { if (value) setFilter(value); }}
        className="ct-review-filters" aria-label="Показать задания">
        {["all", "mistakes", "blank", "correct"].map(id => <ToggleGroupItem key={id} value={id} data-testid={`ct-review-filter-${id}`}>
          {filterLabel[id]} <span>{counts[id]}</span>
        </ToggleGroupItem>)}
      </ToggleGroup>
      {["A", "B"].map(part => {
        const group = rows.filter(item => partOf(item, tasks[item.id]) === part);
        return group.length > 0 && <div className="ct-map-part" key={part}>
          <p>{part === "A" ? "Часть А" : "Часть В"}</p>
          <div className="ct-map-grid" data-small={counts.all <= 8 || undefined}>
            {group.map(item => {
              const state = reviewState(item), Icon = statusIcon[state], isOpen = openId === item.id;
              return <Button key={item.id} ref={node => { if (node) mapRefs.current.set(item.id, node); else mapRefs.current.delete(item.id); }}
                type="button" variant="ghost" className="ct-map-slot" data-outcome={state} aria-current={isOpen || undefined}
                aria-label={`${item.code ?? item.id}: ${statusLabel[state].toLowerCase()}`} onClick={() => jumpToItem(item)}
                data-testid={`ct-map-${item.id.toLowerCase()}`}>
                <span>{item.code ?? item.id}</span><Icon aria-hidden="true" />
              </Button>;
            })}
          </div>
        </div>;
      })}
      {!rows.length && <p className="ct-review-empty" role="status">{{ mistakes: "Здесь нет ошибок.", blank: "Здесь нет пропусков.", correct: "Здесь нет верных ответов." }[filter] ?? "В этом разделе нет заданий."}</p>}
    </CardContent>
  </Card>;
}

export function CtResult({ data, exam, attemptPath }) {
  const result = exam.result;
  const [section, setSection] = useState(null);
  const [filter, setFilter] = useState("all");
  const location = useLocation();
  const linkedItem = new URLSearchParams(location.search).get("item");
  const [openId, setOpenId] = useState(() => result.review.some(row => row.id === linkedItem) ? linkedItem : null);
  const [destination, setDestination] = useState(() => openId ? { id:openId } : null);
  const top = useRef(null);
  const mapTitle = useRef(null);
  const openToggle = useRef(null);
  const mapRefs = useRef(new Map());
  const scope = useId();
  useEffect(() => {
    top.current?.focus({ preventScroll:true });
    top.current?.ownerDocument.scrollingElement?.scrollTo?.({ top:0, behavior:"instant" });
  }, []);
  useLayoutEffect(() => {
    if (!destination) return;
    const target = destination.id ? openToggle.current : mapRefs.current.get(destination.mapId) ?? mapTitle.current;
    target?.focus({ preventScroll:true });
    target?.scrollIntoView?.({ block:"start", behavior:"instant" });
  }, [destination]);
  const index = Object.fromEntries(exam.tasks.map(task => [task.id, task]));
  const sections = Object.fromEntries(result.by_section.map(entry => [entry.id, entry.title]));
  const summary = countOutcomes(result.review);
  const reviewed = section ? result.review.filter(item => item.section === section) : result.review;
  const counts = section ? countOutcomes(reviewed) : summary;
  const shown = filter === "all" ? reviewed : reviewed.filter(item => reviewState(item) === filter);
  const firstIssue = result.review.find(item => reviewState(item) === "mistakes") ?? result.review.find(item => reviewState(item) === "blank");
  const showMap = () => { setOpenId(null); setDestination({}); };
  const changeFilter = value => { setFilter(value); setOpenId(null); };
  const showSection = id => { setSection(id); changeFilter("all"); showMap(); };
  const jumpToItem = item => { setOpenId(item.id); setDestination({ id:item.id }); };
  const showOutcome = id => { setSection(null); changeFilter(id); showMap(); };
  return <div className="ct-layout ct-result">
    <header className="ct-result-heading">
      <div className="ct-result-copy">
        <p className="ct-result-context">{data.variantId ? data.title : "Демо ЦТ"}</p>
        <h1 ref={top} tabIndex={-1}>{attemptPath ? "Предыдущий результат" : "Результат"}</h1>
        <div className="ct-result-totals">
          <p className="ct-result-score" data-testid="ct-result-score"><strong>{result.correct}</strong>{" "}<span>из {result.total} верно</span></p>
          <p className="ct-result-time"><Clock3 aria-hidden="true" /><span className="sr-only">Затрачено времени </span>{clock(result.elapsed_sec)}</p>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Считаются полностью верные ответы. Экзаменационные баллы не рассчитываются.</p>
      </div>
      <figure><img src="/art/learning-graphic-20261106/ct-report-sheet-v1.webp" width="720" height="540" alt="" decoding="async" draggable="false" /></figure>
      <div className="ct-result-summary">
        <div className="ct-outcome-track" aria-hidden="true">
          {outcomes.filter(id => summary[id]).map(id => <span key={id} data-outcome={id} style={{ flexGrow: summary[id] }} />)}
        </div>
        <div className="ct-outcome-actions">
          {outcomes.map(id => {
            const Icon = statusIcon[id];
            return <Button key={id} type="button" variant="ghost" disabled={!summary[id]} onClick={() => showOutcome(id)}
              data-outcome={id} className="ct-outcome-button" data-testid={`ct-outcome-${id}`}>
              <Icon aria-hidden="true" /><strong>{summary[id]}</strong><span>{id === "correct" ? "Верно" : filterLabel[id]}</span>
            </Button>;
          })}
        </div>
      </div>
      <Button type="button" className="study-next ct-jump-review" onClick={() => {
        if (!firstIssue) { showMap(); return; }
        setSection(null); setFilter(reviewState(firstIssue)); jumpToItem(firstIssue);
      }}>{firstIssue ? "Разобрать " + (firstIssue.code ?? firstIssue.id) : "Посмотреть решения"}<ArrowDown aria-hidden="true" /></Button>
    </header>
    <ResultMap rows={shown} tasks={index} counts={counts} filter={filter} setFilter={changeFilter} sectionName={sections[section]}
      clearSection={() => showSection(null)} openId={openId} jumpToItem={jumpToItem} titleRef={mapTitle} mapRefs={mapRefs} />
    <Collapsible>
      <Card className="ct-card ct-section-results" data-testid="ct-result-sections">
        <CardHeader><CardTitle role="heading" aria-level={2}>
          <CollapsibleTrigger asChild><Button type="button" variant="ghost" className="ct-sections-title">По разделам<ChevronDown aria-hidden="true" /></Button></CollapsibleTrigger>
        </CardTitle></CardHeader>
        <CollapsibleContent><CardContent className="ct-section-grid">
          {result.by_section.filter(entry => entry.total > 0).map(entry => <div key={entry.id} className="ct-section-result">
            <Button type="button" variant="ghost" onClick={() => showSection(entry.id)}>
              <span>{entry.title}</span><strong>{entry.correct}/{entry.total}</strong><ArrowRight aria-hidden="true" />
            </Button>
            <Progress value={100 * entry.correct / entry.total} aria-label={entry.title + ": " + entry.correct + " из " + entry.total} />
          </div>)}
        </CardContent></CollapsibleContent>
      </Card>
    </Collapsible>
    {shown.length > 0 && <section className="ct-review-list" aria-labelledby="ct-review-title">
      <h2 id="ct-review-title">Разбор по заданиям</h2>
      {shown.map((item, i) => <ReviewItem key={item.id} item={item} task={index[item.id]} section={sections[item.section]}
        data={data} open={openId === item.id} toggleRef={openToggle} panelId={`${scope}-${i}`}
        onOpen={open => setOpenId(open ? item.id : null)}
        nextIssue={shown.slice(i + 1).find(row => reviewState(row) === reviewState(item))}
        jumpToItem={jumpToItem} backToMap={() => { setOpenId(null); setDestination({ mapId: item.id }); }} />)}
    </section>}
    <div className="ct-result-actions">
      {attemptPath ? <Button asChild variant="secondary" className="ct-secondary">
        <Link to={attemptPath}>К текущей попытке<ArrowRight aria-hidden="true" /></Link>
      </Button> : <Button type="button" variant="secondary" className="ct-secondary" onClick={exam.restart}
        disabled={exam.completionPending || exam.error === "conflict"} data-testid="ct-restart-btn">Пройти заново<RotateCcw aria-hidden="true" /></Button>}
      <Button asChild variant="ghost" className="ct-secondary" data-testid="ct-home-btn"><Link to={LINKS.ct}>К вариантам ЦТ<ArrowRight aria-hidden="true" /></Link></Button>
    </div>
  </div>;
}
