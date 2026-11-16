export const GAME_KEY = "kvant_game_v1";
export const DRAFT_PREFIX = "kvant_draft_v1:";
export const PROFILE_KEY = "purradox_profile_v2";

const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);

export class InvalidProfileStorage extends Error {
  constructor(raw) {
    super("Invalid profile store");
    this.raw = raw;
  }
}

// A transfer switches the whole profile in one setItem. If the browser
// refuses that write, readers still see exactly the previous profile.
// Old keys stay on disk as a fallback copy for older releases.
export function progressStorage(base) {
  const raw = base.getItem(PROFILE_KEY);
  let active;
  try { active = raw === null ? null : JSON.parse(raw); }
  catch { throw new InvalidProfileStorage(raw); }
  if (raw !== null && (!isObject(active) || typeof active.id !== "string"
    || typeof active.game !== "string" || !isObject(active.drafts))) throw new InvalidProfileStorage(raw);

  const save = value => {
    if (base.getItem(PROFILE_KEY) !== raw) throw new Error("Profile changed");
    base.setItem(PROFILE_KEY, JSON.stringify(value));
  };
  return {
    generation: active?.id ?? null,
    activeRaw: raw,
    keys() {
      if (active) return Object.keys(active.drafts);
      return Array.from({ length: base.length ?? 0 }, (_, index) => base.key(index)).filter(key => key?.startsWith(DRAFT_PREFIX));
    },
    getItem(key) {
      if (!active) return base.getItem(key);
      return key === GAME_KEY ? active.game : Object.hasOwn(active.drafts, key) ? active.drafts[key] : null;
    },
    setItem(key, value) {
      if (!active) return base.setItem(key, value);
      if (key === GAME_KEY) save({ ...active, game: value });
      else save({ ...active, drafts: { ...active.drafts, [key]: value } });
    },
    removeItem(key) {
      if (!active) return base.removeItem(key);
      const { [key]: discarded, ...drafts } = active.drafts;
      save({ ...active, drafts });
    },
  };
}

export function activateProfile(base, game, drafts, damagedActive = null) {
  const id = globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
  const raw = JSON.stringify({ id, game, drafts });
  if (damagedActive === null) {
    base.setItem(PROFILE_KEY, raw);
    return id;
  }
  // Keep the exact unreadable profile. If backup creation fails, leave the
  // active entry in place. Remove only this attempt's copy if activation fails.
  const backupKey = PROFILE_KEY + ":recovery:" + id;
  base.setItem(backupKey, damagedActive);
  try {
    if (base.getItem(PROFILE_KEY) !== damagedActive) throw new Error("Profile changed");
    base.setItem(PROFILE_KEY, raw);
  } catch (error) {
    try { base.removeItem(backupKey); } catch { /* The extra copy is safe. */ }
    throw error;
  }
  return id;
}
