import { withProgressWrite } from "@/lib/progressLock";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { assessmentChanged, submitCt } from "@/lib/hooks";
import { CT_DRAFT_CONFLICT, createCtDraftStore, ctDuration, ctReportFor, ctResultMatchesAttempt } from "@/lib/ctDraft";

export const CT_SUBMIT_TIMEOUT_MS = 20000;
const QUEST_SAVE_ERROR = "Бланк сохранён. Ответы пока не учтены в квесте дня.";

export const hasAnswer = (v) => typeof v === "string" ? /^[−-]?\d+$/.test(v)
  : v !== undefined && v !== null && !(Array.isArray(v) && !v.length);

// While this page is open, an adjustment to the system clock cannot return
// spent time. The wall clock still catches up after throttling or suspension.
function elapsedClock(startedAt) {
  let elapsed = Math.max(0, Date.now() - startedAt);
  let last = window.performance.now();
  return (total, skip) => {
    const now = window.performance.now();
    elapsed = Math.max(elapsed + Math.max(0, now - last), Date.now() - startedAt);
    last = now;
    return Math.min(total, Math.floor(elapsed / 1000) + skip);
  };
}

function completeAnswer(task, value) {
  if (task.part === "A") {
    const option = index => Number.isInteger(index) && index >= 1 && index <= task.options.length;
    return task.kind === "multi" ? Array.isArray(value) && value.length > 0 && value.every(option) : option(value);
  }
  return typeof value === "string" && value.length <= 8 && hasAnswer(value);
}

function sameAnswer(a, b) {
  return a === b || Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every(value => b.includes(value));
}

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
  const [clock] = useState(() => ({ read: elapsedClock(attempt.startedAt) }));
  const elapsed = () => clock.read(total, attemptRef.current.skip);
  const [timer] = useState(() => createCountdown(hasDraft ? total - elapsed() : total));
  // Only the clock readout subscribes to every second.
  const expired = useSyncExternalStore(timer.subscribe, timer.getExpired, timer.getExpired);
  const [result, setResult] = useState(report);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const pendingAnswers = useRef(new Map(Object.entries(attempt.questAnswers ?? {})));
  const [saveError, setSaveError] = useState(store.error ?? (report && pendingAnswers.current.size ? QUEST_SAVE_ERROR : null));
  const [resetRetry, setResetRetry] = useState(null);
  const [completionPending, setCompletionPending] = useState(false);
  const submission = useRef("intro");
  const submissionSnapshot = useRef(null);
  const activeRequest = useRef(null);
  useEffect(() => () => {
    activeRequest.current?.abort();
    activeRequest.current = null;
  }, []);
  const completedResult = useRef(report);
  const previousResult = useRef(initialPrevious);
  const { answers, flags } = attempt;
  const current = Math.max(0, tasks.findIndex(task => task.id === attempt.currentTaskId));

  function saveIssue(message, retry = null) {
    setSaveError(message);
    setResetRetry(retry);
  }

  function setActiveAttempt(next) {
    attemptRef.current = next;
    setAttempt(next);
  }

  function recordAnswers(next) {
    for (const [id, answeredAt] of pendingAnswers.current) {
      const task = tasks.find(item => item.id === id);
      if (!task || !completeAnswer(task, next.answers[id]) || onAnswer?.(task, answeredAt) !== false) {
        pendingAnswers.current.delete(id);
      }
    }
    return pendingAnswers.current.size ? QUEST_SAVE_ERROR : null;
  }

  function saveAttempt(next) {
    const { questAnswers, ...sheet } = next;
    if (pendingAnswers.current.size) sheet.questAnswers = Object.fromEntries(pendingAnswers.current);
    const failed = store.write(sheet);
    return failed ?? recordAnswers(next);
  }

  const updateAttempt = change => {
    if (stopStaleCompletion(completedElsewhere())) return;
    const next = change(attemptRef.current);
    // Persist at the action boundary, including multiple actions in one event.
    setActiveAttempt(next);
    withProgressWrite(() => {
      // Inputs update immediately. A more recent queued sheet already contains
      // these edits and will also retry any pending quest writes.
      if (attemptRef.current !== next) return;
      const failed = saveAttempt(next);
      if (!stopStaleCompletion(failed === CT_DRAFT_CONFLICT ? failed : null)) saveIssue(failed);
    });
  };

  useEffect(() => {
    if (stage !== "exam" && stage !== "resume") return undefined;
    const tick = () => timer.update(total - elapsed());
    tick();
    if (timer.getExpired()) return undefined;
    const id = setInterval(() => {
      tick();
      if (timer.getExpired()) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
    // Clock and attempt ref remain stable while the run is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, timer, total]);

  const start = () => {
    if ((stage !== "intro" && stage !== "resume") || submission.current === "conflict") return;
    if (stopStaleCompletion(store.checkConflict() ?? (stage === "resume" ? completedElsewhere() : null))) return;
    const t = Date.now();
    const runId = globalThis.crypto?.randomUUID?.() ?? t.toString(36) + Math.random().toString(36).slice(2);
    const next = { ...empty(), startedAt: t, runId };
    const failed = store.write(next);
    if (stopStaleCompletion(failed === CT_DRAFT_CONFLICT ? failed : null)) return;
    if (failed && stage === "resume") {
      saveIssue("Не удалось начать заново. Прежняя попытка осталась открытой.", "start");
      return;
    }
    // With no previous draft, testing may begin in memory if storage is down.
    submission.current = "idle";
    submissionSnapshot.current = null;
    pendingAnswers.current.clear();
    previousResult.current = latestResult();
    setActiveAttempt(next);
    clock.read = elapsedClock(t);
    timer.update(total);
    saveIssue(failed);
    setResult(null);
    setCompletionPending(false);
    completedResult.current = null;
    setError(false);
    setStage("exam");
  };

  const resume = () => {
    if (stage !== "resume" || submission.current === "conflict"
      || stopStaleCompletion(store.checkConflict() ?? completedElsewhere())) return;
    if (resetRetry) saveIssue(null);
    if (pendingAnswers.current.size) saveIssue(recordAnswers(attemptRef.current));
    submission.current = "idle";
    timer.update(total - elapsed());
    setStage("exam");
  };

  const finish = async () => {
    if (stage !== "exam" || submission.current !== "idle" || stopStaleCompletion(store.checkConflict() ?? completedElsewhere())) return;
    // The ref closes the gap before React renders sending=true, including a
    // manual finish racing the timer. A completed attempt stays closed.
    submission.current = "pending";
    const request = new window.AbortController();
    activeRequest.current = request;
    const deadline = window.setTimeout(() => request.abort(), CT_SUBMIT_TIMEOUT_MS);
    setSending(true);
    setError(false);
    try {
      const { questAnswers, ...attemptToSend } = attemptRef.current;
      // A retry of the same sheet keeps its first submit time. Changing an
      // answer creates a new snapshot; flags and navigation leave it intact.
      if (submissionSnapshot.current?.answers !== attemptToSend.answers) {
        submissionSnapshot.current = { answers: attemptToSend.answers, elapsed: elapsed() };
      }
      const stopped = new Promise((_, reject) => {
        request.signal.addEventListener("abort", () => reject(new Error("Submission interrupted")), { once: true });
      });
      const checked = await Promise.race([
        submit(attemptToSend.answers, submissionSnapshot.current.elapsed, request.signal), stopped,
      ]);
      if (activeRequest.current !== request) return;
      const r = { ...checked, draftKey:store.key, attempt:JSON.stringify(attemptToSend) };
      if (!await withProgressWrite(() => activeRequest.current === request && persistCompletion(r))) return;
      const saved = latestResult();
      const shown = saved?.attempt === r.attempt && saved.draftKey === r.draftKey ? saved : r;
      submission.current = "done";
      completedResult.current = shown;
      setResult(shown);
      setStage("result");
    } catch (e) {
      if (activeRequest.current !== request) return;
      submission.current = "idle";
      setError(assessmentChanged(e) ? "version" : "network");
    } finally {
      window.clearTimeout(deadline);
      if (activeRequest.current === request) {
        activeRequest.current = null;
        setSending(false);
      }
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
    setError("conflict");
    saveIssue(conflict);
    return true;
  }

  function clearDraft() {
    const failed = recordAnswers(attemptRef.current) ?? store.write(null);
    if (!stopStaleCompletion(failed === CT_DRAFT_CONFLICT ? failed : null)) saveIssue(failed);
  }

  function persistCompletion(value) {
    // The checked answer sheet remains recoverable until the game save accepts
    // the completion. Retrying this step never resubmits or awards twice.
    if (!value) return false;
    if (stopStaleCompletion(store.checkConflict() ?? completedElsewhere(value))) {
      completedResult.current = null;
      setCompletionPending(false);
      setResult(null);
      setStage("exam");
      return false;
    }
    let accepted = false;
    try { accepted = onFinish?.(value, previousResult.current) !== false; } catch { accepted = false; }
    setCompletionPending(!accepted);
    if (accepted) clearDraft();
    else saveIssue("Результат не записан. Ответы остались в попытке; повтори сохранение.");
    return true;
  }

  useEffect(() => {
    if (stage === "exam" && expired && !error) withProgressWrite(finish);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired, stage]);

  const setAnswer = (id, v) => {
    if (stage !== "exam" || submission.current !== "idle" || elapsed() >= total) return;
    const task = tasks.find(t => t.id === id);
    if (!task || sameAnswer(attemptRef.current.answers[id], v)) return;
    updateAttempt(saved => {
      const next = { ...saved.answers };
      if (v === undefined) delete next[id];
      else next[id] = v;
      if (completeAnswer(task, v)) pendingAnswers.current.set(id, Date.now());
      else pendingAnswers.current.delete(id);
      return { ...saved, answers: next };
    });
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
    updateAttempt(saved => ({ ...saved, skip: saved.skip + Math.max(0, total - elapsed() - 600) }));
    timer.update(total - elapsed());
  };
  const goTo = (id) => {
    const i = tasks.findIndex((t) => t.id === id);
    if (i >= 0) setCurrent(i);
  };
  const answeredCount = tasks.filter((t) => hasAnswer(answers[t.id])).length;

  const restart = () => {
    if (stage !== "result" || submission.current === "conflict" || completionPending) return;
    const failed = store.write(null);
    if (stopStaleCompletion(failed === CT_DRAFT_CONFLICT ? failed : null)) return;
    if (failed) {
      saveIssue("Не удалось подготовить новую попытку. Результат остаётся доступен.", "restart");
      return;
    }
    submission.current = "intro";
    completedResult.current = null;
    saveIssue(null);
    setActiveAttempt(empty());
    timer.update(total);
    setError(false);
    setStage("intro");
  };

  const retrySave = () => {
    if (submission.current === "conflict" || submission.current === "pending") return;
    if (resetRetry === "start") return start();
    if (resetRetry === "restart") return restart();
    if (stage === "result") {
      if (completionPending) persistCompletion(completedResult.current);
      else if (saveError) clearDraft();
    } else if (!stopStaleCompletion(completedElsewhere())) {
      const failed = saveAttempt(attemptRef.current);
      if (!stopStaleCompletion(failed === CT_DRAFT_CONFLICT ? failed : null)) saveIssue(failed);
    }
  };

  return {
    stage, tasks, total, timer, expired, title: data.title ?? "Демо ЦТ", runKey: attempt.runId ?? attempt.startedAt,
    answers, flags, current, result, sending, answeredCount, error, saveError, warning: store.warning,
    completionPending, resetRetry,
    setAnswer, toggleFlag, setCurrent, goTo, skipToEnd,
    start: () => withProgressWrite(start), resume: () => withProgressWrite(resume),
    finish: () => withProgressWrite(finish),
    retrySave: () => withProgressWrite(retrySave), restart: () => withProgressWrite(restart),
  };
}
