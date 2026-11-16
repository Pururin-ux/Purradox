import { readEnvelope, record } from "./draftStore";
import { DRAFT_PREFIX, GAME_KEY, InvalidProfileStorage, activateProfile, progressStorage } from "./progressStorage";

const APP = "purradox";
const MAX_BYTES = 5_000_000;
const INVALID = "Не удалось прочитать файл Purradox. Проверь, что выбрал файл профиля.";
const BROKEN = "В файле есть повреждённые данные. Текущий профиль остался без изменений.";
const CONFLICT = "Профиль изменился в другой вкладке. Выбери файл ещё раз.";
const WRITE = "Браузер не записал перенос. Текущий профиль остался без изменений.";
const READ = "Не удалось прочитать текущий профиль. Исходные данные остались в браузере.";

const text = (value, limit) => typeof value === "string" && value.length <= limit;
const count = value => Number.isSafeInteger(value) && value >= 0;
const ids = value => Array.isArray(value) && value.every(id => text(id, 150) && id);
const answer = value => value == null || text(value, 32) || Number.isFinite(value)
  || Array.isArray(value) && value.length <= 24 && value.every(count);
const entries = (value, check) => record(value) && Object.entries(value).every(([key, entry]) => text(key, 150) && check(entry));
const inputs = value => entries(value, item => record(item) && text(item.input, 32) && answer(item.choice));
const results = (value, lesson) => entries(value, item => record(item) && typeof item.correct === "boolean"
  && (Number.isFinite(item.answer) || Array.isArray(item.answer) && answer(item.answer)) && answer(item.given)
  && (lesson ? text(item.explanation, 12000) : (item.explanation === undefined || text(item.explanation, 12000)))
  && (lesson && item.solution === undefined || Array.isArray(item.solution) && item.solution.length <= 40
    && item.solution.every(step => record(step) && text(step.text, 12000) && (step.tex === undefined || text(step.tex, 12000)))));

function validDraft(key, raw) {
  const match = /^kvant_draft_v1:(lesson|trainer|trainer-review|ct):([a-z0-9-]{1,100}):(?:[0-9a-f]{1,8}\.[0-9a-f]{1,8}|r[0-9a-f]{20})$/.exec(key);
  if (!match || !text(raw, MAX_BYTES)) return false;
  let draft;
  try { draft = readEnvelope(raw).value; }
  catch { return false; }
  if (draft === null) return true;
  // Shape at the transfer boundary; the destination additionally checks the
  // exact question ids, options and card against its content revision.
  if (match[1] === "ct") {
    return count(draft.startedAt) && draft.startedAt > 0 && count(draft.skip)
      && text(draft.currentTaskId, 150) && ids(draft.flags) && entries(draft.answers, answer);
  }
  if (!inputs(draft.answers)) return false;
  return match[1] === "lesson"
    ? text(draft.cardId, 150) && text(draft.guess, 6) && record(draft.quiz)
      && count(draft.quiz.idx) && results(draft.quiz.results, true)
    : text(draft.taskId, 150) && count(draft.level) && draft.level <= 3
      && results(draft.results, false) && entries(draft.helpUsed, used => used === true);
}

const checksum = value => {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, "0").toUpperCase();
};

const draftCount = drafts => Object.values(drafts).filter(raw => {
  try { return readEnvelope(raw).value !== null; } catch { return true; }
}).length;

const summary = (game, drafts) => ({
  lessons: game.completedLessons?.length ?? 0,
  tasks: game.solved?.filter(id => !id.startsWith("quiz:")).length ?? 0,
  xp: game.xp ?? 0, drafts: draftCount(drafts),
});

function snapshot(store) {
  const drafts = Object.fromEntries(store.keys().filter(key => key.startsWith(DRAFT_PREFIX)).sort().map(key => [key, store.getItem(key)]));
  const gameRaw = store.getItem(GAME_KEY);
  return { drafts, gameRaw, stamp: JSON.stringify(store.activeRaw ?? [gameRaw, drafts]) };
}

function importTarget(base) {
  let store;
  try { store = progressStorage(base); }
  catch (error) {
    if (!(error instanceof InvalidProfileStorage)) throw error;
    return { stamp: JSON.stringify(error.raw), activeRaw: error.raw };
  }
  return { ...snapshot(store), store, activeRaw: store.activeRaw };
}

export function prepareProfileExport(store, game, dateKey) {
  const entries = Object.entries(snapshot(store).drafts);
  const drafts = Object.fromEntries(entries.filter(([key, raw]) => validDraft(key, raw)));
  const skippedDrafts = entries.length - Object.keys(drafts).length;
  const json = JSON.stringify({ app: APP, schema: 1, exportedAt: new Date().toISOString(), game, drafts });
  return { ok: true, json, code: checksum(json), filename: "purradox-profile-" + dateKey + ".json", summary: summary(game, drafts), skippedDrafts };
}

export function replaceProfile(file, { replace, base, load, validGame, initial }) {
  let payload;
  try {
    if (!text(file, MAX_BYTES)) return { ok: false, error: INVALID };
    payload = JSON.parse(file);
  } catch { return { ok: false, error: INVALID }; }
  if (!record(payload) || payload.app !== APP || payload.schema !== 1) return { ok: false, error: INVALID };
  const drafts = payload.drafts === undefined ? {} : payload.drafts;
  if (!validGame(payload.game) || !record(drafts)
    || !Object.entries(drafts).every(([key, raw]) => validDraft(key, raw))) return { ok: false, error: BROKEN };

  let storage, damagedActive;
  const incoming = summary(payload.game, drafts);
  try {
    storage = base();
    const target = importTarget(storage);
    let rawGame;
    if (target.store) {
      try { rawGame = JSON.parse(target.gameRaw ?? "{}"); }
      catch { /* An unreadable game still requires confirmation. */ }
    }
    const game = validGame(rawGame) ? load(target.store).value : null;
    const damaged = !game || Object.entries(target.drafts).some(([key, raw]) => !validDraft(key, raw));
    // A name, a purchase, a changed shelf or a draft alone is still a profile.
    const hasData = damaged || Object.values(target.drafts).some(raw => {
      try { return readEnvelope(raw).value !== null; }
      catch { return true; }
    }) || [
      "avatar", "nickname", "joules", "xp", "capsules", "opened", "owned", "shelf",
      "completedLessons", "solved", "mistakes", "completedExams", "examResults", "ctBest", "lastDay",
    ].some(key => JSON.stringify(game[key]) !== JSON.stringify(initial[key]))
      || game.quests?.claimed.length > 0 || Object.keys(game.quests?.progress ?? {}).length > 0;
    const confirmation = target.stamp;
    if ((hasData || replace !== undefined) && replace !== confirmation) {
      return { ok: false, needsConfirm: true, confirmation, damaged,
        current: game ? summary(game, target.drafts) : null, summary: incoming };
    }
    if (importTarget(storage).stamp !== confirmation) return { ok: false, error: CONFLICT };
    damagedActive = damaged ? target.activeRaw : null;
  } catch { return { ok: false, error: READ }; }

  try { activateProfile(storage, JSON.stringify(payload.game), drafts, damagedActive); }
  catch { return { ok: false, error: WRITE }; }
  return { ok: true, summary: incoming, code: checksum(file),
    profile: { avatar: payload.game.avatar ?? initial.avatar, nickname: payload.game.nickname ?? initial.nickname } };
}
