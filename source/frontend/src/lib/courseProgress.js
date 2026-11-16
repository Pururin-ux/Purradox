import { createDraftSummaryReader } from "./draftStore";

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
