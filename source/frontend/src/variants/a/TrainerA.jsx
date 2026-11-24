import { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowRight, Check, CheckCircle2, Lightbulb, ListChecks, PawPrint, RotateCcw } from "lucide-react";
import { ShellA, LoadingA } from "./ShellA";
import { AnswerA, ReviewedSteps } from "./AnswerA";
import { TrainerReaction } from "./TrainerReaction";
import { TrainerFigure } from "./TrainerFigures";
import { REACTION_ART_ENABLED, reactionForAnswer } from "@/lib/studyReactions";
import { preloadReviewFormulas, Rich } from "@/components/shared/Tex";
import { TypoFlag } from "@/components/shared/TypoFlag";
import { VtGraph } from "@/components/shared/VtGraph";
import { useTrainerTasks, useUpdatedFeedback, checkTask } from "@/lib/hooks";
import { learningResultStatus, saveTrainerSolution, syncQuestTasks, trainerProgressAt, useGame, useProfileGeneration } from "@/lib/game";
import { answerLabel } from "@/lib/format";
import { afterPaint } from "@/lib/afterPaint";
import { useSfx } from "@/lib/sound";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { learningDraftKey, useLearningDraft } from "@/lib/learningDraft";
import { DraftResume, DraftSaveNotice } from "./DraftPanels";
import { canonicalTaskId } from "@/lib/progressIds";
import { LINKS, practiceReturn } from "@/lib/nav";

const LEVELS = [
  { v: 0, label: "Все" },
  { v: 1, label: "Разминка" },
  { v: 2, label: "Как на ЦТ" },
  { v: 3, label: "Посложнее" },
];

const partLabel = task => task.part === "A"
  ? task.kind === "multi" ? "Несколько ответов" : "Один ответ"
  : "Числовой ответ";

const hoverQuery = typeof window !== "undefined" ? window.matchMedia?.("(any-hover: hover)") : null;
const readHover = () => hoverQuery?.matches ?? false;
function subscribeHover(onChange) {
  hoverQuery?.addEventListener?.("change", onChange);
  return () => hoverQuery?.removeEventListener?.("change", onChange);
}

function trainerSaveAction(draft, progress, taskId, result, options) {
  if (!result || draft.conflicted) return undefined;
  const status = learningResultStatus(progress, taskId, result);
  if (status === "retry") return () => draft.saveResult(taskId, result, options);
  if (status !== "legacy" || !result.correct) return undefined;
  const id = canonicalTaskId(taskId);
  if (result.checkedAt !== undefined && result.checkedAt < trainerProgressAt(progress, id)) return undefined;
  if (!progress.solved.includes(id) || (progress.mistakes.includes(id) && Number.isSafeInteger(result.checkedAt))) {
    return () => saveTrainerSolution(id, { ...options, checkedAt: result.checkedAt });
  }
  return undefined;
}

function taskOutcome(id, progress, results) {
  const taskId = canonicalTaskId(id);
  if (progress.mistakes.includes(taskId)) return false;
  if (progress.solved.includes(taskId)) return true;
  return results[id]?.correct === false ? false : undefined;
}

const TaskHeading = memo(function TaskHeading({ task }) {
  return <CardHeader className="study-task-heading">
    <CardTitle role="heading" aria-level={2} className="study-task-title">
      <Badge className="study-task-code" data-testid="trainer-task-code">{task.code}</Badge>
      <span>{partLabel(task)}</span>
    </CardTitle>
    <div className="study-task-tools"><Badge variant="secondary" className="study-difficulty">{LEVELS[task.level]?.label}</Badge><TypoFlag id={task.id} text={task.text} compact /></div>
  </CardHeader>;
});

export function TaskCard({ task, revision, onResult, onNext, onRetry, onHint, onSaveSolution, res, draft, onDraftChange, last, nextLink, practiceLink, method, previousFailures = 0, resolved = false, staleResult = false, focusAnswer = false, focusQuestion = false }) {
  const [hint, setHint] = useState(false);
  const [sol, setSol] = useState(Boolean(res && !res.correct && !resolved));
  const [reaction, setReaction] = useState(null);
  const question = useRef(null);
  const answerArea = useRef(null);
  const verdict = useRef(null);
  const moveFocus = useRef(false);
  useEffect(() => { if (focusQuestion) question.current?.focus(); }, [focusQuestion]);
  useEffect(() => {
    if (!res || !moveFocus.current) return;
    moveFocus.current = false;
    return afterPaint(() => {
      if (document.activeElement !== document.body && !answerArea.current?.contains(document.activeElement)) return;
      verdict.current?.focus({ preventScroll: true });
      verdict.current?.scrollIntoView?.({ block: "nearest", behavior: "instant" });
    });
  }, [res]);
  const play = useSfx();
  const canAdvance = res?.correct || resolved;
  const feedback = useUpdatedFeedback(task, res, sol);
  return (
    <Card className="study-task-card" data-testid={"trainer-task-" + task.id}>
      <TaskHeading task={task} />
      <CardContent className="study-task-content" data-resolved={resolved || undefined}>
        <p ref={question} tabIndex={-1} className="study-question" data-testid="trainer-task-text"><Rich text={task.text} /></p>
        {task.graph && <div className="study-graph"><VtGraph graph={task.graph} theme="study" compact /></div>}
        <TrainerFigure task={task} phase="question" />
        {!res && <Button type="button" variant="ghost" className="study-hint-toggle"
          onClick={() => { play("tap"); setHint(value => !value); if (!hint) onHint(); }}
          aria-expanded={hint} aria-controls={"hint-" + task.id} data-testid="trainer-hint-toggle-btn">
          <Lightbulb aria-hidden="true" data-icon="inline-start" />{hint ? "Скрыть подсказку" : "Подсказка"}
        </Button>}
        {hint && !res && <Alert role="note" className="study-hint" id={"hint-" + task.id} data-testid="trainer-hint">
          <Lightbulb aria-hidden="true" /><AlertTitle role="heading" aria-level={3}>Подсказка</AlertTitle>
          <AlertDescription><Rich text={task.hint} /></AlertDescription>
        </Alert>}
        <div className="study-answer" ref={answerArea}>
          <AnswerA item={task} check={(id, answer) => checkTask(id, answer, revision)} tid={"trainer-" + task.id} draft={draft} onDraftChange={onDraftChange}
            initialResult={res} focusOnMount={focusAnswer} onResult={result => {
              moveFocus.current = document.activeElement === document.body || answerArea.current?.contains(document.activeElement);
              setReaction(REACTION_ART_ENABLED ? reactionForAnswer(result.correct, previousFailures) : null);
              onResult(result);
              preloadReviewFormulas(result.solution);
              if (!result.correct) startTransition(() => setSol(true));
            }} />
        </div>
        {res && <div className="study-feedback">
          <Alert ref={verdict} tabIndex={-1} role="region" aria-label="Результат проверки" className="study-verdict" data-outcome={canAdvance ? "right" : "wrong"}
            data-pose={resolved ? undefined : reaction?.pose} data-illustrated={Boolean(reaction && !resolved) || undefined} data-testid="trainer-verdict">
            {reaction && !resolved && <TrainerReaction key={reaction.pose} reaction={reaction} />}
            <div className="study-verdict-copy" role="status">
              <div className="study-verdict-title">
                {canAdvance ? <CheckCircle2 aria-hidden="true" /> : <AlertCircle aria-hidden="true" />}
                <AlertTitle role="heading" aria-level={3}>{resolved ? "Задача уже решена" : res.correct ? "Верно" : "Есть ошибка"}</AlertTitle>
              </div>
              {resolved ? <AlertDescription>Прежний ответ остался в черновике.</AlertDescription> :
                !res.correct && <AlertDescription>{task.kind === "number" ? "Правильный ответ: " : Array.isArray(res.answer) ? "Верные варианты: " : "Верный вариант: "}<strong>{answerLabel(task, res.answer)}</strong></AlertDescription>}
              {onSaveSolution && <AlertDescription>Результат проверки пока не записан.</AlertDescription>}
              {staleResult && !resolved && <AlertDescription>В прогрессе уже есть более свежий ответ.</AlertDescription>}
            </div>
            {onSaveSolution ? <Button type="button" className="study-next study-verdict-next" onClick={onSaveSolution}
              data-testid="trainer-save-solution">Сохранить результат</Button> : canAdvance && nextLink ?
            <Button asChild className="study-next study-verdict-next"><Link to={nextLink}>К повторению<ArrowRight aria-hidden="true" /></Link></Button> :
            <Button type="button" className="study-next study-verdict-next" onClick={canAdvance ? onNext : onRetry}
              data-testid={canAdvance ? "trainer-next-btn" : "trainer-retry-btn"}
              aria-label={canAdvance ? (last ? "Итог подборки" : "Следующая задача") : "Ещё раз"}>
              <span className="study-next-wide">{canAdvance ? (last ? "Итог подборки" : "Следующая задача") : "Ещё раз"}</span>
              <span className="study-next-short">{canAdvance ? (last ? "К итогу" : "Дальше") : "Ещё раз"}</span>
              {canAdvance && !last && <span className="trainer-next-paws" aria-hidden="true"><PawPrint /><PawPrint /></span>}
              {!canAdvance || last ? <RotateCcw aria-hidden="true" data-icon="inline-end" /> : <ArrowRight aria-hidden="true" data-icon="inline-end" />}
            </Button>}
          </Alert>
          {res.correct && method && method !== "independent" && <p className="trainer-method" role="status">
            {method === "assisted" ? "Получилось после подсказки или разбора." : method === "recall" ? "Получилось восстановить решение после перерыва." : "Ты уже встречал это задание."}
          </p>}
          <div className="study-result-actions">
            {practiceLink && (!res.correct || method === "assisted") && <Button asChild variant="secondary">
              <Link to={practiceLink}>Проверить себя на другой задаче</Link>
            </Button>}
            <Button type="button" variant="secondary" className="study-solution-toggle"
              onClick={() => setSol(value => !value)} aria-expanded={sol} aria-controls={"solution-" + task.id}
              data-testid="trainer-solution-toggle-btn"><ListChecks aria-hidden="true" data-icon="inline-start" />{sol ? "Скрыть разбор" : "Разбор решения"}</Button>
            {(resolved || (res.correct && nextLink)) && <Button type="button" variant="ghost" className="study-retry" onClick={onRetry}
              data-testid="trainer-retry-btn"><RotateCcw aria-hidden="true" data-icon="inline-start" />Решить ещё раз</Button>}
            {!canAdvance && !nextLink && <Button type="button" variant="ghost" className="study-retry" onClick={onNext}
              data-testid="trainer-next-btn"><ArrowRight aria-hidden="true" data-icon="inline-start" />{last ? "Итог подборки" : "Следующая задача"}</Button>}
          </div>
          {sol && <section className="study-solution" id={"solution-" + task.id} data-testid="trainer-solution" aria-label="Разбор решения">
            <TrainerFigure task={task} phase="solution" />
            <ReviewedSteps feedback={feedback} nativeInline />
          </section>}
        </div>}
      </CardContent>
    </Card>
  );
}

function nextPractice(tasks, task, progress, helpUsed = {}) {
  if (!task?.lessonBlock) return null;
  const fresh = tasks.find(item => item.id !== task.id && item.lessonBlock === task.lessonBlock
    && !progress.learningChecks?.[item.id] && !progress.solved.includes(item.id)
    && !progress.mistakes.includes(item.id) && !helpUsed[item.id]);
  if (!fresh) return null;
  const slug = fresh.id.split(":")[0];
  return "/trainer/" + slug + "?" + new URLSearchParams({ task: fresh.id, transfer: task.id });
}

export default function TrainerA() {
  const { slug } = useParams();
  const location = useLocation();
  const [params] = useSearchParams();
  const { data, isError, error, isFetching, refetch } = useTrainerTasks(slug);
  if (!data && error?.response?.status === 404) return <ShellA><div className="study-trainer study-load">
    <Alert className="study-load-error" data-testid="trainer-topic-not-found">
      <AlertCircle aria-hidden="true" />
      <AlertTitle role="heading" aria-level={1}>Этой подборки больше нет</AlertTitle>
      <AlertDescription>Выбери актуальную тему в тренажёре.</AlertDescription>
      <Button asChild className="study-next"><Link to={practiceReturn(location)}>К списку тем</Link></Button>
    </Alert>
  </div></ShellA>;
  if (!data && isError) return <ShellA><div className="study-trainer study-load">
    <Alert className="study-load-error" data-testid="trainer-load-error" aria-busy={isFetching}>
      <AlertCircle aria-hidden="true" />
      <AlertTitle role="heading" aria-level={1}>Задачи не загрузились</AlertTitle>
      <AlertDescription>Попробуй загрузить их ещё раз.</AlertDescription>
      <Button type="button" className="study-next" disabled={isFetching} onClick={() => refetch()} data-testid="trainer-load-retry">
        {isFetching ? "Загружаем…" : "Повторить загрузку"}
      </Button>
    </Alert>
  </div></ShellA>;
  if (!data) return <ShellA bare><LoadingA /></ShellA>;
  const raw = params.get("task");
  const requestedTask = raw && canonicalTaskId(raw);
  const recallDate = /^\d{4}-\d{2}-\d{2}$/.test(params.get("recall")) ? params.get("recall") : null;
  if (params.get("from") === "review") return <TrainerReview key={learningDraftKey("trainer", slug, data) + ":" + requestedTask + (recallDate ?? "")}
    data={data} slug={slug} recallDate={recallDate} task={data.tasks.find(task => task.id === requestedTask)} />;
  return <TrainerContent key={learningDraftKey("trainer", slug, data) + ":" + (requestedTask ?? "")}
    data={data} slug={slug} requestedTask={requestedTask} transferFrom={params.get("transfer")} />;
}

function TrainerReview({ data, slug, task, recallDate }) {
  const profileGeneration = useProfileGeneration();
  const progress = useGame();
  const taskId = task?.id;
  const scope = taskId ? slug + "-" + taskId.split(":").at(-1) : slug;
  const draft = useLearningDraft("trainer-review", recallDate ? scope + "-" + recallDate : scope, data, taskId);
  const result = draft.value.results[taskId];
  const [attempt, setAttempt] = useState(0);
  const revision = data._assessment?.revision;
  const options = { revision, profileGeneration, lessonBlock: task?.lessonBlock, recall: Boolean(recallDate), hinted: Boolean(draft.value.helpUsed[taskId]) };
  const markHint = () => draft.update(saved => ({ ...saved, helpUsed: { [taskId]: true } }));
  return <ShellA mainClassName="trainer-main"><div className="study-trainer trainer-graphic trainer-review">
    <DraftSaveNotice error={draft.error ?? draft.warning} />
    <header className="study-heading">
      <h1>{data.title}</h1>
      {!result?.correct && <Button asChild variant="secondary"><Link to={LINKS.review}>К повторению</Link></Button>}
    </header>
    {task ? <TaskCard key={attempt} task={task} revision={revision} res={result} focusAnswer={attempt > 0} last
      draft={draft.value.answers[taskId]} onDraftChange={answer => draft.update(saved => ({ ...saved, answers: { [taskId]: answer } }))}
      onHint={markHint}
      staleResult={learningResultStatus(progress, taskId, result) === "stale"}
      onSaveSolution={trainerSaveAction(draft, progress, taskId, result, options)}
      practiceLink={nextPractice(data.tasks, task, progress, draft.value.helpUsed)} method={progress.learningChecks?.[taskId]?.method}
      nextLink={LINKS.review} onRetry={() => {
        draft.update(saved => ({ ...saved, answers: {}, results: {} }));
        setAttempt(n => n + 1);
      }}
      onResult={outcome => draft.saveResult(taskId, outcome, options, saved => ({
        ...saved, results: { [taskId]: outcome }, helpUsed: outcome.correct ? saved.helpUsed : { [taskId]: true },
      }))} /> : <Alert><AlertDescription>В текущей подборке этой задачи нет.</AlertDescription></Alert>}
  </div></ShellA>;
}

const TaskTab = memo(function TaskTab({ task, result, showTooltip }) {
  const description = `${partLabel(task)}, ${LEVELS[task.level]?.label}`;
  const tab = <TabsTrigger value={task.id} className="study-task-tab"
    data-outcome={result === true ? "right" : result === false ? "wrong" : "new"}
    aria-label={task.code + (result === true ? ", решено" : result === false ? ", есть ошибка" : "")}
    aria-description={showTooltip ? undefined : description}
    data-testid={"trainer-task-tab-" + task.id}>
    {task.code}{result === true && <Check aria-hidden="true" />}{result === false && <AlertCircle aria-hidden="true" />}
  </TabsTrigger>;
  if (!showTooltip) return tab;
  return <Tooltip><TooltipTrigger asChild>{tab}</TooltipTrigger>
    <TooltipContent className="trainer-tab-tooltip" side="top" sideOffset={9}>
      {partLabel(task)} <span aria-hidden="true">·</span> {LEVELS[task.level]?.label}
    </TooltipContent>
  </Tooltip>;
});

const TaskStrip = memo(function TaskStrip({ tasks, progress, results, showTooltip }) {
  return <TooltipProvider delayDuration={280} skipDelayDuration={100}>
    <TabsList className="study-task-strip" aria-label="Задачи" data-testid="trainer-task-strip">
      {tasks.map(task => <TaskTab key={task.id} task={task} result={taskOutcome(task.id, progress, results)} showTooltip={showTooltip} />)}
    </TabsList>
  </TooltipProvider>;
});

const LevelFilter = memo(function LevelFilter({ tasks, level, onChange }) {
  return <ToggleGroup type="single" value={String(level)} onValueChange={onChange} className="study-level-filter"
    aria-label="Сложность задач" data-testid="trainer-level-filter">
    {LEVELS.map(item => <ToggleGroupItem key={item.v} value={String(item.v)}
      disabled={item.v > 0 && !tasks.some(task => task.level === item.v)}
      data-testid={"trainer-level-" + item.v}>{item.label}</ToggleGroupItem>)}
  </ToggleGroup>;
});

const TrainerHeading = memo(function TrainerHeading({ title, grade, total, solved }) {
  const percent = total ? solved / total * 100 : 0;
  return <header className="study-heading">
    <div><h1>{title}</h1></div>
    <div className="study-topic-meta">
      <picture className="trainer-room" aria-hidden="true">
        <source media="(max-width: 1100px)"
          srcSet="/art/ambient-graphic-20261106/evening-mobile-v2-600.webp 600w, /art/ambient-graphic-20261106/evening-mobile-v2-1320.webp 1320w"
          sizes="(max-width: 660px) 63vw, 60vw" width="600" height="338" />
        <img srcSet="/art/ambient-graphic-20261106/evening-wide-v1-990.webp 990w, /art/ambient-graphic-20261106/evening-wide-v1-1672.webp 1672w"
          sizes="990px" src="/art/ambient-graphic-20261106/evening-wide-v1-990.webp" alt="" width="990" height="557"
          decoding="async" fetchPriority="high" />
      </picture>
      <Badge variant="secondary" className="study-grade">{grade} класс</Badge>
      <div className="study-progress">
        <span data-testid="trainer-solved-count">Решено <b>{solved}</b> из {total}</span>
        <div className="trainer-progress-track">
          <Progress value={percent} aria-label={"Решено " + solved + " из " + total} />
          {solved > 0 && <PawPrint className="trainer-progress-paw" aria-hidden="true"
            style={{left:`clamp(8px, ${percent}%, calc(100% - 8px))`}} />}
        </div>
      </div>
    </div>
  </header>;
});

function TrainerContent({ data, slug, requestedTask, transferFrom }) {
  useEffect(() => { syncQuestTasks(data.tasks.map(task => task.id)); }, [data.tasks]);
  const showTabTooltips = useSyncExternalStore(subscribeHover, readHover, () => false);
  const draft = useLearningDraft("trainer", slug, data, requestedTask);
  const updateDraft = draft.update;
  const { level, taskId: cur, results, helpUsed } = draft.value;
  const [attempt, setAttempt] = useState(0);
  const [failures, setFailures] = useState({});
  const [navigationOpen, setNavigationOpen] = useState(false);
  const focusRetry = useRef(false);
  const revealQuestion = useRef(false);
  const progress = useGame();
  const profileGeneration = useProfileGeneration();
  const play = useSfx();
  const list = useMemo(() => data.tasks.filter(item => !level || item.level === level), [data.tasks, level]);
  const task = list.find(item => item.id === cur) ?? list[0];
  const idx = list.indexOf(task);
  const solved = data.tasks.filter(item => progress.solved.includes(canonicalTaskId(item.id))).length;
  const result = results[task?.id];
  const options = { revision: data._assessment?.revision, profileGeneration, lessonBlock: task?.lessonBlock, transferFrom: cur === requestedTask ? transferFrom : undefined, hinted: Boolean(helpUsed[task?.id]) };

  const open = useCallback((id, reveal = false) => {
    setNavigationOpen(false);
    revealQuestion.current = reveal;
    focusRetry.current = false;
    play("tap");
    updateDraft(value => ({ ...value, taskId: id }));
    setAttempt(value => value + 1);
  }, [play, updateDraft]);
  const changeLevel = useCallback(value => {
    if (!value) return;
    revealQuestion.current = false;
    focusRetry.current = false;
    const nextLevel = Number(value);
    const nextList = data.tasks.filter(item => !nextLevel || item.level === nextLevel);
    play("tap");
    updateDraft(saved => ({
      ...saved, level: nextLevel,
      taskId: nextList.some(item => item.id === saved.taskId) ? saved.taskId : nextList[0]?.id ?? saved.taskId,
    }));
  }, [data.tasks, play, updateDraft]);
  const onResult = async result => {
    const status = await draft.saveResult(task.id, result, options, value => ({
      ...value, results: { ...value.results, [task.id]: result },
      firstResults: { ...value.firstResults, [task.id]: value.firstResults?.[task.id] ?? result.correct },
      helpUsed: result.correct ? value.helpUsed : { ...value.helpUsed, [task.id]: true },
    }));
    if (status !== "stale" && !result.correct) {
      setFailures(value => ({ ...value, [task.id]: (value[task.id] ?? 0) + 1 }));
    }
  };

  if (draft.pending) return <ShellA><DraftSaveNotice error={draft.error ?? draft.warning} /><DraftResume title={data.title} kind="trainer"
    savedAt={draft.savedAt} results={results}
    position={{ label: task ? "Задача " + task.code : "Задача в подборке", current: idx + 1, total: list.length }}
    onResume={draft.resume} onRestart={draft.restart} /></ShellA>;

  if (draft.value.summary) {
    const marked = list.filter(item => results[item.id]);
    const right = marked.filter(item => results[item.id].correct);
    const independent = right.filter(item => {
      const mark = progress.learningChecks?.[item.id];
      return mark?.method === "independent" && mark.attemptId === results[item.id].attemptId;
    });
    const firstChecks = marked.map(item => draft.value.firstResults?.[item.id]);
    const firstErrors = firstChecks.filter(correct => correct === false).length;
    const unknown = firstChecks.filter(correct => correct === undefined).length;
    const missed = marked.find(item => !results[item.id].correct);
    const firstUnanswered = list.find(item => !results[item.id]);
    const practice = missed && nextPractice(data.tasks, missed, progress, helpUsed);
    const returnToQuestion = question => draft.update(saved => ({ ...saved, summary: false, taskId: question.id }));
    const repeatSelection = () => {
      const selected = new Set(list.map(item => item.id));
      const keepOther = entries => Object.fromEntries(Object.entries(entries).filter(([id]) => !selected.has(id)));
      setFailures({});
      setAttempt(value => value + 1);
      draft.update(saved => ({ ...saved, summary: false, taskId: list[0].id,
        answers: keepOther(saved.answers), results: keepOther(saved.results), firstResults: keepOther(saved.firstResults ?? {}) }));
    };
    return <ShellA><div className="study-trainer trainer-graphic trainer-session-page"><Card className="trainer-session" data-testid="trainer-summary">
      <CardHeader className="trainer-session-head"><div>
        <CardTitle role="heading" aria-level={1}>Итог подборки</CardTitle><p>{data.title}</p></div>
        <img src="/art/cast-reactions/20261106-graphic/cat-curious-288.webp" width="144" height="108" alt="" />
      </CardHeader>
      <CardContent className="trainer-session-body">
        <p className="trainer-session-score">Ответов <strong>{marked.length} из {list.length}</strong>. Верных <strong>{right.length}</strong>.</p>
        <div className="trainer-session-track" aria-hidden="true">{list.map(item => <i key={item.id}
          data-outcome={results[item.id] ? (results[item.id].correct ? "correct" : "wrong") : "empty"} />)}</div>
        <dl className="trainer-session-counts">
          <div><dt>Новые задачи без помощи</dt><dd>{independent.length}</dd></div>
          <div><dt>Ошибки в первой попытке</dt><dd>{firstErrors}</dd></div>
        </dl>
        {unknown > 0 && <p>Для прежних ответов первая попытка не записана ({unknown}).</p>}
        {right.length > independent.length && <p>Остальные верные ответы включают повторы и решения с помощью.</p>}
        <div className="study-result-actions">
          {practice ? <Button asChild><Link to={practice}>Проверить себя на другой задаче</Link></Button>
            : missed ? <Button onClick={() => returnToQuestion(missed)}>Разобрать {missed.code}</Button>
            : firstUnanswered ? <Button onClick={() => returnToQuestion(firstUnanswered)}>Решить {firstUnanswered.code}</Button>
            : <Button asChild><Link to={LINKS.practice}>К другим темам</Link></Button>}
          <Button variant="secondary" onClick={repeatSelection}><RotateCcw size={16} aria-hidden="true" />Повторить подборку</Button>
          {(practice || missed || firstUnanswered) && <Button asChild variant="ghost"><Link to={LINKS.practice}>Все темы</Link></Button>}
        </div><DraftSaveNotice error={draft.error ?? draft.warning} />
      </CardContent></Card></div></ShellA>;
  }
  return <ShellA mainClassName="trainer-main"><div className="study-trainer trainer-graphic" data-navigation-open={navigationOpen}>
    <DraftSaveNotice error={draft.error ?? draft.warning} />
    <TrainerHeading title={data.title} grade={data.grade} total={data.tasks.length} solved={solved} />
    <Button type="button" variant="secondary" className="trainer-navigation-toggle" aria-expanded={navigationOpen}
      onClick={() => setNavigationOpen(value => !value)}><ListChecks size={16} aria-hidden="true" />Задача {task?.code} · {navigationOpen ? "Скрыть выбор" : "Выбрать задачу"}</Button>
    <LevelFilter tasks={data.tasks} level={level} onChange={changeLevel} />
    <Tabs value={task?.id ?? ""} onValueChange={open} className="study-task-tabs" activationMode="manual">
      <TaskStrip tasks={list} progress={progress} results={results} showTooltip={showTabTooltips} />
      <div className="study-workspace">
        {task ? <TabsContent value={task.id} className="study-task-panel">
          <TaskCard key={task.id + "-" + attempt} task={task} revision={data._assessment?.revision} res={result ?? null}
            resolved={result?.correct === false && taskOutcome(task.id, progress, results) === true}
            staleResult={learningResultStatus(progress, task.id, result) === "stale"}
            previousFailures={failures[task.id] ?? 0}
            focusAnswer={focusRetry.current} focusQuestion={revealQuestion.current}
            draft={draft.value.answers[task.id]}
            onDraftChange={value => draft.update(saved => ({ ...saved, answers: { ...saved.answers, [task.id]: value } }))}
            onResult={onResult}
            onSaveSolution={trainerSaveAction(draft, progress, task.id, result, options)}
            onHint={() => draft.update(saved => ({ ...saved, helpUsed: { ...saved.helpUsed, [task.id]: true } }))}
            onRetry={() => {
              revealQuestion.current = false;
              focusRetry.current = true;
              if (results[task.id]?.correct === false) setFailures(value => ({ ...value, [task.id]: Math.max(1, value[task.id] ?? 0) }));
              draft.update(saved => {
                const { [task.id]: result, ...remainingResults } = saved.results;
                const { [task.id]: answer, ...remainingAnswers } = saved.answers;
                return { ...saved, results: remainingResults, answers: remainingAnswers };
              });
              setAttempt(value => value + 1);
            }}
            method={progress.learningChecks?.[task.id]?.method}
            practiceLink={nextPractice(data.tasks, task, progress, helpUsed)}
            onNext={() => idx + 1 < list.length ? open(list[idx + 1].id, true) : draft.update(saved => ({ ...saved, summary: true }))}
            last={idx === list.length - 1} />
        </TabsContent> : <Alert className="study-empty"><AlertTitle>Нет задач этой сложности</AlertTitle><AlertDescription>Выбери «Все», чтобы вернуться к подборке.</AlertDescription></Alert>}
      </div>
    </Tabs>
  </div></ShellA>;
}

