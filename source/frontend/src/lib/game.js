import { useSyncExternalStore } from "react";
import { ARTIFACTS, ART_BY_ID } from "@/lib/artifacts";
import { prepareProfileExport, replaceProfile } from "./profileTransfer";
import { GAME_KEY as KEY, PROFILE_KEY, progressStorage } from "./progressStorage";
import { canonicalProgressId, canonicalQuizId, canonicalTaskId, FIRST_LESSON } from "./progressIds";

export const SHELF_MAX = 6;
export const LEVEL_BONUS = 50;

export const QUESTS = [
  { id: "solve3", ev: "solve", target: 3, title: "Реши 3 новые задачи в тренажёре", reward: { joules: 60, xp: 30 } },
  { id: "nohint", ev: "solve_nohint", target: 1, title: "Реши новую задачу без подсказки", reward: { joules: 40, xp: 20 } },
  { id: "lesson", ev: "lesson", target: 1, title: "Впервые пройди урок до конца", reward: { joules: 80, xp: 40 } },
  { id: "play", ev: "play", target: 3, title: "Осмотри 3 разных предмета на полке", reward: { joules: 30, xp: 10 } },
  { id: "formula", ev: "formula", target: 3, title: "Открой 3 разные карточки с формулами", reward: { joules: 40, xp: 20 } },
  { id: "ct5", ev: "ct_answer", target: 5, title: "Заполни ответы на 5 разных заданий ЦТ", reward: { joules: 70, xp: 40 } },
  { id: "model", ev: "model", target: 1, title: "Измени параметр в модели урока", reward: { joules: 30, xp: 15 } },
];
const QUEST_BY_ID = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

const TITLES = ["Наблюдатель", "Лаборант", "Экспериментатор", "Исследователь", "Теоретик", "Квантовый механик", "Укротитель энтропии", "Повелитель гравитации"];

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayNum = (k) => {
  const [y, m, d] = k.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 864e5;
};
const daysBetween = (a, b) => Math.round(dayNum(b) - dayNum(a));

function pickQuests(day) {
  let h = 7;
  for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const out = [];
  while (out.length < 3) {
    h = (h * 1103515245 + 12345) >>> 0;
    const id = QUESTS[(h >>> 8) % QUESTS.length].id;
    if (!out.includes(id)) out.push(id);
  }
  return out;
}
const freshQuests = (day) => ({ day, ids: pickQuests(day), progress: {}, claimed: [] });

function questAvailable(id, s) {
  const q = s.quests;
  const definition = QUEST_BY_ID[id];
  const progress = q.progress[id] || 0;
  if (q.claimed.includes(id) || progress >= definition.target) return true;
  // A legacy completion says nothing about the 48 added lessons. Until the
  // catalog arrives, do not discard a possible lesson quest.
  if (id === "lesson") return s.lessonSlugs === null || s.lessonSlugs.some(slug => !s.completedLessons.includes(slug));
  const taskIds = s.allTaskIds;
  if ((id === "solve3" || id === "nohint") && taskIds !== null) {
    const remaining = taskIds.filter(task => !s.solved.includes(task)).length;
    return remaining >= definition.target - progress;
  }
  return true;
}

function availableQuests(s) {
  const q = s.quests;
  const kept = new Set(q.ids.filter(id => questAvailable(id, s)));
  if (q.ids.every(id => kept.has(id))) return q;
  // Preserve available rows in place; deterministic alternatives cannot reroll
  // a completed quest or discard its progress/claim when the catalog changes.
  const order = [...pickQuests(q.day), ...QUESTS.map(quest => quest.id)];
  const ids = q.ids.map(id => {
    if (kept.has(id)) return id;
    const replacement = order.find(candidate => !kept.has(candidate) && questAvailable(candidate, s));
    if (!replacement) return id;
    kept.add(replacement);
    return replacement;
  });
  return { ...q, ids };
}

const INITIAL = { joules: 200, xp: 0, streak: 0, lastDay: null, lessonDone: false, completedLessons: [], lessonSlugs: null, allTaskIds: null, completedExams: [], examResults: {}, avatar: "cat", nickname: "", solved: [], trainerTaskIds: null, mistakeAt: {}, trainerCheckedAt: {}, owned: ["cradle"], shelf: ["cradle"], capsules: 1, opened: 0, quests: null, mistakes: [], ctBest: null };

function withCapsuleBonus(s) {
  if (s.opened < 1 || s.owned.includes("quark")) return s;
  return { ...s, owned: [...s.owned, "quark"], shelf: s.shelf.length < SHELF_MAX ? [...s.shelf, "quark"] : s.shelf };
}

class SaveError extends Error {}
const READ_ERROR = "Не удалось прочитать сохранение. Изменения не записаны. Проверь доступ к данным браузера и повтори действие.";
const INVALID_ERROR = "Сохранение повреждено. Изменения не записаны. Исходные данные сохранены; не очищай данные браузера.";
const WRITE_ERROR = "Не удалось записать прогресс. Последнее действие не сохранено; проверь место и доступ к данным браузера, затем повтори действие.";
const CONFLICT_ERROR = "Сохранение изменилось в другой вкладке. Последнее действие не записано; повтори его.";
const isRecord = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isNumber = (v) => Number.isFinite(v) && v >= 0;
const isCount = (v) => isNumber(v) && Number.isInteger(v);
const boundedPoints = v => isCount(v) && v <= Number.MAX_SAFE_INTEGER;
const isList = (v) => Array.isArray(v) && v.every((id) => typeof id === "string");
const isTaskList = (v) => isList(v) && v.every(id => id.trim().length > 0);
const isDay = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isMistakeMark = (v) => isRecord(v) && typeof v.at === "string";
// Время первой ошибки: старые сохранения хранят строку, новые — объект {at, given}.
export const mistakeTime = (mark) => typeof mark === "string" ? mark : isRecord(mark) ? mark.at : undefined;
export function mistakeGiven(mark, revision, legacyPositions) {
  if (!isRecord(mark)) return undefined;
  // Freebuff first added the typed/selected answer after shuffling. Earlier
  // saves can have a date or no mark, but no option number to reinterpret.
  if (typeof mark.given === "string" || (typeof revision === "string" && revision === mark.revision)) return mark.given;
  if (mark.revision === undefined && Array.isArray(legacyPositions)) {
    const position = index => Number.isInteger(index) ? legacyPositions[index - 1] : undefined;
    if (!Array.isArray(mark.given)) return position(mark.given);
    const mapped = mark.given.map(position);
    if (mapped.every(Boolean)) return mapped;
  }
  return undefined;
}
export const solvedTaskCount = state => state.solved.filter(id => !id.startsWith("quiz:")).length;
const isExamResult = v => isRecord(v) && isCount(v.correct) && isCount(v.total) && v.total > 0 && v.total <= 30
  && v.correct <= v.total && isCount(v.elapsed_sec) && Array.isArray(v.review) && v.review.length === v.total
  && v.review.every(row => isRecord(row) && typeof row.id === "string" && typeof row.correct === "boolean"
    && Array.isArray(row.solution) && row.solution.every(step => isRecord(step) && typeof step.text === "string"))
  && Array.isArray(v.by_section) && v.by_section.every(row => isRecord(row) && typeof row.id === "string" && typeof row.title === "string" && isCount(row.correct) && isCount(row.total));

export function validSave(s) {
  if (!isRecord(s)) return false;
  const checks = {
    joules: boundedPoints, xp: boundedPoints, streak: isCount, capsules: isCount, opened: isCount,
    lastDay: (v) => v === null || isDay(v), lessonDone: (v) => typeof v === "boolean",
    solved: isList, owned: isList, shelf: isList, mistakes: isList,
    mistakeAt: (v) => isRecord(v) && Object.values(v).every((t) => typeof t === "string" || isMistakeMark(t)),
    trainerCheckedAt: (v) => isRecord(v) && Object.values(v).every(isCount),
    trainerTaskIds: (v) => v === null || isTaskList(v),
    allTaskIds: (v) => v === null || isTaskList(v),
    lessonSlugs: (v) => v === null || isTaskList(v),
    completedLessons: isTaskList, completedExams: isTaskList,
    examResults: v => isRecord(v) && Object.values(v).every(isExamResult),
    avatar: v => ["cat","girl","prism","moon"].includes(v),
    nickname: v => typeof v === "string" && v.length <= 28,
    ctBest: (v) => v === null || isNumber(v),
    quests: (q) => q === null || (isRecord(q) && isDay(q.day) && isList(q.ids)
      && q.ids.every((id) => Object.hasOwn(QUEST_BY_ID, id)) && isRecord(q.progress)
      && Object.values(q.progress).every(isNumber) && isList(q.claimed)
      && (q.seen === undefined || (isRecord(q.seen) && Object.values(q.seen).every(isList)))),
  };
  return Object.entries(checks).every(([key, check]) => !Object.hasOwn(s, key) || check(s[key]));
}

function readStorage() {
  try { return progressStorage(localStorage); }
  catch { throw new SaveError(READ_ERROR); }
}

function load(store = readStorage()) {
  let raw, saved;
  try { raw = store.getItem(KEY); }
  catch { throw new SaveError(READ_ERROR); }
  try { saved = raw === null ? {} : JSON.parse(raw); }
  catch { throw new SaveError(INVALID_ERROR); }
  if (!validSave(saved)) throw new SaveError(INVALID_ERROR);
  const s = { ...INITIAL, ...saved };
  for (const key of ["solved", "mistakes", "trainerTaskIds", "allTaskIds"]) {
    if (s[key] !== null) s[key] = [...new Set(s[key].map(canonicalProgressId))];
  }
  const marks = new Map();
  const kept = new Set(s.mistakes);
  for (const [key, mark] of Object.entries(s.mistakeAt)) {
    const id = canonicalProgressId(key);
    if (kept.has(id) && (!marks.has(id) || mistakeTime(mark) < mistakeTime(marks.get(id)))) marks.set(id, mark);
  }
  // Old CT reports recorded skipped answers as explicit errors. An ordinary
  // answer form never submits these placeholders. Keep unknown dated marks.
  s.mistakes = s.mistakes.filter(id => {
    const mark = marks.get(id);
    if (!isRecord(mark) || !Object.hasOwn(mark, "given")) return true;
    const value = mark.given;
    const blank = value === null || value === "" || value === "-" || value === "−" || (Array.isArray(value) && !value.length);
    if (blank) marks.delete(id);
    return !blank;
  });
  s.mistakeAt = Object.fromEntries(marks);
  const checked = new Map();
  for (const [key, at] of Object.entries(s.trainerCheckedAt)) {
    const id = canonicalTaskId(key);
    checked.set(id, Math.max(at, checked.get(id) ?? 0));
  }
  s.trainerCheckedAt = Object.fromEntries(checked);
  if (s.lessonDone && !s.completedLessons.includes(FIRST_LESSON)) s.completedLessons = [...s.completedLessons, FIRST_LESSON];
  if (s.quests?.day !== dayKey()) s.quests = freshQuests(dayKey());
  s.quests = availableQuests(s);
  // Repairs older saves where leaving the reveal screen lost the earned bonus.
  return { value: withCapsuleBonus(s), raw, generation: store.generation };
}

let state = { ...INITIAL, quests: freshQuests(dayKey()) };
let lastRaw, generation;
let saveError = null;
let pendingFx = null;
let dirty = false;
const subs = new Set();
const fxSubs = new Set();
const notify = () => subs.forEach((f) => f());
const pendingError = () => saveError === WRITE_ERROR || saveError === CONFLICT_ERROR ? saveError : null;

function refresh() {
  if (pendingFx) return;
  try {
    const loaded = load();
    const error = pendingError();
    if (loaded.raw === lastRaw && loaded.generation === generation && state.quests.day === dayKey() && saveError === error) return;
    state = loaded.value;
    lastRaw = loaded.raw;
    generation = loaded.generation;
    saveError = error;
  } catch (error) {
    if (!(error instanceof SaveError)) throw error;
    if (saveError === error.message) return;
    saveError = error.message;
  }
  notify();
}

// Explicit read-only refresh for a daily view that stays open across midnight.
export const refreshGame = refresh;

refresh();
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === KEY || event.key === PROFILE_KEY || event.key === null) refresh();
  });
  window.addEventListener("focus", refresh);
}

const set = (patch) => {
  state = { ...state, ...patch };
  dirty = true;
};
const fx = (e) => pendingFx ? pendingFx.push(e) : fxSubs.forEach((f) => f(e));

// One synchronous user action, including nested rewards, produces one save.
// Re-read before computing: max/union merging would undo spending and removals.
const change = (action, failure) => (...args) => {
  if (pendingFx) return action(...args);
  let loaded;
  try { loaded = load(); }
  catch (error) {
    if (!(error instanceof SaveError)) throw error;
    saveError = error.message;
    notify();
    return failure;
  }
  state = loaded.value;
  const before = state;
  generation = loaded.generation;
  pendingFx = [];
  dirty = false;
  let result, events;
  try {
    result = action(...args);
    // Finish the action's quest tracking first: its last new task may complete
    // solve3 before the remaining catalog reaches zero. Reading alone never saves.
    const quests = availableQuests(state);
    if (quests !== state.quests) set({ quests });
    let raw = loaded.raw;
    if (dirty) {
      // Best effort only: localStorage has no atomic compare-and-swap. A write
      // after this check can still race with setItem in another tab.
      const store = readStorage();
      if (store.generation !== loaded.generation || store.getItem(KEY) !== loaded.raw) throw new SaveError(CONFLICT_ERROR);
      raw = JSON.stringify(state);
      try { store.setItem(KEY, raw); }
      catch { throw new SaveError(WRITE_ERROR); }
    }
    lastRaw = raw;
    generation = loaded.generation;
    events = pendingFx;
  } catch (error) {
    state = before;
    pendingFx = null;
    if (!(error instanceof SaveError)) throw error;
    saveError = error.message;
    notify();
    return failure;
  }
  pendingFx = null;
  saveError = dirty ? null : pendingError();
  notify();
  events.forEach(fx);
  return result;
};

export const onFx = (cb) => {
  fxSubs.add(cb);
  return () => fxSubs.delete(cb);
};

const subscribe = (cb) => {
  subs.add(cb);
  refresh();
  return () => subs.delete(cb);
};
export const useGame = () => useSyncExternalStore(subscribe, () => state);
export const useSaveError = () => useSyncExternalStore(subscribe, () => saveError);
export const useProfileGeneration = () => useSyncExternalStore(subscribe, () => generation);

const xpToReach = (level) => 50 * level * (level - 1);
export const levelTitle = (level) => TITLES[Math.min(level - 1, TITLES.length - 1)];
export function levelInfo(xp) {
  let level = Math.max(1, Math.floor((1 + Math.sqrt(1 + 4 * xp / 50)) / 2));
  if (xp < xpToReach(level)) level -= 1;
  if (xp >= xpToReach(level + 1)) level += 1;
  const base = xpToReach(level);
  const need = xpToReach(level + 1) - base;
  const cur = xp - base;
  return { level, title: levelTitle(level), cur, need, pct: cur / need };
}

export function streakView(s) {
  if (!s.lastDay) return { streak: 0, broken: false, today: false, gap: Infinity };
  const gap = daysBetween(s.lastDay, dayKey());
  return { streak: gap <= 1 ? s.streak : 0, broken: gap >= 2, today: gap === 0, gap };
}

export const msToReset = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1) - n;
};

function ensureDay() {
  if (state.quests.day !== dayKey()) set({ quests: freshQuests(dayKey()) });
}

export const questView = (s) =>
  s.quests.ids.map((id) => {
    const q = QUEST_BY_ID[id];
    const progress = Math.min(q.target, s.quests.progress[id] || 0);
    return { ...q, progress, done: progress >= q.target, claimed: s.quests.claimed.includes(id) };
  });

const withShelf = (id) => (state.shelf.length < SHELF_MAX && !state.shelf.includes(id) ? [...state.shelf, id] : state.shelf);

export const unlock = change((id) => {
  if (state.owned.includes(id)) return false;
  set({ owned: [...state.owned, id], shelf: withShelf(id) });
  fx({ type: "artifact", id });
  return true;
}, false);

export const award = change(({ joules = 0, xp = 0, label = "" }) => {
  const events = [];
  const today = dayKey();
  const patch = { joules: state.joules + joules, xp: state.xp + xp, capsules: state.capsules };
  if (state.lastDay !== today) {
    const gap = state.lastDay ? daysBetween(state.lastDay, today) : Infinity;
    patch.streak = gap === 1 ? state.streak + 1 : 1;
    patch.lastDay = today;
    if (patch.streak % 3 === 0) {
      patch.capsules += 1;
      events.push({ type: "capsule", text: `Серия ${patch.streak} дней — капсула в лавке` });
    }
  }
  const before = levelInfo(state.xp).level;
  const after = levelInfo(patch.xp).level;
  if (after > before) {
    patch.capsules += after - before;
    patch.joules += LEVEL_BONUS * (after - before);
    events.push({ type: "levelup", level: after });
  }
  set(patch);
  if (joules || xp) fx({ type: "reward", joules, xp, label });
  events.forEach(fx);
  if ((patch.streak ?? 0) >= 7) unlock("shard");
});

function trackEvent(ev, n = 1, source) {
  if (!isCount(n) || n < 1) return;
  ensureDay();
  const q = state.quests;
  const defs = q.ids.map((id) => QUEST_BY_ID[id]).filter((d) => d.ev === ev
    && (q.progress[d.id] || 0) < d.target
    && (source === undefined || !q.seen?.[d.id]?.includes(source)));
  if (!defs.length) return;
  const progress = { ...q.progress };
  const seen = { ...q.seen };
  const done = [];
  defs.forEach((d) => {
    const was = progress[d.id] || 0;
    progress[d.id] = Math.min(d.target, was + n);
    if (source !== undefined) seen[d.id] = [...(seen[d.id] || []), source];
    if (was < d.target && progress[d.id] >= d.target) done.push(d);
  });
  set({ quests: { ...q, progress, seen } });
  done.forEach((d) => fx({ type: "quest", title: d.title }));
}

export const track = change(trackEvent);
export const trackUnique = change((ev, source, profileGeneration) => {
  if (profileGeneration !== undefined && profileGeneration !== generation) return;
  if (typeof source !== "string" || !source.trim()) return;
  // Store the source with the progress in the same guarded write. Component
  // remounts, reloads and sequential stale tabs must not count it again.
  trackEvent(ev, 1, source);
});

export const syncQuestTasks = change((ids) => {
  if (!isTaskList(ids)) return false;
  const catalog = [...new Set(ids.map(canonicalTaskId))].sort();
  if (state.trainerTaskIds?.length === catalog.length
    && state.trainerTaskIds.every((id, index) => id === catalog[index])) return false;
  set({ trainerTaskIds: catalog });
  return true;
}, false);

export const syncCourseCatalog = change(({ lessonSlugs, taskIds }) => {
  if (!isTaskList(lessonSlugs) || !isTaskList(taskIds)) return false;
  const lessons = [...new Set(lessonSlugs)].sort();
  const tasks = [...new Set(taskIds.map(canonicalTaskId))].sort();
  if (JSON.stringify(lessons) === JSON.stringify(state.lessonSlugs) && JSON.stringify(tasks) === JSON.stringify(state.allTaskIds)) return false;
  set({ lessonSlugs: lessons, allTaskIds: tasks });
  return true;
}, false);

export const saveProfile = change(({ avatar, nickname }) => {
  if (!["cat","girl","prism","moon"].includes(avatar) || typeof nickname !== "string" || nickname.length > 28) return false;
  set({ avatar, nickname: nickname.trim() });
  return true;
}, false);

export const claimQuest = change((id) => {
  const q = questView(state).find((x) => x.id === id);
  if (!q || !q.done || q.claimed) return { ok: false, reason: "unavailable" };
  set({ quests: { ...state.quests, claimed: [...state.quests.claimed, id] } });
  award({ ...q.reward, label: "Квест выполнен" });
  return { ok: true };
}, { ok: false, reason: "storage" });

export const buy = change((id) => {
  const a = ART_BY_ID[id];
  if (!a?.price || state.owned.includes(id)) return { ok: false, reason: "owned" };
  if (state.joules < a.price) return { ok: false, reason: "poor" };
  set({ joules: state.joules - a.price, owned: [...state.owned, id], shelf: withShelf(id) });
  return { ok: true };
}, { ok: false, reason: "storage" });

export const openCapsule = change(() => {
  if (state.capsules < 1) return null;
  const first = state.opened === 0;
  const base = withCapsuleBonus({ ...state, capsules: state.capsules - 1, opened: state.opened + 1 });
  const pool = ARTIFACTS.filter((a) => a.rarity !== "legendary" && !state.owned.includes(a.id));
  if (!pool.length) {
    set({ ...base, joules: state.joules + 300 });
    return { refund: 300, first };
  }
  const roll = Math.random();
  const tier = roll < 0.14 ? "epic" : roll < 0.44 ? "rare" : "common";
  const inTier = pool.filter((a) => a.rarity === tier);
  const from = inTier.length ? inTier : pool;
  const art = from[Math.floor(Math.random() * from.length)];
  set({ ...base, owned: [...base.owned, art.id], shelf: base.shelf.length < SHELF_MAX ? [...base.shelf, art.id] : base.shelf });
  return { art, first };
}, null);

export const toggleShelf = change((id) => {
  if (!state.owned.includes(id)) return false;
  if (state.shelf.includes(id)) {
    set({ shelf: state.shelf.filter((x) => x !== id) });
    return true;
  }
  if (state.shelf.length >= SHELF_MAX) return false;
  set({ shelf: [...state.shelf, id] });
  return true;
}, false);

export const completeLesson = change((joules, slug = FIRST_LESSON) => {
  if (typeof slug !== "string" || !slug.trim()) return false;
  const first = !state.completedLessons.includes(slug);
  if (first) {
    set({ completedLessons: [...state.completedLessons, slug], lessonDone: state.lessonDone || slug === FIRST_LESSON });
    track("lesson");
    award({ joules, xp: 100, label: "Урок пройден" });
    if (slug === FIRST_LESSON) unlock("train");
  }
  return first;
}, null);

export const trainerProgressAt = (state, id) => Math.max(state.trainerCheckedAt?.[id] ?? 0, Date.parse(mistakeTime(state.mistakeAt?.[id])) || 0);

const commitTrainerSolution = change((id, { hinted = false, profileGeneration, checkedAt } = {}) => {
  if (profileGeneration !== undefined && profileGeneration !== generation) return null;
  id = canonicalTaskId(id);
  if (checkedAt !== undefined && checkedAt < trainerProgressAt(state, id)) return null;
  const first = !state.solved.includes(id);
  set({ trainerCheckedAt: { ...state.trainerCheckedAt, [id]: Date.now() } });
  clearMistake(id);
  if (first) {
    set({ solved: [...state.solved, id] });
    track("solve");
    if (!hinted) track("solve_nohint");
    award({ joules: 25, xp: 20, label: "Задача решена" });
  }
  return first;
}, null);

export const solveTask = (...args) => commitTrainerSolution(...args) === true;
export const saveTrainerSolution = (...args) => commitTrainerSolution(...args) !== null;

function clearMistake(id) {
  if (!state.mistakes.includes(id)) return;
  const mistakeAt = { ...(state.mistakeAt || {}) };
  delete mistakeAt[id];
  set({ mistakes: state.mistakes.filter((m) => m !== id), mistakeAt });
}

function addMistake(id, given, { at = new Date().toISOString(), revision, preserve = false } = {}) {
  if (!state.mistakes.includes(id)) set({ mistakes: [...state.mistakes, id] });
  const existing = state.mistakeAt?.[id];
  if (preserve && existing) return;
  const firstAt = mistakeTime(existing) ?? at;
  set({ mistakeAt: { ...state.mistakeAt, [id]: given === undefined ? firstAt : { at: firstAt, given, revision } } });
}

export const failTask = change((id, given, revision, profileGeneration) => {
  if (profileGeneration !== undefined && profileGeneration !== generation) return false;
  id = canonicalProgressId(id);
  if (!id.startsWith("quiz:")) set({ trainerCheckedAt: { ...state.trainerCheckedAt, [id]: Date.now() } });
  addMistake(id, given, { revision });
});

export const recordQuizAnswer = change((id, { correct, given }, revision, profileGeneration) => {
  if (profileGeneration !== undefined && profileGeneration !== generation) return false;
  const mark = "quiz:" + canonicalQuizId(id);
  if (correct) clearMistake(mark);
  else addMistake(mark, given, { revision });
});

export const exportProfile = () => {
  try {
    const store = readStorage();
    return prepareProfileExport(store, load(store).value, dayKey());
  } catch {
    return { ok: false, error: "Не удалось скачать профиль. Проверь доступ к сохранению. Исходные данные остались в браузере." };
  }
};

export const importProfile = (file, { replace } = {}) => {
  const result = replaceProfile(file, {
    replace, base: () => localStorage, load, validGame: validSave, initial: INITIAL,
  });
  if (result.ok) {
    saveError = null;
    refresh();
  }
  return result;
};

export function readCtResult(id) {
  try { return JSON.parse(readStorage().getItem(KEY))?.examResults?.[id] ?? null; }
  catch { return undefined; }
}

export const recordCt = change(({ correct, tahi = Infinity, id = "demo", full = false, result, previousResult, profileGeneration }) => {
  if (profileGeneration !== undefined && profileGeneration !== generation) return false;
  if (result && !isExamResult(result)) return false;
  if (result) {
    let startedAt;
    try { startedAt = JSON.parse(result.attempt)?.startedAt; } catch { /* Older result with no answer sheet. */ }
    const previous = state.examResults[id];
    let previousStart;
    try { previousStart = JSON.parse(previous?.attempt)?.startedAt; } catch { /* An older report. */ }
    if (previous?.attempt !== undefined && previous.attempt === result.attempt && previous.draftKey === result.draftKey) return true;
    // Match what the tab saw when opening this attempt. An imported result
    // can have a timestamp from a clock ahead of this one.
    if (previousResult !== undefined) {
      if (JSON.stringify(previous ?? null) !== JSON.stringify(previousResult)) return false;
    } else if (Number.isSafeInteger(startedAt) && Number.isSafeInteger(previousStart) && previousStart >= startedAt) return false;
    if (full && Number.isSafeInteger(startedAt) && startedAt > 0) {
      for (const row of result.review) {
        if (row.correct || !row.trainerTaskId || row.given === null || row.given === undefined
          || (Array.isArray(row.given) ? row.given.length === 0 : typeof row.given === "string" && !/^[−-]?\d+$/.test(row.given))) continue;
        const task = canonicalTaskId(row.trainerTaskId);
        if ((state.trainerCheckedAt[task] ?? 0) >= startedAt) continue;
        addMistake(task, row.given, { preserve: true, revision: row.trainerRevision });
      }
    }
  }
  set({ ctBest: Math.max(state.ctBest ?? 0, correct), ...(result ? { examResults: { ...state.examResults, [id]: result } } : {}) });
  if (!state.completedExams.includes(id)) {
    set({ completedExams: [...state.completedExams, id] });
    if (correct) award({ joules: correct * 15, xp: correct * 20, label: "ЦТ завершено" });
    if (full || correct > tahi) unlock("watch");
  }
  return true;
}, false);
