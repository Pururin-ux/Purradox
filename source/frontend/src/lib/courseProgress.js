import { useEffect, useState } from "react";
import { createDraftSummaryReader } from "./draftStore";
import { DRAFT_PREFIX, PROFILE_KEY } from "./progressStorage";

// Only offer a return link for a recognized draft that the destination can
// interpret. The destination also validates individual questions and answers.
export function recentDrafts(lessons, providedStorage, { kind, limit = 2 } = {}) {
  try {
    const draftSummary = createDraftSummaryReader(providedStorage ?? window.localStorage);
    return lessons.flatMap(lesson => (kind ? [kind] : ["lesson", "trainer"]).flatMap(type => {
      const draft = draftSummary(type, lesson.slug, lesson.draftVersions?.[type], value =>
        type === "lesson" ? typeof value.cardId === "string" && value.cardId !== "finish"
          : typeof value.taskId === "string");
      return draft ? [{ kind: type, slug: lesson.slug, title: lesson.title, updatedAt: draft.updatedAt }] : [];
    })).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)).slice(0, limit);
  } catch { return []; }
}

export function useRecentDrafts(lessons, { kind, limit = 2 } = {}) {
  const [snapshot, setSnapshot] = useState(null);
  useEffect(() => {
    if (!lessons) return;
    const prefixes = (kind ? [kind] : ["lesson", "trainer"]).map(type => DRAFT_PREFIX + type + ":");
    const refresh = () => {
      const drafts = recentDrafts(lessons, undefined, { kind, limit });
      setSnapshot(previous => {
        if (drafts.length === 0) return null;
        if (previous?.lessons === lessons && previous.kind === kind && previous.limit === limit
          && previous.drafts.length === drafts.length && drafts.every((draft, i) => {
            const old = previous.drafts[i];
            return draft.kind === old.kind && draft.slug === old.slug && draft.title === old.title && draft.updatedAt === old.updatedAt;
          })) return previous;
        return { lessons, kind, limit, drafts };
      });
    };
    const storageChanged = event => {
      if (event.key !== null && event.key !== PROFILE_KEY && !prefixes.some(prefix => event.key.startsWith(prefix))) return;
      try { if (event.storageArea === window.localStorage) refresh(); } catch { /* No readable local storage. */ }
    };
    window.addEventListener("storage", storageChanged);
    window.addEventListener("focus", refresh);
    refresh();
    return () => {
      window.removeEventListener("storage", storageChanged);
      window.removeEventListener("focus", refresh);
    };
  }, [lessons, kind, limit]);
  return snapshot?.lessons === lessons && snapshot?.kind === kind && snapshot?.limit === limit ? snapshot.drafts : [];
}
