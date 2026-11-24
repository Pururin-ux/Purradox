import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bookmark, Clock3, FileCheck2, Timer, CircleAlert } from "lucide-react";
import { ShellA, LoadingA } from "./ShellA";
import { useCtDemo, useCtVariants } from "@/lib/hooks";
import { useGame } from "@/lib/game";
import { draftSummary } from "@/lib/draftStore";
import { createCtDraftStore, ctDuration, ctElapsed, ctReportFor, ctResultMatchesAttempt } from "@/lib/ctDraft";
import { plural } from "@/lib/format";
import { DRAFT_PREFIX, PROFILE_KEY } from "@/lib/progressStorage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

function savedAttempt(variant, report) {
  try {
    const total = ctDuration(variant);
    const draft = draftSummary("ct", variant.variantId, variant._assessment, localStorage,
      value => Number.isSafeInteger(value.startedAt) && value.startedAt > 0 && typeof value.currentTaskId === "string"
        && Number.isInteger(value.skip) && value.skip >= 0 && value.skip <= total);
    if (draft && !ctResultMatchesAttempt(report, draft.key, draft.value)) return draft.value;
  } catch { /* The exam page can explain an unreadable draft. */ }
  return null;
}
function PreviousReportLink({ path, demo }) {
  return <Button asChild variant="link" size="sm" className="min-h-11 px-0 underline">
    <Link to={path + "?report=previous"}>{demo ? "Предыдущий результат демо" : "Предыдущий результат"}</Link>
  </Button>;
}

export default function CtLobby() {
  const { data, error, refetch } = useCtVariants();
  const { data: demo } = useCtDemo();
  const game = useGame();
  const [now, setNow] = useState(Date.now);
  let nextDeadline = Infinity;
  const expiredAttempt = (attempt, total) => {
    if (!attempt) return false;
    const expired = ctElapsed(attempt, total, now) >= total;
    if (!expired) nextDeadline = Math.min(nextDeadline, attempt.startedAt + (total - attempt.skip) * 1000);
    return expired;
  };
  const variants = data?.variants.map(variant => {
    const report = game.examResults?.[variant.variantId];
    const attempt = savedAttempt(variant, report);
    return { variant, report, attempt, expired: expiredAttempt(attempt, ctDuration(variant)) };
  }).sort((a, b) => Number(Boolean(b.variant.independent)) - Number(Boolean(a.variant.independent)));
  const demoStore = demo && createCtDraftStore(demo);
  const demoReport = demo && ctReportFor(demo, demoStore, game.examResults?.demo);
  const demoAttempt = !demoReport && demoStore?.saved;
  const demoExpired = expiredAttempt(demoAttempt, ctDuration(demo));
  const demoAction = demoExpired ? "Открыть бланк демо" : demoAttempt ? "Продолжить демо" : demoReport ? "Результат демо" : "Открыть демо";
  const demoNote = demoExpired ? "Время вышло" : demoAttempt ? "Ответы сохранены" : demo && `${demo.tasks.length} ${plural(demo.tasks.length, "задание", "задания", "заданий")}`;
  useEffect(() => {
    if (!Number.isFinite(nextDeadline)) return;
    const tick = () => setNow(Date.now());
    const delay = Math.min(2_147_483_647, Math.max(0, nextDeadline - Date.now()));
    const timeout = window.setTimeout(tick, delay);
    return () => window.clearTimeout(timeout);
  }, [nextDeadline, now]);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const refreshDraft = event => {
      if (event.key === null || event.key === PROFILE_KEY || event.key.startsWith(DRAFT_PREFIX + "ct:")) refresh();
    };
    window.addEventListener("storage", refreshDraft);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.removeEventListener("storage", refreshDraft); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  return <ShellA><div className="ct-lobby">
    <header className="ct-lobby-heading">
      <h1>Практика ЦТ</h1>
      <p>Выбери вариант. Разбор откроется после сдачи.
        {demoAttempt && game.examResults?.demo && <><br /><PreviousReportLink path="/ct/demo" demo /></>}
      </p>
      <picture>
        <source media="(max-width:700px)" srcSet="/art/learning-graphic-20261106/ct-lobby-mobile.webp" width="540" height="405" />
        <img src="/art/learning-graphic-20261106/ct-lobby-desktop.webp" width="816" height="612" alt="" decoding="async" />
      </picture>
      <Button asChild variant="ghost" className="ct-demo-link">
        <Link to="/ct/demo"><Timer aria-hidden="true" /><span><strong>{demoAction}</strong>{demoNote && <small>{demoNote}</small>}</span><ArrowRight aria-hidden="true" /></Link>
      </Button>
    </header>
    <div className="ct-lobby-rules">
      <p><FileCheck2 aria-hidden="true" /><strong>30 заданий</strong><span>10 А и 20 В</span></p>
      <p><Clock3 aria-hidden="true" /><strong>210 минут</strong><span>Таймер идёт и вне вкладки</span></p>
      <p className="ct-lobby-save"><Bookmark aria-hidden="true" /><span>Ответы и место сохраняются.</span></p>
    </div>
    {!data && !error && <LoadingA />}
    {error && <Alert className="course-error"><CircleAlert aria-hidden="true" /><AlertTitle>Варианты не загрузились</AlertTitle><AlertDescription>Попробуй ещё раз.</AlertDescription><Button variant="secondary" onClick={() => refetch()}>Повторить</Button></Alert>}
    <div className="ct-variant-grid">
      {variants?.map(({ variant, report, attempt, expired }) => {
        const completed = game.completedExams.includes(variant.variantId);
        const showResult = report && !attempt;
        const state = expired ? "expired" : attempt ? "started" : completed ? "done" : undefined;
        const action = expired ? "Открыть бланк" : attempt ? "Продолжить" : showResult ? "Посмотреть результат" : completed ? "Пройти ещё раз" : variant.independent ? "Открыть диагностику" : "Открыть вариант";
        const tone = variant.independent ? "diagnostic" : variant.variantId === "02" ? "mint" : "violet";
        const path = "/ct/variant/" + variant.variantId;
        return <Card className="ct-variant-card" key={variant.variantId} data-tone={tone}>
          <CardContent>
            <div className="ct-variant-title">
              <h2>{variant.title}</h2>
              {state && <Badge className="ct-variant-state" data-status={state}>{expired ? "Время вышло" : attempt ? "Начат" : "Пройден"}</Badge>}
            </div>
            <p>{variant.independent ? variant.description : "Задачи из тренажёра. " + variant.description}
              {attempt && report && <><br /><PreviousReportLink path={path} /></>}
            </p>
            <Button asChild variant={showResult ? "secondary" : "default"} className={showResult ? "ct-variant-action" : "ct-variant-action study-next"}>
              <Link to={path}>{action}<ArrowRight aria-hidden="true" /></Link>
            </Button>
          </CardContent>
        </Card>;
      })}
    </div>
    <p className="ct-lobby-source">Содержание курса сверено с <a href="https://adu.by/images/2026/10/26-30/VI-VO/Programma-VI-Fizika-VO-rus-2027.pdf" target="_blank" rel="noreferrer">программой вступительных испытаний 2027 года</a>. Бланк и время полной тренировки заданы по <a href="https://phys-ct.sdamgia.ru/doc/spec/spec_ct26_phys.pdf" target="_blank" rel="noreferrer">спецификации ЦТ 2026</a>. В отчёте указано число полностью верных ответов. Экзаменационные баллы не рассчитываются.</p>
  </div></ShellA>;
}
