import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { assessmentChanged, submitCt } from "@/lib/hooks";
import { CT_DRAFT_CONFLICT, createCtDraftStore, ctDuration, ctElapsed, ctReportFor, ctResultMatchesAttempt } from "@/lib/ctDraft";

export const hasAnswer = (v) => typeof v === "string" ? /^[−-]?\d+$/.test(v)
  : v !== undefined && v !== null && !(Array.isArray(v) && !v.length);

function createCountdown(remaining) {
  const listeners = new Set();
  return {
    getRemaining: () => remaining,
    getExpired: () => remaining <= 0,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(seconds) {
      if (remaining === seconds) return;
      remaining = seconds;
      listeners.forEach(listener => listener());
    },
  };
}

export function useCtExam(data, { onAnswer, onFinish, submit = submitCt, savedResult, readResult } = {}) {
  const tasks = data?.tasks ?? [];
  const total = ctDuration(data);
  const [store] = useState(() => createCtDraftStore(data));
  // A report belongs to one content version and one exact attempt. A leftover
  // draft after refused cleanup must not turn a completed test into a new run.
  const [{ initialPrevious, report }] = useState(() => {
    const initialPrevious = latestResult();
    return { initialPrevious, report: ctReportFor(data, store, initialPrevious) };
  });
  const hasDraft = Boolean(store.saved) && !report;
  const empty = () => ({ answers: {}, flags: [], currentTaskId: tasks[0]?.id, startedAt: 0, skip: 0 });
  const [attempt, setAttempt] = useState(() => store.saved ?? empty());
  const attemptRef = useRef(attempt);
  const [stage, setStage] = useState(hasDraft ? "resume" : report ? "result" : "intro");
  const [timer] = useState(() => createCountdown(hasDraft ? total - ctElapsed(attempt, total, Date.now()) : total));
  // Only the clock readout subscribes to every second.
  const expired = useSyncExternalStore(timer.subscribe, timer.getExpired, timer.getExpired);
  const [result, setResult] = useState(report);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const [saveError, setSaveError] = useState(store.error);
  const [completionPending, setCompletionPending] = useState(false);
  const submission = useRef("intro");
  const completedResult = useRef(report);
  const previousResult = useRef(initialPrevious);
  const { answers, flags } = attempt;
  const current = Math.max(0, tasks.findIndex(task => task.id === attempt.currentTaskId));

  const updateAttempt = change => {
    if (stage === "exam" && stopStaleCompletion(completedElsewhere())) return CT_DRAFT_CONFLICT;
    const next = change(attemptRef.current);
    // Persist at the action boundary, including multiple actions in one event;
    // do not wait for a render effect or a debounced unload callback.
    const writeError = store.write(next);
    setSaveError(writeError);
    attemptRef.current = next;
    setAttempt(next);
    return writeError;
  };

  useEffect(() => {
    if (stage !== "exam" && stage !== "resume") return undefined;
    const tick = () => timer.update(total - ctElapsed(attemptRef.current, total, Date.now()));
    tick();
    if (timer.getExpired()) return undefined;
    const id = setInterval(() => {
      tick();
      if (timer.getExpired()) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [stage, timer, total]);

  const elapsedAt = time => ctElapsed(attemptRef.current, total, time);

  const start = () => {
    if (submission.current === "pending" || submission.current === "conflict") return;
    submission.current = "idle";
    previousResult.current = latestResult();
    const t = Date.now();
    const runId = globalThis.crypto?.randomUUID?.() ?? t.toString(36) + Math.random().toString(36).slice(2);
    updateAttempt(() => ({ ...empty(), startedAt: t, runId }));
    timer.update(total);
    setResult(null);
    setCompletionPending(false);
    completedResult.current = null;
    setError(false);
    setStage("exam");
  };

  const resume = () => {
    if (stage !== "resume") return;
    submission.current = "idle";
    timer.update(total - elapsedAt(Date.now()));
    setStage("exam");
  };

  const finish = async () => {
    if (stage !== "exam" || submission.current !== "idle" || stopStaleCompletion(store.checkConflict() ?? completedElsewhere())) return;
    // The ref closes the gap before React renders sending=true, including a
    // manual finish racing the timer. A completed attempt stays closed.
    submission.current = "pending";
    setSending(true);
    setError(false);
    try {
      // Background tabs can throttle the display timer. Use the actual finish
      // time for the submitted duration, capped by the exam limit.
      const checked = await submit(attemptRef.current.answers, elapsedAt(Date.now()));
      const r = { ...checked, draftKey:store.key, attempt:JSON.stringify(attemptRef.current) };
      if (!persistCompletion(r)) return;
      const saved = latestResult();
      const shown = saved?.attempt === r.attempt && saved.draftKey === r.draftKey ? saved : r;
      submission.current = "done";
      completedResult.current = shown;
      setResult(shown);
      setStage("result");
    } catch (e) {
      submission.current = "idle";
      setError(assessmentChanged(e) ? "version" : "network");
    } finally {
      setSending(false);
    }
  };

  function latestResult() {
    const live = readResult?.();
    return live === undefined ? savedResult ?? null : live;
  }

  function completedElsewhere(candidate) {
    const latest = latestResult();
    const sameRun = ctResultMatchesAttempt(latest, store.key, attemptRef.current)
      || ctResultMatchesAttempt(latest, store.source?.key, attemptRef.current);
    return sameRun && (latest.attempt !== candidate?.attempt || latest.draftKey !== candidate?.draftKey) ? CT_DRAFT_CONFLICT : null;
  }

  function stopStaleCompletion(conflict) {
    if (!conflict) return false;
    submission.current = "conflict";
    completedResult.current = null;
    setError("conflict");
    setSaveError(conflict);
    setCompletionPending(false);
    setResult(null);
    setStage("exam");
    return true;
  }

  function persistCompletion(value) {
    // The checked answer sheet remains recoverable until the game save accepts
    // the completion. Retrying this step never resubmits or awards twice.
    if (!value || stopStaleCompletion(store.checkConflict() ?? completedElsewhere(value))) return false;
    let accepted = false;
    try { accepted = onFinish?.(value, previousResult.current) !== false; } catch { accepted = false; }
    setCompletionPending(!accepted);
    setSaveError(accepted ? store.write(null) : "Результат не записан. Ответы остались в попытке; повтори сохранение.");
    return true;
  }

  useEffect(() => {
    if (stage === "exam" && expired && !error) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired, stage]);

  const setAnswer = (id, v) => {
    if (stage !== "exam" || submission.current !== "idle" || elapsedAt(Date.now()) >= total) return;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const writeError = updateAttempt(saved => {
      const next = { ...saved.answers };
      if (v === undefined) delete next[id];
      else next[id] = v;
      return { ...saved, answers: next };
    });
    const complete = task.part === "A"
      ? task.kind === "multi"
        ? Array.isArray(v) && v.length > 0 && v.every(index => Number.isInteger(index) && index >= 1 && index <= task.options.length)
        : Number.isInteger(v) && v >= 1 && v <= task.options.length
      : task.part === "B" && hasAnswer(v) && String(v).length <= 8 && Number.isInteger(Number(String(v).replace("−", "-")));
    if (complete && !writeError) onAnswer?.(task);
  };
  const toggleFlag = id => {
    if (stage !== "exam" || submission.current !== "idle" || !tasks.some(task => task.id === id)) return;
    updateAttempt(saved => ({ ...saved, flags: saved.flags.includes(id) ? saved.flags.filter(x => x !== id) : [...saved.flags, id] }));
  };
  const setCurrent = index => {
    if (stage !== "exam" || submission.current !== "idle" || !Number.isInteger(index) || !tasks[index]) return;
    updateAttempt(saved => ({ ...saved, currentTaskId: tasks[index].id }));
  };
  const skipToEnd = () => {
    if (stage !== "exam" || submission.current !== "idle") return;
    const time = Date.now();
    updateAttempt(saved => ({ ...saved, skip: saved.skip + Math.max(0, total - elapsedAt(time) - 600) }));
    timer.update(total - elapsedAt(time));
  };
  const goTo = (id) => {
    const i = tasks.findIndex((t) => t.id === id);
    if (i >= 0) setCurrent(i);
  };
  const answeredCount = tasks.filter((t) => hasAnswer(answers[t.id])).length;

  return {
    stage, tasks, total, timer, expired, title: data.title ?? "Демо ЦТ",
    answers, setAnswer, flags, toggleFlag, current, setCurrent, goTo,
    start, resume, finish, skipToEnd, result, sending, answeredCount, error, saveError, warning: store.warning, completionPending,
    retrySave: () => {
      if (stage === "result") persistCompletion(completedResult.current);
      else if (!stopStaleCompletion(completedElsewhere())) setSaveError(store.write(attemptRef.current));
    },
    restart: () => {
      if (submission.current === "pending" || completionPending) return;
      submission.current = "intro";
      completedResult.current = null;
      setSaveError(store.write(null));
      const initial = empty();
      attemptRef.current = initial;
      setAttempt(initial);
      timer.update(total);
      setStage("intro");
    },
  };
}
