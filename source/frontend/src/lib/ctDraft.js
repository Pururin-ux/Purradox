import { learningDraftKey } from "./learningDraft";
import { draftPrefix, mappedId, openDraftStore, remapChoice, remapEntries } from "./draftStore";

const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const own = (value, key) => Object.hasOwn(value, key);
const READ_ERROR = "Сохранённую попытку не удалось открыть. Данные браузера не менялись; новые ответы пока останутся в этой вкладке.";
const WRITE_ERROR = "Сохранить попытку не удалось. Ответы пока остаются в этой вкладке.";
export const CT_DRAFT_CONFLICT = "В другой вкладке уже есть обновлённая попытка или результат. Открой сохранённую версию, чтобы продолжить.";

export const ctDraftKey = data => learningDraftKey("ct", data.variantId ?? "demo", data);

export const ctDuration = data => (data?.minutes ?? 210) * 60;
export const ctElapsed = (attempt, total, time) =>
  Math.min(total, Math.max(0, Math.floor((time - attempt.startedAt) / 1000)) + attempt.skip);

function validAttempt(data, value) {
  if (!record(value) || !Number.isSafeInteger(value.startedAt) || value.startedAt <= 0
    || !Number.isInteger(value.skip) || value.skip < 0 || value.skip > ctDuration(data)
    || !record(value.answers) || !Array.isArray(value.flags)) return false;
  const tasks = Object.fromEntries(data.tasks.map(task => [task.id, task]));
  if (!own(tasks, value.currentTaskId) || new Set(value.flags).size !== value.flags.length
    || !value.flags.every(id => own(tasks, id))) return false;
  if (value.questAnswers !== undefined && (!record(value.questAnswers)
    || !Object.entries(value.questAnswers).every(([id, at]) => own(value.answers, id) && Number.isSafeInteger(at) && at > 0))) return false;
  return Object.entries(value.answers).every(([id, answer]) => {
    if (!own(tasks, id)) return false;
    const task = tasks[id];
    return task.part === "A"
      ? task.kind === "multi"
        ? Array.isArray(answer) && new Set(answer).size === answer.length && answer.every(index => Number.isInteger(index) && index >= 1 && index <= task.options.length)
        : Number.isInteger(answer) && answer >= 1 && answer <= task.options.length
      : task.part === "B" && typeof answer === "string" && answer.length <= 8 && /^[−-]?\d*$/.test(answer);
  });
}

// Same guarded-write contract as learning drafts. Reads never repair, erase or
// reward. The content fingerprint keeps answers away from changed questions.
export function createCtDraftStore(data, providedStorage) {
  return openDraftStore({
    kind: "ct", slug: data.variantId ?? "demo", key: ctDraftKey(data),
    assessment: data._assessment, storage: () => providedStorage ?? window.localStorage,
    valid: value => validAttempt(data, value),
    migrate: (value, plan) => ({ ...value, answers: remapEntries(value.answers, plan, remapChoice),
      currentTaskId: mappedId(value.currentTaskId, plan), flags: value.flags.map(id => mappedId(id, plan)),
      ...(value.questAnswers && { questAnswers: remapEntries(value.questAnswers, plan) }) }),
    messages: { read: READ_ERROR, invalid: READ_ERROR, write: WRITE_ERROR, conflict: CT_DRAFT_CONFLICT },
  });
}

export function ctResultMatchesAttempt(report, key, attempt) {
  if (!attempt || typeof key !== "string" || typeof report?.draftKey !== "string" || typeof report.attempt !== "string") return false;
  const route = key.slice(0, key.lastIndexOf(":") + 1);
  if (!route || !report.draftKey.startsWith(route)) return false;
  try {
    const previous = JSON.parse(report.attempt);
    if (previous?.runId !== undefined || attempt.runId !== undefined) {
      return typeof attempt.runId === "string" && attempt.runId.length > 0 && previous?.runId === attempt.runId;
    }
    // Without a run ID, only the same revision and start can identify a run.
    return report.draftKey === key && Number.isSafeInteger(previous?.startedAt) && previous.startedAt === attempt.startedAt;
  } catch { return false; }
}

export function ctReportFor(data, store, report) {
  if (!report || typeof report.draftKey !== "string") return null;
  const prefix = draftPrefix("ct", data.variantId ?? "demo");
  if (!report.draftKey.startsWith(prefix)) return null;
  // A newer run wins. A retained draft from an already graded run does not
  // hide the report, even if an older client edited its answer snapshot.
  if (store.saved && !ctResultMatchesAttempt(report, store.source?.key, store.source?.value)
    && !ctResultMatchesAttempt(report, store.key, store.saved)) return null;
  if (report.draftKey === store.key) return report;
  const plan = data._assessment?.legacy?.[report.draftKey.slice(prefix.length)];
  // Keep the earned score even if a report's old questions are unavailable.
  const review = plan ? report.review.map(row => {
    try { return { ...row, id: mappedId(row.id, plan), given: remapChoice(row.given, plan, row.id), answer: remapChoice(row.answer, plan, row.id) }; }
    catch { return { ...row, historical: true }; }
  }) : report.review.map(row => ({ ...row, historical: true }));
  return { ...report, review };
}
