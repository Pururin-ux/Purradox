import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, BookOpen, Calculator as CalcIcon, Clock3, LayoutGrid, PawPrint, RotateCcw, ScanLine, X } from "lucide-react";
import { ShellA } from "./ShellA";
import { BrandMark } from "./BrandMark";
import { AnswerSign } from "./AnswerA";
import { Rich } from "@/components/shared/Tex";
import { VtGraph } from "@/components/shared/VtGraph";
import { CtResult } from "./CtReview";
import { Calculator } from "@/components/shared/Calculator";
import { useCtExam, hasAnswer } from "@/components/shared/useCtExam";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogTrigger, DialogPortal, DialogOverlay, DialogSurface, DialogClose, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useCtVariant, submitVariant, submitCt } from "@/lib/hooks";
import { useSfx, haptic } from "@/lib/sound";
import { clock, answerText, plural } from "@/lib/format";
import { LINKS } from "@/lib/nav";
import { trackUnique, readCtResult, recordCt, useGame, useProfileGeneration } from "@/lib/game";
import { ctDraftKey } from "@/lib/ctDraft";
import { CompanionPortrait } from "./Companion";

function DomesticScene() {
  return <figure className="ct-intro-cast ct-domestic">
    <picture>
      <source media="(max-width:760px)" srcSet="/art/learning-graphic-20261106/ct-mobile-336.webp 336w, /art/learning-graphic-20261106/ct-mobile-672.webp 672w"
        sizes="(max-width:660px) 218px, 330px" width="336" height="252" />
      <img srcSet="/art/learning-graphic-20261106/ct-desktop-560.webp 560w, /art/learning-graphic-20261106/ct-desktop-1120.webp 1120w"
        sizes="(min-width:1180px) 548px, 46vw" src="/art/learning-graphic-20261106/ct-desktop-560.webp" width="560" height="420" decoding="async" fetchPriority="high"
        alt="Девушка пытается забрать карандаш, который Мефистофель прижал лапой к блокноту." draggable="false" />
    </picture>
  </figure>;
}

function SaveNotice({ exam }) {
  if (!exam.saveError) return null;
  const conflict = exam.error === "conflict";
  return <Alert className="ct-notice ct-save-notice" role="alert" data-testid="ct-save-error">
    <AlertTitle>{conflict ? "Попытка уже обновилась" : "Попытка не сохранена"}</AlertTitle>
    <AlertDescription>{exam.saveError}</AlertDescription>
    {conflict ? <Button type="button" className="ct-secondary" onClick={() => window.location.reload()}>Открыть сохранённую попытку</Button>
      : exam.stage !== "intro" && <Button type="button" className="ct-secondary" disabled={exam.sending} onClick={exam.retrySave} data-testid="ct-retry-save">Повторить сохранение</Button>}
  </Alert>;
}

function ExamClock({ timer, resume = false }) {
  const remaining = useSyncExternalStore(timer.subscribe, timer.getRemaining, timer.getRemaining);
  const time = clock(remaining);
  if (resume) return <div className="ct-resume-timer" hidden={remaining === 0} role="timer" aria-live="off" aria-label={"Осталось " + time} data-testid="ct-resume-timer">
    <Clock3 aria-hidden="true" /><strong>{time}</strong><span>осталось</span>
  </div>;
  return <div className="ct-timer" role="timer" data-urgent={remaining <= 600 || undefined} data-testid="ct-timer" aria-label={"Осталось " + time}>
    <Clock3 aria-hidden="true" />{time}
  </div>;
}

function Resume({ exam }) {
  const { expired } = exam;
  const task = exam.tasks[exam.current];
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus({ preventScroll:true }); }, []);
  return <div className="ct-layout ct-entry ct-resume" data-testid="ct-resume">
    <h1 tabIndex={-1} ref={heading}>{exam.title}</h1>
    <div className="ct-intro-grid ct-entry-grid ct-resume-grid">
      <CompanionPortrait className="ct-return-portrait" />
      <Card className="ct-card ct-resume-card">
        <CardHeader className="ct-resume-heading">
          <CardTitle className="ct-intro-title" role="heading" aria-level={2} data-testid="ct-resume-place">{expired ? "Время вышло" : "Продолжим с " + task.code + "?"}</CardTitle>
          <CardDescription className="ct-resume-progress">Заполнено {exam.answeredCount} из {exam.tasks.length}{exam.flags.length > 0 ? ". С закладкой: " + exam.flags.length : ""}.</CardDescription>
        </CardHeader>
        <CardContent className="ct-resume-content">
          <ExamClock timer={exam.timer} resume />
          <p>{expired ? "Бланк сохранён. Его можно сдать." : "Отсчёт продолжался, пока тебя не было."}</p>
        </CardContent>
        <CardFooter className="ct-intro-actions ct-resume-actions">
          <Button type="button" className="study-next ct-resume-primary" onClick={exam.resume} data-testid="ct-resume-btn">{expired ? "Проверить ответы" : "Продолжить"}<span className="ct-action-paws" aria-hidden="true"><PawPrint data-icon="inline-start" /><PawPrint data-icon="inline-start" /></span><ArrowRight aria-hidden="true" data-icon="inline-end" /></Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button type="button" variant="ghost" className="ct-secondary" data-testid="ct-resume-restart"><RotateCcw aria-hidden="true" data-icon="inline-start" />Начать заново</Button></AlertDialogTrigger>
            <AlertDialogContent className="ct-modal ct-confirm">
              <AlertDialogHeader>
                <AlertDialogTitle className="ct-dialog-title">Начать новую попытку?</AlertDialogTitle>
                <AlertDialogDescription className="ct-dialog-description">Ответы и закладки этой попытки сбросятся. Отсчёт начнётся заново.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="ct-dialog-actions">
                <AlertDialogCancel asChild><Button type="button" variant="secondary" className="ct-secondary" data-testid="ct-restart-cancel">Оставить попытку</Button></AlertDialogCancel>
                <AlertDialogAction asChild><Button type="button" className="study-next ct-compact" onClick={exam.start} data-testid="ct-restart-confirm">Начать заново</Button></AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  </div>;
}

function Intro({ data, exam }) {
  const play = useSfx();
  const title = useRef(null);
  useEffect(() => { title.current?.focus({ preventScroll:true }); title.current?.scrollIntoView?.({ block:"start" }); }, []);
  const count = data.tasks.length;
  const sections = data.sections.filter(section => data.tasks.some(task => task.section === section.id));
  return <div className="ct-layout ct-entry ct-intro">
    <h1 ref={title} tabIndex={-1}>{data.title ?? "Демо ЦТ"}</h1>
    <div className="ct-intro-grid ct-entry-grid">
      <DomesticScene />
      <Card className="ct-card ct-intro-card">
        <CardHeader className="ct-intro-heading">
          <CardTitle className="ct-intro-title" role="heading" aria-level={2}>{count} {plural(count, "задание", "задания", "заданий")} по физике</CardTitle>
          <Badge variant="secondary" className="ct-time-limit"><Clock3 aria-hidden="true" />{data.minutes ?? 210} минут</Badge>
        </CardHeader>
        <CardContent className="ct-intro-content">
          <dl className="ct-rules" data-testid="ct-rules">
            <div><dt>Часть А</dt><dd>{data.variantId ? "Выбери один или несколько ответов — смотри подпись задания." : "Выбери один ответ."}</dd></div>
            <div><dt>Часть В</dt><dd>Впиши целое число в указанных единицах.</dd></div>
          </dl>
          <p>К заданиям можно возвращаться через бланк. Сложные отмечай закладкой.</p>
          <p>Если в условии не сказано иначе, <span className="ct-inline-formula">g = 10 м/с²</span>.</p>
        </CardContent>
        <CardFooter className="ct-intro-actions">
          <Button type="button" className="study-next" onClick={() => { play("ok"); exam.start(); }} data-testid="ct-start-btn">
            Начать тест<ArrowRight aria-hidden="true" data-icon="inline-end" />
          </Button>
          <Button asChild variant="ghost" className="ct-secondary"><Link to={LINKS.textbook}><BookOpen aria-hidden="true" data-icon="inline-start" />К учебнику</Link></Button>
        </CardFooter>
      </Card>
    </div>
    <div className="ct-intro-notes">
      <p data-testid="ct-fragment-note">{data.independent ? "После сдачи увидишь результат по разделам и ссылки на уроки."
        : data.variantId ? "Вариант собран из задач тренажёра." : "Здесь можно попробовать бланк и открыть разбор после сдачи."}</p>
      {sections.length > 0 && <ul className="ct-topic-list" aria-label="Разделы варианта">{sections.map(section => <li key={section.id}><Badge variant="secondary">{section.title}</Badge></li>)}</ul>}
    </div>
  </div>;
}

function Sheet({ exam, filter, setFilter, onPick }) {
  const current = exam.tasks[exam.current]?.id;
  const blanks = exam.tasks.length - exam.answeredCount;
  const marked = new Set(exam.flags);
  const isGap = task => !hasAnswer(exam.answers[task.id]);
  const matches = task => filter === "all" || (filter === "blank" ? isGap(task) : marked.has(task.id));
  const parts = ["A", "B"].map(part => {
    const tasks = exam.tasks.filter(task => task.part === part);
    return { title: part === "A" ? "Часть А" : "Часть В", total: tasks.length,
      filled: tasks.filter(task => !isGap(task)).length, slots: tasks.filter(matches) };
  });
  const next = [...exam.tasks.slice(exam.current + 1), ...exam.tasks.slice(0, exam.current)]
    .find(task => filter === "flagged" ? marked.has(task.id) : isGap(task));
  const compact = exam.tasks.length <= 8;
  const pick = id => { exam.goTo(id); onPick?.(); };
  const title = <CardTitle className="ct-sheet-title" role="heading" aria-level={2}>Бланк ответов</CardTitle>;
  return <Card className="ct-card ct-sheet" data-testid="ct-answer-sheet">
    <CardHeader className="ct-sheet-head">
      <div className="ct-sheet-title-row">
        {onPick ? <DialogTitle asChild>{title}</DialogTitle> : title}
        {onPick && <DialogClose asChild><Button type="button" variant="ghost" className="ct-modal-close" aria-label="Закрыть бланк" data-testid="ct-sheet-close"><X aria-hidden="true" /></Button></DialogClose>}
      </div>
      <div className="ct-sheet-meter">
        <ScanLine aria-hidden="true" />
        <Progress value={100 * exam.answeredCount / exam.tasks.length}
          getValueLabel={() => `${exam.answeredCount} из ${exam.tasks.length}`} aria-label="Задания с ответом" />
        <span className="ct-sheet-count" data-testid="ct-answered-count" aria-hidden="true">{exam.answeredCount}/{exam.tasks.length}</span>
      </div>
      <ToggleGroup type="single" className="ct-sheet-filters" aria-label="Какие задания показать" value={filter}
        onValueChange={value => { if (value) setFilter(value); }}>
        <ToggleGroupItem value="all" data-testid="ct-sheet-filter-all">Все</ToggleGroupItem>
        <ToggleGroupItem value="blank" data-testid="ct-sheet-filter-blank">Пропуски <span>{blanks}</span></ToggleGroupItem>
        <ToggleGroupItem value="flagged" data-testid="ct-sheet-filter-flagged">Закладки <span>{marked.size}</span></ToggleGroupItem>
      </ToggleGroup>
    </CardHeader>
    <CardContent className="ct-sheet-content">
      {!parts.some(part => part.slots.length) && <p className="ct-sheet-empty" role="status">{filter === "blank" ? "Все задания с ответами." : "Закладок пока нет."}</p>}
      {parts.filter(part => part.slots.length > 0).map(({ title, total, filled, slots }) => <section key={title} className="ct-sheet-section" aria-label={title}>
        <h3><span>{title}</span><span>{filled} из {total} с ответом</span></h3>
        <div className="ct-sheet-grid" data-compact={compact || undefined}>
          {slots.map(slot => {
            const value = exam.answers[slot.id], filled = hasAnswer(value), flagged = marked.has(slot.id);
            const shownValue = filled ? answerText(null, Array.isArray(value) ? [...value].sort((a, b) => a - b) : value) : "—";
            const label = slot.code + ": " + (filled ? shownValue : "без ответа") + (flagged ? ", закладка" : "");
            return <Button key={slot.id} type="button" variant="ghost" className="ct-slot"
              data-wide={slot.part === "B" && shownValue.length > 5 || undefined}
              data-filled={filled || undefined} data-current={current === slot.id || undefined} data-flagged={flagged || undefined}
              aria-current={current === slot.id ? "step" : undefined} aria-label={label} title={label}
              onClick={() => pick(slot.id)} data-testid={"ct-answer-sheet-slot-" + slot.id.toLowerCase()}>
              <span className="ct-slot-code">{slot.code}</span>
              <span className="ct-slot-value">{shownValue}</span>
              {flagged && <Bookmark aria-hidden="true" className="ct-slot-flag" />}
            </Button>;
          })}
        </div>
      </section>)}
    </CardContent>
    {next && <CardFooter className="ct-sheet-foot">
      <Button type="button" variant="secondary" className="ct-sheet-jump" onClick={() => pick(next.id)} data-testid="ct-sheet-jump">
        {filter === "flagged" ? "К закладке" : "К пропуску"} <strong>{next.code}</strong><ArrowRight aria-hidden="true" data-icon="inline-end" />
      </Button>
    </CardFooter>}
  </Card>;
}

function TaskView({ task, exam, section, onFinish, articleRef }) {
  const play = useSfx();
  const [numberError, setNumberError] = useState(false);
  const numberInput = useRef(null);
  const value = exam.answers[task.id], flagged = exam.flags.includes(task.id), last = exam.current === exam.tasks.length - 1;
  const id = task.id.toLowerCase(), locked = Boolean(exam.sending || exam.expired);
  const setNumber = next => {
    // Reject the complete invalid edit instead of changing 2,5 into 25.
    const valid = next.length <= 8 && /^[−-]?\d*$/.test(next);
    setNumberError(!valid);
    if (valid) exam.setAnswer(task.id, next);
  };
  return <Card className="ct-card ct-task" role="region" aria-labelledby={"ct-heading-" + id} tabIndex={-1} ref={articleRef} data-testid={"ct-task-" + id}>
    <CardHeader className="ct-task-heading">
      <CardTitle className="ct-task-title" role="heading" aria-level={2} id={"ct-heading-" + id}><Badge className="ct-task-code" data-testid="ct-task-code">{task.code}</Badge><span>{section || "Задание"}</span></CardTitle>
      <CardDescription id={"ct-answer-kind-" + id} className="ct-task-kind">{task.part === "A" ? task.kind === "multi" ? "Несколько ответов" : "Один ответ" : "Ответ в " + task.unit}</CardDescription>
    </CardHeader>
    <CardContent className="ct-task-content">
      <p className="ct-question"><Rich text={task.text} /></p>
      {task.graph && <div className="ct-question-graph"><VtGraph graph={task.graph} theme="study" compact /></div>}
      <div className="ct-answer">
        {task.part === "A" ? <ToggleGroup type={task.kind === "multi" ? "multiple" : "single"} className="ct-choices" aria-label={"Ответ на " + task.code} value={task.kind === "multi" ? (value ?? []).map(String) : value == null ? "" : String(value)} disabled={locked}
          onValueChange={next => { play("tap"); haptic(8); exam.setAnswer(task.id, task.kind === "multi" ? next.map(Number) : next ? Number(next) : undefined); }}>
          {task.options.map((option, index) => <ToggleGroupItem key={index} value={String(index + 1)} className="ct-choice" data-testid={"ct-option-" + id + "-" + (index + 1)}>
            <span className="ct-choice-number">{index + 1}</span><Rich text={option} />
          </ToggleGroupItem>)}
        </ToggleGroup> : <>
          <div className="ct-number-row">
            <Input ref={numberInput} className="ct-number-input" inputMode="numeric" placeholder="Ответ" aria-label={"Ответ на " + task.code}
              value={value ?? ""} disabled={locked} aria-invalid={numberError} aria-describedby={"ct-answer-kind-" + id + (numberError ? " ct-number-error-" + id : "")}
              onChange={event => setNumber(event.target.value)} data-testid={"ct-answer-input-" + id} />
            <span className="ct-answer-unit">{task.unit}</span>
            <AnswerSign value={String(value ?? "")} inputRef={numberInput} onValueChange={setNumber} disabled={locked} testId="ct-answer-sign" />
          </div>
          {numberError && <p id={"ct-number-error-" + id} role="status" className="ct-number-error">Нужно целое число: до 8 знаков, включая минус. Ответ не изменён.</p>}
        </>}
      </div>
    </CardContent>
    <CardFooter className="ct-task-actions">
      <Button type="button" variant="ghost" className="ct-secondary ct-back" disabled={exam.current === 0} onClick={() => exam.setCurrent(exam.current - 1)} data-testid="ct-prev-btn"><ArrowLeft aria-hidden="true" data-icon="inline-start" />Назад</Button>
      <Button type="button" variant="ghost" className="ct-secondary ct-flag" disabled={locked} onClick={() => { play("pop"); exam.toggleFlag(task.id); }} data-testid="ct-flag-btn" aria-pressed={flagged}>
        {flagged ? <BookmarkCheck aria-hidden="true" data-icon="inline-start" /> : <Bookmark aria-hidden="true" data-icon="inline-start" />}{flagged ? "В закладках" : "В закладки"}
      </Button>
      <Button type="button" className="study-next ct-next" disabled={exam.sending} onClick={event => last ? onFinish?.(event.currentTarget) : exam.setCurrent(exam.current + 1)} data-testid="ct-next-btn" aria-haspopup={last ? "dialog" : undefined}>
        {last ? "Завершить" : "Дальше"}<ArrowRight aria-hidden="true" data-icon="inline-end" />
      </Button>
    </CardFooter>
  </Card>;
}

function SubmissionNotice({ exam, inConfirm = false }) {
  if (exam.error === "conflict") return <SaveNotice exam={exam} />;
  return <Alert role={exam.error ? "alert" : "status"} className="ct-notice" data-testid={inConfirm ? "ct-submit-error" : "ct-submission-status"}>
    <AlertTitle role="heading" aria-level={3}>{exam.error ? "Бланк не отправлен" : "Отправляем бланк…"}</AlertTitle>
    <AlertDescription>
      <p>{(exam.expired ? "Время вышло. " : "") + (exam.error ? (exam.saveError === null ? "Ответы сохранены. " : "Ответы остаются в этой вкладке. ") + (exam.error === "version" ? "Вариант обновился. Перезагрузи страницу перед отправкой." : "Проверь соединение и повтори отправку.") : "Ждём результат проверки.")}</p>
      {exam.error === "network" && !inConfirm && <Button type="button" className="study-next ct-compact" disabled={exam.sending} onClick={exam.finish} data-testid="ct-retry-submit">Отправить ещё раз</Button>}
    </AlertDescription>
  </Alert>;
}

function Confirm({ exam, onCloseAutoFocus }) {
  const empty = exam.tasks.length - exam.answeredCount;
  return <DialogPortal>
    <DialogOverlay className="ct-dialog-overlay" />
    <DialogSurface className="ct-modal ct-confirm" aria-modal="true" data-testid="ct-confirm-modal" onCloseAutoFocus={onCloseAutoFocus}
      onEscapeKeyDown={event => { if (exam.sending) event.preventDefault(); }} onPointerDownOutside={event => { if (exam.sending) event.preventDefault(); }}>
      <DialogTitle className="ct-dialog-title">Завершить тест?</DialogTitle>
      <DialogDescription className="ct-dialog-description">Без ответа: {empty}. С закладкой: {exam.flags.length}. После отправки ответы этой попытки уже не изменить.</DialogDescription>
      {(exam.error || exam.sending) && <SubmissionNotice exam={exam} inConfirm />}
      <div className="ct-dialog-actions">
        <DialogClose asChild><Button type="button" variant="secondary" className="ct-secondary" disabled={exam.sending} data-testid="ct-confirm-cancel-btn">К заданиям</Button></DialogClose>
        <Button type="button" className="study-next ct-compact" disabled={exam.sending || exam.error === "conflict"} onClick={exam.finish} data-testid="ct-confirm-finish-btn">{exam.sending ? "Отправляем…" : "Завершить"}</Button>
      </div>
    </DialogSurface>
  </DialogPortal>;
}

function Exam({ data, exam }) {
  const [calc, setCalc] = useState(false), [sheet, setSheet] = useState(false), [confirm, setConfirm] = useState(false);
  const [sheetFilter, setSheetFilter] = useState("all");
  const [sheetQuery] = useState(() => typeof window === "undefined" ? null : window.matchMedia?.("(max-width: 1100px)"));
  const [compactSheet, setCompactSheet] = useState(() => sheetQuery?.matches ?? false);
  const finishOrigin = useRef(null), article = useRef(null), pickedFromSheet = useRef(false);
  const play = useSfx(), task = exam.tasks[exam.current];
  const section = data.sections.find(item => item.id === task.section)?.title;
  useEffect(() => {
    if (!sheetQuery) return undefined;
    const sync = () => setCompactSheet(sheetQuery.matches);
    sheetQuery.addEventListener("change", sync);
    sync();
    return () => sheetQuery.removeEventListener("change", sync);
  }, [sheetQuery]);
  useEffect(() => {
    article.current?.focus({ preventScroll:true });
    article.current?.scrollIntoView?.({ block:"start" });
  }, [task.id]);
  const openFinish = origin => { finishOrigin.current = origin; setCalc(false); setSheet(false); setConfirm(true); };
  return <div className="ct-exam">
    <header className="ct-exam-top">
      <div className="ct-exam-top-inner">
        <div className="ct-exam-identity"><Button asChild variant="ghost" className="ct-tool ct-leave" title="К вариантам ЦТ · таймер продолжит идти"><Link to={LINKS.ct} aria-label="К вариантам ЦТ"><ArrowLeft aria-hidden="true" /></Link></Button><BrandMark /><div><h1>{data.title ?? "Демо ЦТ"}</h1><p>Задание {exam.current + 1} из {exam.tasks.length}</p></div></div>
        <ExamClock timer={exam.timer} />
        <div className="ct-exam-tools">
          <Dialog modal={false} open={calc} onOpenChange={next => { if (next) setSheet(false); setCalc(next); }}>
            <DialogTrigger asChild><Button type="button" variant="ghost" className="ct-tool" onClick={() => play("tap")} aria-label="Калькулятор" title="Калькулятор" data-testid="ct-calculator-toggle"><CalcIcon aria-hidden="true" /></Button></DialogTrigger>
            <DialogPortal><DialogSurface className="ct-calculator-surface" onInteractOutside={event => event.preventDefault()}>
              <Calculator dialog onClose={() => setCalc(false)} onKey={() => play("tap")} />
            </DialogSurface></DialogPortal>
          </Dialog>
          <Dialog open={sheet} onOpenChange={next => { if (next) { setCalc(false); pickedFromSheet.current = false; } setSheet(next); }}>
            <DialogTrigger asChild><Button type="button" variant="secondary" className="ct-tool ct-sheet-toggle"
              aria-label={`Бланк ответов, ${exam.answeredCount} из ${exam.tasks.length}`} data-testid="ct-sheet-toggle">
              <LayoutGrid aria-hidden="true" data-icon="inline-start" /><span>Бланк</span><span className="ct-sheet-trigger-count">{exam.answeredCount}/{exam.tasks.length}</span>
            </Button></DialogTrigger>
            <DialogPortal><DialogOverlay className="ct-dialog-overlay ct-sheet-overlay" /><DialogSurface className="ct-modal ct-sheet-modal" aria-modal="true"
              onCloseAutoFocus={event => { if (pickedFromSheet.current || !compactSheet) {
                event.preventDefault();
                // Don't take focus away if the next tap already focused a field.
                const owner = article.current?.ownerDocument;
                if (owner && owner.activeElement === owner.body) article.current?.focus({ preventScroll:true });
              } }}>
              <DialogDescription className="sr-only">Выбери номер для перехода к заданию.</DialogDescription>
              <Sheet exam={exam} filter={sheetFilter} setFilter={setSheetFilter} onPick={() => { pickedFromSheet.current = true; setSheet(false); }} />
            </DialogSurface></DialogPortal>
          </Dialog>
          <Button type="button" variant="outline" className="ct-tool ct-finish-control" onClick={event => openFinish(event.currentTarget)}
            disabled={exam.error === "conflict"} aria-haspopup="dialog" aria-expanded={confirm} data-testid="ct-finish-exam-btn">Завершить</Button>
        </div>
      </div>
    </header>
    <div className="ct-exam-layout">
      {exam.saveError && !(confirm && exam.error === "conflict") && <div className="ct-submission"><SaveNotice exam={exam} /></div>}
      {!confirm && (exam.error || exam.sending) && exam.error !== "conflict" && <div className="ct-submission"><SubmissionNotice exam={exam} /></div>}
      <TaskView key={task.id} task={task} exam={exam} section={section} onFinish={openFinish} articleRef={article} />
      {!compactSheet && !sheet && <aside className="ct-desktop-sheet"><Sheet exam={exam} filter={sheetFilter} setFilter={setSheetFilter} /></aside>}
    </div>
    <Dialog open={confirm} onOpenChange={next => { if (!exam.sending) setConfirm(next); }}>
      <Confirm exam={exam} onCloseAutoFocus={event => { event.preventDefault(); if (finishOrigin.current?.isConnected) finishOrigin.current.focus(); }} />
    </Dialog>
  </div>;
}

export default function CtA() {
  const { variantId } = useParams();
  const { data, isError, isFetching, refetch } = useCtVariant(variantId);
  if (!data && isError) return <ShellA><div className="ct-layout ct-load-state">
    <Alert className="ct-notice" data-testid="ct-load-error" aria-busy={isFetching}>
      <AlertTitle role="heading" aria-level={1}>Задания не загрузились</AlertTitle>
      <AlertDescription>Попробуй загрузить их ещё раз.</AlertDescription>
      <Button type="button" className="study-next ct-compact" disabled={isFetching} onClick={() => refetch()} data-testid="ct-load-retry">{isFetching ? "Загружаем…" : "Повторить загрузку"}</Button>
    </Alert>
  </div></ShellA>;
  if (!data) return <ShellA><div className="ct-layout ct-loading" role="status" aria-label="Загружаем задания ЦТ" data-testid="ct-loading"><Skeleton /><Skeleton /><span className="sr-only">Загружаем задания ЦТ…</span></div></ShellA>;
  return <CtContent key={ctDraftKey(data)} data={data} />;
}

function CtContent({ data }) {
  const g = useGame();
  const profileGeneration = useProfileGeneration();
  const id = data.variantId ?? "demo";
  const exam = useCtExam(data, {
    savedResult: g.examResults?.[id],
    readResult: () => readCtResult(id),
    submit: data.variantId ? submitVariant(data.variantId, data._assessment?.revision) : submitCt,
    onAnswer: task => trackUnique("ct_answer", "ct-" + id + ":" + task.id, profileGeneration),
    onFinish: (result, previousResult) => recordCt({ correct: result.correct, id, full: Boolean(data.variantId), result, previousResult, profileGeneration })
  });
  if (exam.stage === "exam") return <ShellA bare><Exam data={data} exam={exam} /></ShellA>;
  return <ShellA>
    {exam.warning && <div className="ct-layout ct-save-banner"><Alert className="ct-notice"><AlertDescription>{exam.warning}</AlertDescription></Alert></div>}
    {exam.saveError && <div className="ct-layout ct-save-banner"><SaveNotice exam={exam} /></div>}
    {exam.stage === "resume" ? <Resume exam={exam} /> : exam.stage === "result" ? <CtResult data={data} exam={exam} /> : <Intro data={data} exam={exam} />}
  </ShellA>;
}
