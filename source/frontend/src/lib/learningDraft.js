import { withProgressWrite } from "./progressLock";
import { useCallback, useRef, useState } from "react";
import { saveLearningResult } from "@/lib/game";
import { currentDraftKey, mappedId, openDraftStore, remapChoice, remapEntries } from "./draftStore";

const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const own = (value, key) => Object.hasOwn(value, key);
const text = (value, limit) => typeof value === "string" && value.length <= limit;
const READ_ERROR = "Не удалось прочитать черновик. Новые ответы пока останутся только в этой вкладке.";
const INVALID_ERROR = "Черновик не удалось открыть. Исходная запись сохранена; новые ответы пока останутся только в этой вкладке.";
const WRITE_ERROR = "Черновик не записан. Ответы остаются в этой вкладке; проверь доступ к данным браузера.";
const CONFLICT_ERROR = "Черновик изменился в другой вкладке. Твои ответы здесь остались, но не перезаписали её данные.";

// Prefer the grading revision. The old fingerprint is retained for the demo
// and for reading replies from an older backend.
export function learningDraftKey(kind, slug, data) {
  if (data._assessment) return currentDraftKey(kind, slug, data._assessment);
  const source = JSON.stringify(data);
  let a = 2166136261, b = 5381;
  for (let i = 0; i < source.length; i++) {
    a = Math.imul(a ^ source.charCodeAt(i), 16777619);
    b = Math.imul(b, 33) ^ source.charCodeAt(i);
  }
  return `kvant_draft_v1:${kind}:${encodeURIComponent(slug)}:${(a >>> 0).toString(16)}.${(b >>> 0).toString(16)}`;
}

export function initialLearningDraft(kind, data) {
  return kind === "lesson"
    ? { cardId: "intro", guess: "", quiz: { idx: 0, results: {} }, answers: {} }
    : { taskId: data.tasks[0].id, level: 0, answers: {}, results: {}, helpUsed: {} };
}

function validAnswer(item, value) {
  const option = (n) => Number.isInteger(n) && n >= 1 && n <= (item.options?.length ?? 0);
  if (!record(value) || !text(value.input, 32)) return false;
  if (item.kind === "number") return value.choice === null;
  if (item.kind === "multi") return Array.isArray(value.choice) && value.choice.length <= item.options.length
    && new Set(value.choice).size === value.choice.length && value.choice.every(option);
  return value.choice === null || option(value.choice);
}

function validResult(item, value) {
  if (!record(value) || typeof value.correct !== "boolean") return false;
  if (value.attemptId !== undefined && (!text(value.attemptId, 80) || !value.attemptId
    || !Number.isSafeInteger(value.checkedAt) || value.checkedAt < 0)) return false;
  const answer = value.answer;
  const option = (n) => Number.isInteger(n) && n >= 1 && n <= (item.options?.length ?? 0);
  if (item.kind === "number" ? !Number.isFinite(answer)
    : item.kind === "multi" ? !(Array.isArray(answer) && answer.every(option)) : !option(answer)) return false;
  if (value.explanation !== undefined && !text(value.explanation, 12000)) return false;
  if (value.reaction !== undefined && !text(value.reaction, 2000)) return false;
  return value.solution === undefined || Array.isArray(value.solution) && value.solution.length <= 40 && value.solution.every((step) =>
    record(step) && text(step.text, 12000) && (step.tex === undefined || text(step.tex, 12000)));
}

export function validLearningDraft(kind, data, value) {
  if (!record(value)) return false;
  const items = Object.fromEntries((kind === "lesson" ? data.quiz : data.tasks).map((item) => [item.id, item]));
  const map = (entries, check) => record(entries) && Object.entries(entries).every(([id, entry]) => own(items, id) && check(items[id], entry));
  if (!map(value.answers, validAnswer)) return false;
  if (kind === "lesson") {
    return text(value.guess, 6) && /^[\d,.]*$/.test(value.guess) && record(value.quiz)
      && Number.isInteger(value.quiz.idx) && value.quiz.idx >= 0 && value.quiz.idx < data.quiz.length
      && map(value.quiz.results, (item, result) => validResult(item, result) && text(result.explanation, 12000))
      && (value.cardId === "intro" || data.blocks.some((block) => block.id === value.cardId)
        || value.cardId === "finish" && data.quiz.every((item) => own(value.quiz.results, item.id)));
  }
  return (value.summary === undefined || typeof value.summary === "boolean")
    && (value.firstResults === undefined || map(value.firstResults, (_, correct) => typeof correct === "boolean"))
    && own(items, value.taskId) && Number.isInteger(value.level) && value.level >= 0 && value.level <= 3
    && map(value.results, (item, result) => validResult(item, result) && Array.isArray(result.solution))
    && map(value.helpUsed, (_, used) => used === true);
}

export function createLearningDraftStore(kind, slug, data, providedStorage) {
  const key = learningDraftKey(kind, slug, data);
  return openDraftStore({
    kind, slug, key, assessment: data._assessment, storage: () => providedStorage ?? window.localStorage,
    valid: value => validLearningDraft(kind, data, value),
    migrate: (value, plan) => migrateLearningDraft(kind, data, value, plan),
    messages: { read: READ_ERROR, invalid: INVALID_ERROR, write: WRITE_ERROR, conflict: CONFLICT_ERROR },
  });
}

function migrateLearningDraft(kind, data, value, plan) {
  const answers = remapEntries(value.answers, plan, (entry, mapping, id) => ({
    ...entry, choice: remapChoice(entry.choice, mapping, id),
  }));
  const results = remapEntries(kind === "lesson" ? value.quiz.results : value.results, plan, (entry, mapping, id) => ({
    ...entry, answer: remapChoice(entry.answer, mapping, id),
    ...(entry.given === undefined ? {} : { given: remapChoice(entry.given, mapping, id) }),
  }));
  if (kind === "lesson") {
    const idx = plan.quizOrder
      ? data.quiz.findIndex(item => item.id === plan.quizOrder[value.quiz.idx]) : value.quiz.idx;
    return { ...value, answers, quiz: { ...value.quiz, idx, results } };
  }
  const taskId = mappedId(value.taskId, plan);
  const task = data.tasks.find(item => item.id === taskId);
  const level = value.level && task && task.level !== undefined && task.level !== value.level ? 0 : value.level;
  return { ...value, taskId, level, answers, results,
    ...(value.firstResults && { firstResults: remapEntries(value.firstResults, plan) }), helpUsed: remapEntries(value.helpUsed, plan) };
}

export function useLearningDraft(kind, slug, data, requestedTask) {
  const [store] = useState(() => createLearningDraftStore(kind, slug, data));
  const directTask = kind !== "lesson" && data.tasks.some((task) => task.id === requestedTask) ? requestedTask : null;
  const fresh = () => initialLearningDraft(kind, data);
  const [value, setValue] = useState(() => {
    const loaded = store.saved ?? fresh();
    return directTask ? { ...loaded, taskId: directTask, level: 0, summary: false } : loaded;
  });
  const current = useRef(value);
  const [pending, setPending] = useState(Boolean(store.saved) && !directTask);
  const [error, setError] = useState(store.error);
  const write = useCallback((next) => {
    const failed = store.write(next);
    setError(failed);
    return failed;
  }, [store]);
  const apply = useCallback(change => {
    const next = typeof change === "function" ? change(current.current) : change;
    current.current = next;
    setValue(next);
    return next;
  }, []);
  const update = useCallback(change => {
    const next = apply(change);
    return withProgressWrite(() => write(next));
  }, [apply, write]);
  const saveResult = (id, result, options, change) => {
    if (!store.isCurrentProfile()) return "stale";
    const next = change ? apply(change) : current.current;
    return withProgressWrite(() => {
      if (!store.isCurrentProfile()) return "stale";
      const failed = write(next);
      if (failed) return failed === CONFLICT_ERROR ? "stale" : "retry";
      return saveLearningResult(id, result, options);
    });
  };
  const restart = () => withProgressWrite(() => {
    if (write(null)) return false;
    const next = fresh();
    if (directTask) next.taskId = directTask;
    current.current = next;
    setValue(next);
    setPending(false);
    return true;
  });
  return { value, savedAt: store.savedAt, update, saveResult, error, warning: store.warning, pending,
    conflicted: error === CONFLICT_ERROR, isCurrentProfile: store.isCurrentProfile, canComplete: () => store.isCurrentProfile() && !store.checkConflict(),
    resume: () => setPending(false), restart };
}
