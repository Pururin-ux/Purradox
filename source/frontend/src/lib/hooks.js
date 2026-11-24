import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const api = axios.create({
  baseURL: (process.env.REACT_APP_BACKEND_URL ?? "").replace(/\/+$/, "") + "/api",
  timeout: 7000,
  transitional: { clarifyTimeoutError: true },
});
export const assessmentChanged = error => error?.response?.status === 409;

export const LESSON_SLUG = "ravnouskorennoe-dvizhenie";

const get = (url, signal) => api.get(url, { signal }).then((r) => r.data);
const post = (url, body, options) => api.post(url, body, options).then((r) => r.data);

const lessonQuery = slug => ({ queryKey: ["lesson", slug], queryFn: ({ signal }) => get(`/lessons/${slug}`, signal) });
const trainerQuery = slug => ({ queryKey: ["trainer", slug], queryFn: ({ signal }) => get(`/trainer/${slug}`, signal) });
const catalogQuery = { queryKey: ["course-catalog"], queryFn: ({ signal }) => get("/catalog", signal), staleTime: 60000 };
const ctListQuery = { queryKey: ["ct-variants"], queryFn: ({ signal }) => get("/ct/variants", signal) };
const ctExamQuery = id => ({ queryKey: id ? ["ct-variant", id] : ["ct-demo"], queryFn: ({ signal }) => get(id ? `/ct/variants/${id}` : "/ct/demo", signal) });

export const useLesson = (slug) => useQuery(lessonQuery(slug));
export const useTrainerTasks = (slug) => useQuery(trainerQuery(slug));
export function prefetchStudyPage(client, pathname) {
  const route = pathname.replace(/\/$/, "");
  if (["", "/profile", "/learn", "/practice"].includes(route)) {
    void client.prefetchQuery(catalogQuery);
    return;
  }
  if (route === "/ct") {
    void client.prefetchQuery(ctListQuery);
    return;
  }
  if (route === "/ct/demo") {
    void client.prefetchQuery(ctExamQuery());
    return;
  }
  const variant = /^\/ct\/variant\/([0-9]{1,2})$/.exec(route);
  if (variant) {
    void client.prefetchQuery(ctExamQuery(variant[1].padStart(2, "0")));
    return;
  }
  const match = /^\/(lesson|trainer)\/([a-z0-9-]+)$/.exec(route);
  if (match) void client.prefetchQuery(match[1] === "lesson" ? lessonQuery(match[2]) : trainerQuery(match[2]));
}
export const useCtDemo = () => useQuery(ctExamQuery());
export const useCatalog = () => useQuery(catalogQuery);
export function useLegacyReviewMetadata(items) {
  const client = useQueryClient();
  const slugs = [...new Set(items.map(item => item.lessonSlug))].sort();
  // For a short history, reuse the same topic queries as the lesson and trainer.
  // A wider history makes one bank request to avoid a burst of topic requests.
  const needsBank = slugs.length > 2 || slugs.some(slug => !slug);
  return useQuery({
    queryKey: needsBank ? ["all-tasks"] : ["legacy-review-metadata", slugs],
    enabled: items.length > 0,
    staleTime: 60000,
    queryFn: async ({ signal }) => {
      if (needsBank) return get("/tasks", signal);
      const topics = await Promise.all(slugs.map(async slug => {
        const [lesson, trainer] = await Promise.all([
          client.fetchQuery(lessonQuery(slug)),
          client.fetchQuery(trainerQuery(slug)),
        ]);
        return trainer.tasks.map(({ id, code, graph }) => ({ id, code, graph, chapter: lesson.chapter }));
      }));
      return { tasks: topics.flat() };
    },
  });
}
export function useReviewItems(ids, { variantId, priorAnswers } = {}) {
  const unique = [...new Set(ids)].sort();
  return useQuery({ queryKey: variantId ? ["review", variantId, unique, priorAnswers] : ["review", unique], enabled: unique.length > 0, staleTime: 60000,
    queryFn: async () => {
      // The course fits one request. Larger imported histories stay readable.
      const pages = [];
      for (let i = 0; i < unique.length; i += 500) pages.push(await post("/review", { ids: unique.slice(i, i + 500), variantId, priorAnswers }));
      return { items: pages.flatMap(page => page.items) };
    } });
}
export function useUpdatedFeedback(task, result, open, variantId) {
  const needsUpdate = Boolean(task?.feedbackVersion && result && task.feedbackVersion !== result.feedbackVersion);
  const priorAnswers = variantId && needsUpdate && open ? { [task.id]: result.given } : undefined;
  const query = useReviewItems(needsUpdate && open ? [task.id] : [], { variantId, priorAnswers });
  const item = needsUpdate ? query.data?.items.find(row => row.id === task.id && row.feedbackVersion === task.feedbackVersion) : result;
  return { item, pending: needsUpdate && query.isFetching, retry: query.refetch };
}

export const useCtVariants = () => useQuery(ctListQuery);
export const useCtVariant = id => useQuery(ctExamQuery(id));
export const submitVariant = (id, revision) => (answers, elapsed_sec, signal) => post("/ct/variants/" + id + "/submit", { answers, elapsed_sec, revision }, { signal });

export const checkLesson = (slug, revision) => (id, answer) => post(`/lessons/${slug}/check`, { id, answer, revision });
export const checkTask = (id, answer, revision) => post("/trainer/check", { id, answer, revision });
export const submitCt = (answers, elapsed_sec, signal) => post("/ct/demo/submit", { answers, elapsed_sec }, { signal });
