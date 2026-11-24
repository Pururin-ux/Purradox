import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, CircleAlert, RotateCcw } from "lucide-react";
import { ShellA } from "./ShellA";
import { Rich } from "@/components/shared/Tex";
import { VtGraph } from "@/components/shared/VtGraph";
import { LINKS } from "@/lib/nav";
import { plural } from "@/lib/format";
import { dayKey, mistakeGiven, mistakeTime, useGame } from "@/lib/game";
import { useLegacyReviewMetadata, useReviewItems, useTrainerTasks } from "@/lib/hooks";
import { canonicalTaskId } from "@/lib/progressIds";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const taskLink = (task, due = false) => '/trainer/' + task.lessonSlug + '?task=' + encodeURIComponent(task.id) + '&from=review' + (due ? '&recall=' + dayKey() : '');

// Ошибка старше трёх суток (или без метки времени из старых сохранений) —
// кандидат в «Пора повторить». Свежие промахи живут в отдельной полосе.
const DUE_MS = 72 * 3600 * 1000;
const failedAt = (mistakeAt, id) => {
  const t = Date.parse(mistakeTime(mistakeAt?.[id]));
  return Number.isNaN(t) ? 0 : t;
};

// Человеческий вид ответа: для выбора — текст вариантов, для числа — как введено.
const answerText = (item, value) => {
  if (value === undefined || value === null) return null;
  if (item.kind === "number") return String(value);
  const list = Array.isArray(value) ? value : [value];
  return list.map(n => item.options?.[n - 1] ?? n).join(", ");
};

const byChapter = list => {
  const groups = [];
  for (const task of list) {
    const title = task.chapter || task.lessonTitle;
    let group = groups.find(g => g.title === title);
    if (!group) {
      group = { title, items: [] };
      groups.push(group);
    }
    group.items.push(task);
  }
  return groups;
};

const ReviewTaskRow = ({ task, due }) => <Button asChild variant="ghost" className="review-task" data-testid={`review-task-${task.id}`}>
  <Link to={taskLink(task, due)}>
    <span className="review-task-code">{task.code}</span>
    <small className="review-lesson-name">{task.lessonTitle}</small>
    <span className="review-task-text"><Rich text={task.text} /></span>
    <span className="review-task-action"><span>Повторить</span><ArrowRight aria-hidden="true" /></span>
    {task.graph && <span className="review-task-graph"><VtGraph graph={task.graph} theme="study" /></span>}
  </Link>
</Button>;

const QuizReviewRow = ({ item }) => <Button asChild variant="ghost" className="review-task review-quiz-task" data-testid={`review-task-${item.id}`}>
  <Link to={"/lesson/" + item.lessonSlug + "?question=" + encodeURIComponent(item.id.slice(5))}>
    <span className="review-task-text"><small className="review-lesson-name">{item.lessonTitle} · вопрос из урока</small><Rich text={item.text} /></span>
    <span className="review-task-action"><span>Повторить</span><ArrowRight aria-hidden="true" /></span>
  </Link>
</Button>;

function PreviousAttempt({ item, given }) {
  const answer = answerText(item, given);
  if (answer === null) return null;
  return <details className="review-history">
    <summary>Прежний ответ</summary>
    <p><Rich text={answer} />{item.unit ? " " + item.unit : ""}</p>
  </details>;
}

const ChapterGroup = ({ group, mistakeAt, recallIds }) => <div className="review-chapter-group">
  <h3 className="review-chapter">{group.title}</h3>
  <div className="review-task-list">
    {group.items.map(task => {
      const given = mistakeGiven(mistakeAt[task.id], task.revision, task.legacyPositions, task.compatibleRevisions);
      return <div key={task.id} className="review-record"><ReviewTaskRow task={task} due={recallIds?.has(task.id)} />
        <PreviousAttempt item={task} given={given} />
      </div>;
    })}
  </div>
</div>;

function SpacedPractice({ due, progress }) {
  const { data } = useTrainerTasks(due.slug);
  if (!data) return null;
  const origin = data.tasks.find(task => task.id === due.id);
  if (!origin) return null;
  const alternative = data.tasks.find(task => task.id !== origin.id && task.lessonBlock === origin.lessonBlock
    && !progress.learningChecks?.[task.id] && !progress.solved.includes(task.id) && !progress.mistakes.includes(task.id));
  const query = alternative ? { task:alternative.id, transfer:origin.id } : { task:origin.id, from:"review", recall:dayKey() };
  return <section className="review-band" aria-label="Повторение после перерыва">
    <h2 className="review-band-title">Проверить после перерыва</h2>
    <p>{data.title}. {alternative ? "Реши новую задачу по этому правилу." : "Восстанови ход решения знакомой задачи без подсказки."}</p>
    <Button asChild variant="secondary"><Link to={"/trainer/" + due.slug + "?" + new URLSearchParams(query)}>К проверке</Link></Button>
  </section>;
}

export default function ReviewA() {
  const progress = useGame();
  const { mistakes, mistakeAt = {}, learningChecks = {}, allTaskIds = [] } = progress;
  const dueTopics = new Map();
  for (const [id, mark] of Object.entries(learningChecks)) {
    if (!mark.independentAt || !mark.lessonBlock) continue;
    const slug = id.split(":")[0];
    const key = slug + ":" + mark.lessonBlock;
    const at = Math.max(mark.independentAt, mark.recalledAt ?? 0);
    if (!dueTopics.has(key) || at > dueTopics.get(key).at) dueTopics.set(key, { slug, id, at });
  }
  const due = [...dueTopics.values()].filter(row => row.at <= Date.now() - DUE_MS
    && (!allTaskIds || allTaskIds.includes(row.id))).sort((a,b) => a.at - b.at)[0];
  const review = useReviewItems(mistakes);
  const items = review.data?.items ?? [];
  const taskItems = items.filter(item => !item.id.startsWith("quiz:"));
  // Older deployed APIs supply the previous answer but omit the task's card metadata.
  const legacyItems = taskItems.filter(item => item.chapter === undefined);
  const metadata = useLegacyReviewMetadata(legacyItems);
  const metadataById = new Map((legacyItems.length ? metadata.data?.tasks ?? [] : []).map(task => [task.id, task]));
  const tasks = taskItems.map(item => {
    const card = metadataById.get(canonicalTaskId(item.id));
    return card ? { ...card, ...item } : item;
  });
  const itemById = new Map(items.map(item => [item.id, item]));
  const quizItems = mistakes.map(id => itemById.get(id)).filter(item => item?.id.startsWith("quiz:"));
  const missing = review.data ? mistakes.filter(id => !itemById.has(id)).length : 0;
  const hasMistakes = mistakes.length > 0;
  const weakChapter = (() => {
    const counts = {};
    for (const task of tasks) {
      const key = task.chapter || task.lessonTitle;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    const [chapter, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? [];
    if (!chapter) return null;
    const first = tasks.find(task => (task.chapter || task.lessonTitle) === chapter);
    return { chapter, count: n, task: first };
  })();
  const byAge = tasks.map(task => ({ task, time: Math.max(failedAt(mistakeAt, task.id), learningChecks[task.id]?.checkedAt ?? 0) })).sort((a, b) => a.time - b.time);
  const dueBefore = Date.now() - DUE_MS;
  const dueTasks = [], recentTasks = [];
  const recallIds = new Set(byAge.filter(row => row.time > 0 && row.time <= dueBefore).map(row => row.task.id));
  for (const { task, time } of byAge) (time < dueBefore ? dueTasks : recentTasks).push(task);
  const metadataError = legacyItems.length > 0 && metadata.isError;
  const fetching = review.isFetching || (legacyItems.length > 0 && metadata.isFetching);

  return <ShellA>
    <div className="study-review">
      <header className="review-heading">
        <div className="review-heading-copy">
        <h1>Повторение</h1>
        {hasMistakes && <Badge variant="secondary" className="review-count" data-testid="review-count">
          <RotateCcw aria-hidden="true" />{mistakes.length} {plural(mistakes.length, "ошибка", "ошибки", "ошибок")}
        </Badge>}
        </div>
        {hasMistakes && <img className="review-companion"
          srcSet="/art/cast-reactions/20261106-graphic/cat-curious-144.webp 144w, /art/cast-reactions/20261106-graphic/cat-curious-288.webp 288w"
          sizes="(max-width:660px) 108px, 134px" src="/art/cast-reactions/20261106-graphic/cat-curious-144.webp"
          width="144" height="108" decoding="async" alt="" aria-hidden="true" draggable="false" />}
      </header>

      {due && <SpacedPractice due={due} progress={progress} />}
      {!hasMistakes ? <section className="review-empty" data-testid="review-empty" aria-labelledby="review-empty-title">
        <img src="/art/full-site-20261107/review-empty-tray-v1.webp" width="768" height="576" alt="" decoding="async" draggable="false" />
        <div className="review-empty-copy">
          <h2 id="review-empty-title">{due ? "Ошибок для разбора нет" : "Пока нечего повторять"}</h2>
          <p>Сюда попадут задачи и вопросы с ошибками.</p>
          <div className="review-empty-actions">
            <Button asChild className="study-next" data-testid="review-to-trainer-btn"><Link to={LINKS.practice}>К задачам<ArrowRight aria-hidden="true" data-icon="inline-end" /></Link></Button>
            <Button asChild variant="ghost" className="review-secondary" data-testid="review-to-lesson-btn"><Link to={LINKS.textbook}><BookOpen aria-hidden="true" data-icon="inline-start" />Открыть учебник</Link></Button>
          </div>
        </div>
      </section> : <>
        {!review.data && !review.isError && <div className="review-loading" role="status" aria-label="Загружаем задачи" data-testid="review-loading">
          <span className="sr-only">Загружаем задачи…</span>
          {[0, 1, 2].map(n => <Skeleton key={n} className="review-skeleton" />)}
        </div>}

        {(review.isError || metadataError) && <Alert className="review-notice" data-testid="review-load-error">
          <CircleAlert aria-hidden="true" />
          <AlertTitle role="heading" aria-level={2}>{review.data ? "Список не обновился" : "Задачи не загрузились"}</AlertTitle>
          <AlertDescription>Отметки об ошибках сохранены.</AlertDescription>
          <Button type="button" variant="secondary" className="review-secondary" disabled={fetching}
            onClick={() => { if (review.isError) review.refetch(); if (metadataError) metadata.refetch(); }} data-testid="review-reload-btn">
            <RotateCcw aria-hidden="true" data-icon="inline-start" />{fetching ? "Загружаем…" : "Повторить загрузку"}
          </Button>
        </Alert>}

        {review.data && <div className="review-queue" data-testid="review-tasks">
          {weakChapter && weakChapter.count > 1
            ? <p className="review-topic" data-testid="review-weak"><span>Больше всего отметок: <strong>{weakChapter.chapter}</strong> ({weakChapter.count})</span> <Link to={taskLink(weakChapter.task, recallIds.has(weakChapter.task.id))}>Открыть задачу<ArrowRight aria-hidden="true" /></Link></p>
            : null}
          {dueTasks.length > 0 && <section className="review-band" aria-label="Пора повторить" data-testid="review-due">
            <h2 className="review-band-title">Пора повторить</h2>
            <p className="review-band-sub">Прошло больше трёх дней.</p>
            {byChapter(dueTasks).map(group => <ChapterGroup key={group.title} group={group} mistakeAt={mistakeAt} recallIds={recallIds} />)}
          </section>}
          {recentTasks.length > 0 && <section className="review-band" aria-label="Недавние ошибки" data-testid="review-recent">
            <h2 className="review-band-title">Недавние ошибки</h2>
            {byChapter(recentTasks).map(group => <ChapterGroup key={group.title} group={group} mistakeAt={mistakeAt} />)}
          </section>}
          {quizItems.length > 0 && <section className="review-band" aria-label="Ошибки из проверок уроков" data-testid="review-quiz">
            <h2 className="review-band-title">Из проверок уроков</h2>
            <div className="review-task-list">
              {quizItems.map(item => <div key={item.id} className="review-record"><QuizReviewRow item={item} />
                <PreviousAttempt item={item} given={mistakeGiven(mistakeAt[item.id], item.revision, item.legacyPositions, item.compatibleRevisions)} />
              </div>)}
            </div>
          </section>}
          {missing > 0 && <Alert className="review-notice review-unavailable" role="note" data-testid="review-unavailable">
            <AlertTitle role="heading" aria-level={2}>Часть задач пока недоступна</AlertTitle>
            <AlertDescription>{missing} {plural(missing, "отметка сохранена", "отметки сохранены", "отметок сохранено")}. Этих задач пока нет в текущей подборке.</AlertDescription>
          </Alert>}
        </div>}

        <nav className="review-footer" aria-label="Дальше по теме">
          <Button asChild variant="secondary" className="review-secondary" data-testid="review-to-lesson-btn"><Link to={LINKS.textbook}><BookOpen aria-hidden="true" data-icon="inline-start" />Открыть учебник</Link></Button>
          <Button asChild variant="ghost" className="review-secondary" data-testid="review-to-trainer-btn"><Link to={LINKS.practice}>Все задачи<ArrowRight aria-hidden="true" data-icon="inline-end" /></Link></Button>
        </nav>
      </>}
    </div>
  </ShellA>;
}
