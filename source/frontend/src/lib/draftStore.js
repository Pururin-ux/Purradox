import { DRAFT_PREFIX, progressStorage } from "./progressStorage";

// The route includes the draft kind, so demo, exams, lessons and trainer
// attempts can never adopt one another's data.
export const draftPrefix = (kind, slug) => DRAFT_PREFIX + kind + ":" + encodeURIComponent(slug) + ":";
export const own = (value, key) => Object.hasOwn(value, key);
export const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
export const currentDraftKey = (kind, slug, assessment) => draftPrefix(kind, slug) + "r" + (assessment.draftRevision ?? assessment.revision);
const legacyWarning = "Есть черновик из другой версии. Открыть его здесь не удалось; исходная запись осталась в браузере.";
const updated = envelope => Number.isFinite(envelope.updatedAt) && envelope.updatedAt > 0
  && envelope.updatedAt <= Date.now() ? envelope.updatedAt : null;

export function readEnvelope(raw) {
  const data = JSON.parse(raw);
  if (!record(data) || data.version !== 1 || !(record(data.value) || data.value === null)) throw new Error("Invalid draft");
  return data;
}

export function remapChoice(value, plan, oldId) {
  if (plan?.blocked?.includes(oldId)) throw new Error("Incompatible question");
  const options = plan?.options?.[oldId];
  if (!options || value == null) return value;
  const option = index => {
    const next = Number.isInteger(index) ? options[index - 1] : undefined;
    if (!next) throw new Error("Invalid answer");
    return next;
  };
  return Array.isArray(value) ? value.map(option).sort((a, b) => a - b) : option(value);
}

export function mappedId(id, plan) {
  if (plan?.blocked?.includes(id)) throw new Error("Incompatible question");
  return plan?.ids?.[id] ?? id;
}

export function remapEntries(entries, plan, convert = value => value) {
  if (!record(entries)) throw new Error("Invalid answers");
  return Object.fromEntries(Object.entries(entries).map(([id, value]) => [mappedId(id, plan), convert(value, plan, id)]));
}

function routeEntries(storage, prefix) {
  const entries = new Map();
  for (const key of storage.keys()) {
    if (key?.startsWith(prefix)) entries.set(key, storage.getItem(key));
  }
  return entries;
}

function sameEntries(before, after) {
  return before.size === after.size && [...before].every(([key, raw]) => after.get(key) === raw);
}

// Load the most recent known draft when there is no authoritative entry.
// Keep its original bytes for old versions and for matching a CT result.
// A current tombstone records an intentional reset; it suppresses fallback.
export function openDraftStore({ kind, slug, key, assessment, storage, valid, migrate, messages }) {
  const prefix = draftPrefix(kind, slug);
  let generation, expectedRaw, oldEntries, saved = null, savedAt = null, source = null, error = null, warning = null;
  try {
    const store = progressStorage(storage());
    generation = store.generation;
    expectedRaw = store.getItem(key);
    if (expectedRaw !== null) {
      const parsed = readEnvelope(expectedRaw);
      if (parsed.value !== null && !valid(parsed.value)) throw new Error("Invalid draft");
      saved = parsed.value;
      savedAt = updated(parsed);
      if (saved) source = { key, value: saved, plan: {} };
    } else if (assessment) {
      oldEntries = routeEntries(store, prefix);
      const candidates = [];
      for (const [oldKey, raw] of oldEntries) {
        const plan = assessment.legacy?.[oldKey.slice(prefix.length)];
        try {
          const parsed = readEnvelope(raw);
          if (parsed.value === null) {
            if (plan) candidates.push({ value: null, at: updated(parsed) });
            continue;
          }
          if (!plan) throw new Error("Unknown version");
          const value = migrate(parsed.value, plan);
          if (!valid(value)) throw new Error("Invalid migrated draft");
          candidates.push({ key: oldKey, value, original: parsed.value, plan, at: updated(parsed) });
        } catch { warning = legacyWarning; }
      }
      const selected = candidates.sort(newestDraft)[0];
      if (selected?.value) {
        saved = selected.value;
        savedAt = selected.at;
        source = { key: selected.key, value: selected.original, plan: selected.plan };
      }
    }
  } catch { error = expectedRaw === undefined ? messages.read : messages.invalid; }

  function changed(store) {
    return store.generation !== generation || store.getItem(key) !== expectedRaw
      || (oldEntries && !sameEntries(oldEntries, routeEntries(store, prefix)));
  }

  let recovered;
  function checkConflict() {
    if (recovered) return recovered.checkConflict();
    if (generation === undefined) return null;
    try { return changed(progressStorage(storage())) ? messages.conflict : null; }
    catch { return null; } // Storage errors are reported by the write path.
  }

  function write(value) {
    if (recovered) return recovered.write(value);
    if (error && expectedRaw === undefined) {
      // The first read can fail while browser storage is temporarily locked.
      // Adopt an empty baseline only. Never overwrite answers we could not read.
      const fresh = openDraftStore({ kind, slug, key, assessment, storage, valid, migrate, messages });
      if (fresh.error) return fresh.error;
      if (fresh.saved || fresh.warning || fresh.generation !== (generation ?? null)) return messages.conflict;
      recovered = fresh;
      return recovered.write(value);
    }
    if (error) return error;
    if (value !== null && !valid(value)) return messages.invalid;
    try {
      const store = progressStorage(storage());
      // Sequential stale writers are detected; simultaneous tabs do not have
      // a browser compare-and-swap primitive.
      if (changed(store)) return messages.conflict;
      const raw = value === null && !assessment ? null : JSON.stringify({ version: 1, value, updatedAt: Date.now() });
      if (raw === null) store.removeItem(key);
      else store.setItem(key, raw);
      expectedRaw = raw;
      oldEntries = undefined;
      return null;
    } catch { return messages.write; }
  }
  const isCurrentProfile = () => {
    if (recovered) return recovered.isCurrentProfile();
    if (generation === undefined) return true; // Storage was unavailable at entry.
    try { return progressStorage(storage()).generation === generation; }
    catch { return true; } // The write path reports read/permission errors.
  };
  return { key, generation, saved, savedAt, source, error, warning, write, checkConflict, isCurrentProfile };
}

function newestDraft(a, b) {
  return (b.at ?? 0) - (a.at ?? 0) || Number(b.value === null) - Number(a.value === null);
}

function matchesLegacyPlan(value, plan) {
  if (!plan?.blocked?.length) return true;
  const ids = [
    value.taskId, value.currentTaskId, plan.quizOrder?.[value.quiz?.idx],
    ...Object.keys(value.answers ?? {}), ...Object.keys(value.results ?? {}),
    ...Object.keys(value.helpUsed ?? {}), ...Object.keys(value.quiz?.results ?? {}),
    ...(Array.isArray(value.flags) ? value.flags : []),
  ];
  return !plan.blocked.some(id => ids.includes(id));
}

function summaryCandidate(key, raw, accept, plan) {
  if (raw === null) return null;
  try {
    const entry = readEnvelope(raw);
    if (entry.value === null || (matchesLegacyPlan(entry.value, plan) && accept(entry.value, key))) {
      return { key, value: entry.value, at: updated(entry) };
    }
  } catch { /* A broken record must not hide another topic's valid draft. */ }
  return null;
}

export function createDraftSummaryReader(base) {
  const storage = progressStorage(base);
  let storageOrder;
  const orderOf = key => {
    storageOrder ??= new Map(storage.keys().map((id, index) => [id, index]));
    return storageOrder.get(key) ?? Infinity;
  };

  return (kind, slug, assessment, accept = () => true) => {
    if (!assessment) return null;
    try {
      const key = currentDraftKey(kind, slug, assessment);
      const current = storage.getItem(key);
      const publicSummary = item => item?.value ? { key: item.key, value: item.value, updatedAt: item.at } : null;
      if (current !== null) return publicSummary(summaryCandidate(key, current, accept));

      const prefix = draftPrefix(kind, slug);
      const candidates = Object.entries(assessment.legacy ?? {}).map(([revision, plan]) => {
        const id = prefix + revision;
        return summaryCandidate(id, storage.getItem(id), accept, plan);
      }).filter(Boolean);
      // Preserve storage order for equally recent answers.
      return publicSummary(candidates.sort((a, b) => newestDraft(a, b) || orderOf(a.key) - orderOf(b.key))[0]);
    } catch { return null; }
  };
}

export function draftSummary(kind, slug, assessment, storage, accept) {
  if (!assessment) return null;
  try {
    return createDraftSummaryReader(storage)(kind, slug, assessment, accept);
  } catch { return null; }
}
