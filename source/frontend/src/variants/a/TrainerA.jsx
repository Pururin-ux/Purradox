import { useEffect, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowRight, Check, CheckCircle2, Lightbulb, ListChecks, PawPrint, RotateCcw } from "lucide-react";
import { ShellA, LoadingA } from "./ShellA";
import { AnswerA, Steps } from "./AnswerA";
import { TrainerReaction } from "./TrainerReaction";
import { TrainerFigure } from "./TrainerFigures";
import { REACTION_ART_ENABLED, reactionForAnswer } from "@/lib/studyReactions";
import { Rich } from "@/components/shared/Tex";
import { TypoFlag } from "@/components/shared/TypoFlag";
import { VtGraph } from "@/components/shared/VtGraph";
import { useTrainerTasks, checkTask } from "@/lib/hooks";
import { failTask, saveTrainerSolution, syncQuestTasks, trainerProgressAt, useGame, useProfileGeneration } from "@/lib/game";
import { answerLabel } from "@/lib/format";
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
import { DraftResume, DraftSaveNotice } from "./DraftResume";
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

function needsTrainerSave(progress, taskId, result) {
  if (!result?.correct) return false;
  const id = canonicalTaskId(taskId);
  if (result.checkedAt !== undefined && result.checkedAt < trainerProgressAt(progress, id)) return false;
  return !progress.solved.includes(id) || (progress.mistakes.includes(id) && Number.isSafeInteger(result.checkedAt));
}

export function TaskCard({ task, revision, onResult, onNext, onRetry, onHint, onSaveSolution, res, draft, onDraftChange, last, nextLink, previousFailures = 0, resolved = false }) {
  const [hint, setHint] = useState(false);
  const [sol, setSol] = useState(Boolean(res && !res.correct && !resolved));
  const [reaction, setReaction] = useState(null);
  const play = useSfx();
  const canAdvance = res?.correct || resolved;
  return (
    <Card className="study-task-card" data-testid={"trainer-task-" + task.id}>
      <CardHeader className="study-task-heading">
        <CardTitle role="heading" aria-level={2} className="study-task-title">
          <Badge className="study-task-code" data-testid="trainer-task-code">{task.code}</Badge>
          <span>{partLabel(task)}</span>
        </CardTitle>
        <div className="study-task-tools"><Badge variant="secondary" className="study-difficulty">{LEVELS[task.level]?.label}</Badge><TypoFlag id={task.id} text={task.text} compact /></div>
      </CardHeader>
      <CardContent className="study-task-content" data-resolved={resolved || undefined}>
        <p className="study-question" data-testid="trainer-task-text"><Rich text={task.text} /></p>
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
        <div className="study-answer">
          <AnswerA item={task} check={(id, answer) => checkTask(id, answer, revision)} tid={"trainer-" + task.id} draft={draft} onDraftChange={onDraftChange}
            initialResult={res} onResult={result => {
              setSol(!result.correct);
              setReaction(REACTION_ART_ENABLED ? reactionForAnswer(result.correct, previousFailures) : null);
              onResult(result);
            }} />
        </div>
        {res && <div className="study-feedback">
          <Alert role="region" aria-label="Результат проверки" className="study-verdict" data-outcome={canAdvance ? "right" : "wrong"}
            data-pose={resolved ? undefined : reaction?.pose} data-illustrated={Boolean(reaction && !resolved) || undefined} data-testid="trainer-verdict">
            {reaction && !resolved && <TrainerReaction key={reaction.pose} reaction={reaction} />}
            <div className="study-verdict-copy" role="status">
              <div className="study-verdict-title">
                {canAdvance ? <CheckCircle2 aria-hidden="true" /> : <AlertCircle aria-hidden="true" />}
                <AlertTitle role="heading" aria-level={3}>{resolved ? "Задача уже решена" : res.correct ? "Верно" : "Есть ошибка"}</AlertTitle>
              </div>
              {resolved ? <AlertDescription>Прежний ответ остался в черновике.</AlertDescription> :
                !res.correct && <AlertDescription>{task.kind === "number" ? "Правильный ответ: " : Array.isArray(res.answer) ? "Верные варианты: " : "Верный вариант: "}<strong>{answerLabel(task, res.answer)}</strong></AlertDescription>}
              {onSaveSolution && <AlertDescription>Решение пока не записалось в прогресс.</AlertDescription>}
            </div>
            {onSaveSolution ? <Button type="button" className="study-next study-verdict-next" onClick={onSaveSolution}
              data-testid="trainer-save-solution">Сохранить решение</Button> : canAdvance && nextLink ?
            <Button asChild className="study-next study-verdict-next"><Link to={nextLink}>К повторению<ArrowRight aria-hidden="true" /></Link></Button> :
            <Button type="button" className="study-next study-verdict-next" onClick={canAdvance ? onNext : onRetry}
              data-testid={canAdvance ? "trainer-next-btn" : "trainer-retry-btn"}
              aria-label={canAdvance ? (last ? "К первой задаче" : "Следующая задача") : "Ещё раз"}>
              <span className="study-next-wide">{canAdvance ? (last ? "К первой задаче" : "Следующая задача") : "Ещё раз"}</span>
              <span className="study-next-short">{canAdvance ? (last ? "К первой" : "Дальше") : "Ещё раз"}</span>
              {canAdvance && !last && <span className="trainer-next-paws" aria-hidden="true"><PawPrint /><PawPrint /></span>}
              {!canAdvance || last ? <RotateCcw aria-hidden="true" data-icon="inline-end" /> : <ArrowRight aria-hidden="true" data-icon="inline-end" />}
            </Button>}
          </Alert>
          <div className="study-result-actions">
            <Button type="button" variant="secondary" className="study-solution-toggle"
              onClick={() => setSol(value => !value)} aria-expanded={sol} aria-controls={"solution-" + task.id}
              data-testid="trainer-solution-toggle-btn"><ListChecks aria-hidden="true" data-icon="inline-start" />{sol ? "Скрыть разбор" : "Разбор решения"}</Button>
            {resolved && <Button type="button" variant="ghost" className="study-retry" onClick={onRetry}
              data-testid="trainer-retry-btn"><RotateCcw aria-hidden="true" data-icon="inline-start" />Решить ещё раз</Button>}
            {!canAdvance && !nextLink && <Button type="button" variant="ghost" className="study-retry" onClick={onNext}
              data-testid="trainer-next-btn"><ArrowRight aria-hidden="true" data-icon="inline-start" />{last ? "К первой задаче" : "Следующая задача"}</Button>}
          </div>
          {sol && <section className="study-solution" id={"solution-" + task.id} data-testid="trainer-solution" aria-label="Разбор решения">
            <TrainerFigure task={task} phase="solution" />
            <Steps steps={res.solution} />
          </section>}
        </div>}
      </CardContent>
    </Card>
  );
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
  if (params.get("from") === "review") return <TrainerReview key={learningDraftKey("trainer", slug, data) + ":" + requestedTask}
    data={data} slug={slug} task={data.tasks.find(task => task.id === requestedTask)} />;
  return <TrainerContent key={learningDraftKey("trainer", slug, data) + ":" + (requestedTask ?? "")}
    data={data} slug={slug} requestedTask={requestedTask} />;
}

function TrainerReview({ data, slug, task }) {
  const profileGeneration = useProfileGeneration();
  const progress = useGame();
  const taskId = task?.id;
  const scope = taskId ? slug + "-" + taskId.split(":").at(-1) : slug;
  const draft = useLearningDraft("trainer-review", scope, data, taskId);
  const [result, setResult] = useState(() => {
    const stored = draft.value.results[taskId];
    return needsTrainerSave(progress, taskId, stored) ? stored : null;
  });
  const [attempt, setAttempt] = useState(0);
  const revision = data._assessment?.revision;
  const hinted = Boolean(draft.value.helpUsed[taskId]);
  const markHint = () => draft.update(saved => ({ ...saved, helpUsed: { [taskId]: true } }));
  const saveSolution = checkedAt => {
    if (saveTrainerSolution(taskId, { hinted, profileGeneration, checkedAt })) draft.restart();
  };
  const shownAnswer = result?.correct
    ? { input: task.kind === "number" ? result.given : "", choice: task.kind === "number" ? null : result.given }
    : draft.value.answers[taskId];
  return <ShellA><div className="study-trainer trainer-graphic">
    <DraftSaveNotice error={draft.error ?? draft.warning} />
    <header className="study-heading">
      <h1>{data.title}</h1>
      {!result?.correct && <Button asChild variant="secondary"><Link to={LINKS.review}>К повторению</Link></Button>}
    </header>
    {task ? <TaskCard key={attempt} task={task} revision={revision} res={result} last
      draft={shownAnswer} onDraftChange={answer => draft.update(saved => ({ ...saved, answers: { [taskId]: answer } }))}
      onHint={markHint}
      onSaveSolution={needsTrainerSave(progress, taskId, result) ? () => saveSolution(result.checkedAt) : undefined}
      nextLink={LINKS.review} onRetry={() => {
        draft.update(saved => ({ ...saved, answers: {}, results: {} }));
        setResult(null); setAttempt(n => n + 1);
      }}
      onResult={outcome => {
        if (!draft.isCurrentProfile()) return;
        if (outcome.correct) {
          const checked = { ...outcome, checkedAt: Date.now() };
          draft.update(saved => ({ ...saved, results: { [taskId]: checked } }));
          setResult(checked);
          saveSolution();
        } else {
          setResult(outcome);
          markHint();
          failTask(taskId, outcome.given, revision, profileGeneration);
        }
      }} /> : <Alert><AlertDescription>В текущей подборке этой задачи нет.</AlertDescription></Alert>}
  </div></ShellA>;
}
function TrainerContent({ data, slug, requestedTask }) {
  useEffect(() => { syncQuestTasks(data.tasks.map(task => task.id)); }, [data.tasks]);
  const draft = useLearningDraft("trainer", slug, data, requestedTask);
  const { level, taskId: cur, results, helpUsed } = draft.value;
  const [attempt, setAttempt] = useState(0);
  const [failures, setFailures] = useState({});
  const progress = useGame();
  const profileGeneration = useProfileGeneration();
  const play = useSfx();
  const list = data.tasks.filter(item => !level || item.level === level);
  const task = list.find(item => item.id === cur) ?? list[0];
  const idx = list.indexOf(task);
  const isSolved = id => progress.solved.includes(canonicalTaskId(id));
  const solved = data.tasks.filter(item => isSolved(item.id)).length;
  const outcome = id => {
    if (progress.mistakes.includes(canonicalTaskId(id))) return false;
    if (isSolved(id)) return true;
    return results[id]?.correct === false ? false : undefined;
  };
  const needsSave = task && needsTrainerSave(progress, task.id, results[task.id]);
  const saveSolution = checkedAt => saveTrainerSolution(task.id, { hinted: Boolean(helpUsed[task.id]), profileGeneration, checkedAt });

  const open = id => {
    play("tap");
    draft.update(value => ({ ...value, taskId: id }));
    setAttempt(value => value + 1);
  };
  const changeLevel = value => {
    if (!value) return;
    const nextLevel = Number(value);
    const nextList = data.tasks.filter(item => !nextLevel || item.level === nextLevel);
    play("tap");
    draft.update(saved => ({
      ...saved, level: nextLevel,
      taskId: nextList.some(item => item.id === saved.taskId) ? saved.taskId : nextList[0]?.id ?? saved.taskId,
    }));
  };
  const onResult = result => {
    if (!draft.isCurrentProfile()) return;
    const checked = result.correct ? { ...result, checkedAt: Date.now() } : result;
    draft.update(value => ({ ...value, results: { ...value.results, [task.id]: checked },
      helpUsed: result.correct ? value.helpUsed : { ...value.helpUsed, [task.id]: true } }));
    if (result.correct) saveSolution();
    else {
      setFailures(value => ({ ...value, [task.id]: (value[task.id] ?? 0) + 1 }));
      failTask(task.id, result.given, data._assessment?.revision, profileGeneration);
    }
  };

  if (draft.pending) return <ShellA><DraftSaveNotice error={draft.warning} /><DraftResume title={data.title} kind="trainer"
    savedAt={draft.savedAt} results={results}
    position={{ label: task ? "Задача " + task.code : "Задача в подборке", current: idx + 1, total: list.length }}
    onResume={draft.resume} onRestart={draft.restart} /></ShellA>;

  return <ShellA><div className="study-trainer trainer-graphic">
    <DraftSaveNotice error={draft.error ?? draft.warning} />
    <picture className="trainer-room" aria-hidden="true">
      <source media="(max-width: 1100px)"
        srcSet="/art/ambient-graphic-20261106/evening-mobile-v2-600.webp 600w, /art/ambient-graphic-20261106/evening-mobile-v2-1320.webp 1320w"
        sizes="(max-width: 660px) 67vw, 60vw" width="600" height="338" />
      <img srcSet="/art/ambient-graphic-20261106/evening-wide-v1-990.webp 990w, /art/ambient-graphic-20261106/evening-wide-v1-1672.webp 1672w"
        sizes="990px" src="/art/ambient-graphic-20261106/evening-wide-v1-990.webp" alt="" width="990" height="557"
        decoding="async" fetchPriority="high" />
    </picture>
    <header className="study-heading">
      <div><h1>{data.title}</h1></div>
      <div className="study-topic-meta">
        <Badge variant="secondary" className="study-grade">{data.grade} класс</Badge>
        <div className="study-progress">
          <span data-testid="trainer-solved-count">Решено <b>{solved}</b> из {data.tasks.length}</span>
          <div className="trainer-progress-track">
            <Progress value={data.tasks.length ? solved/data.tasks.length*100 : 0} aria-label={"Решено " + solved + " из " + data.tasks.length} />
            {solved > 0 && <PawPrint className="trainer-progress-paw" aria-hidden="true"
              style={{left:`clamp(8px, ${solved/data.tasks.length*100}%, calc(100% - 8px))`}} />}
          </div>
        </div>
      </div>
    </header>
    <ToggleGroup type="single" value={String(level)} onValueChange={changeLevel} className="study-level-filter"
      aria-label="Сложность задач" data-testid="trainer-level-filter">
      {LEVELS.map(item => <ToggleGroupItem key={item.v} value={String(item.v)}
        disabled={item.v > 0 && !data.tasks.some(task => task.level === item.v)}
        data-testid={"trainer-level-" + item.v}>{item.label}</ToggleGroupItem>)}
    </ToggleGroup>
    <Tabs value={task?.id ?? ""} onValueChange={open} className="study-task-tabs" activationMode="manual">
      <TooltipProvider delayDuration={280} skipDelayDuration={100}>
      <TabsList className="study-task-strip" aria-label="Задачи" data-testid="trainer-task-strip">
        {list.map(item => {
          const result = outcome(item.id);
          return <Tooltip key={item.id}><TooltipTrigger asChild><TabsTrigger value={item.id} className="study-task-tab"
            data-outcome={result === true ? "right" : result === false ? "wrong" : "new"}
            aria-label={item.code + (result === true ? ", решено" : result === false ? ", есть ошибка" : "")}
            data-testid={"trainer-task-tab-" + item.id}>
            {item.code}{result === true && <Check aria-hidden="true" />}{result === false && <AlertCircle aria-hidden="true" />}
          </TabsTrigger></TooltipTrigger>
            <TooltipContent className="trainer-tab-tooltip" side="top" sideOffset={9}>
              {partLabel(item)} <span aria-hidden="true">·</span> {LEVELS[item.level]?.label}
            </TooltipContent>
          </Tooltip>;
        })}
      </TabsList>
      </TooltipProvider>
      <div className="study-workspace">
        {task ? <TabsContent value={task.id} className="study-task-panel">
          <TaskCard key={task.id + "-" + attempt} task={task} revision={data._assessment?.revision} res={results[task.id] ?? null}
            resolved={results[task.id]?.correct === false && outcome(task.id) === true}
            previousFailures={failures[task.id] ?? 0}
            draft={draft.value.answers[task.id]}
            onDraftChange={value => draft.update(saved => ({ ...saved, answers: { ...saved.answers, [task.id]: value } }))}
            onResult={onResult}
            onSaveSolution={needsSave ? () => saveSolution(results[task.id].checkedAt) : undefined}
            onHint={() => draft.update(saved => ({ ...saved, helpUsed: { ...saved.helpUsed, [task.id]: true } }))}
            onRetry={() => {
              if (results[task.id]?.correct === false) setFailures(value => ({ ...value, [task.id]: Math.max(1, value[task.id] ?? 0) }));
              draft.update(saved => {
                const { [task.id]: result, ...remainingResults } = saved.results;
                const { [task.id]: answer, ...remainingAnswers } = saved.answers;
                return { ...saved, results: remainingResults, answers: remainingAnswers };
              });
              setAttempt(value => value + 1);
            }}
            onNext={() => open(list[(idx + 1) % list.length].id)}
            last={idx === list.length - 1} />
        </TabsContent> : <Alert className="study-empty"><AlertTitle>Нет задач этой сложности</AlertTitle><AlertDescription>Выбери «Все», чтобы вернуться к подборке.</AlertDescription></Alert>}
      </div>
    </Tabs>
  </div></ShellA>;
}

