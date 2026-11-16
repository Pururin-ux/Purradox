import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const api = axios.create({ baseURL: (process.env.REACT_APP_BACKEND_URL ?? "").replace(/\/+$/, "") + "/api" });
export const assessmentChanged = error => error?.response?.status === 409;

export const LESSON_SLUG = "ravnouskorennoe-dvizhenie";

const get = (url) => api.get(url).then((r) => r.data);
const post = (url, body) => api.post(url, body).then((r) => r.data);

const lessonQuery = slug => ({ queryKey: ["lesson", slug], queryFn: () => get(`/lessons/${slug}`) });
const trainerQuery = slug => ({ queryKey: ["trainer", slug], queryFn: () => get(`/trainer/${slug}`) });

export const useLesson = (slug) => useQuery(lessonQuery(slug));
export const useTrainerTasks = (slug) => useQuery(trainerQuery(slug));
export function prefetchStudyPage(client, pathname) {
  const match = /^\/(lesson|trainer)\/([a-z0-9-]+)\/?$/.exec(pathname);
  if (!match) return;
  const [, section, slug] = match;
  void client.prefetchQuery(section === "lesson" ? lessonQuery(slug) : trainerQuery(slug));
}
export const useCtDemo = () => useQuery({ queryKey: ["ct-demo"], queryFn: () => get("/ct/demo") });
export const useCatalog = () => useQuery({ queryKey: ["course-catalog"], queryFn: () => get("/catalog"), staleTime: 60000 });
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
    queryFn: async () => {
      if (needsBank) return get("/tasks");
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
export function useReviewItems(ids) {
  const unique = [...new Set(ids)].sort();
  return useQuery({ queryKey: ["review", unique], enabled: unique.length > 0, staleTime: 60000,
    queryFn: async () => {
      // The course fits one request. Larger imported histories stay readable.
      const pages = [];
      for (let i = 0; i < unique.length; i += 500) pages.push(await post("/review", { ids: unique.slice(i, i + 500) }));
      return { items: pages.flatMap(page => page.items) };
    } });
}
export const useCtVariants = () => useQuery({ queryKey: ["ct-variants"], queryFn: () => get("/ct/variants") });
export const useCtVariant = (id) => useQuery({ queryKey: id ? ["ct-variant", id] : ["ct-demo"], queryFn: () => get(id ? "/ct/variants/" + id : "/ct/demo") });
export const submitVariant = (id, revision) => (answers, elapsed_sec) => post("/ct/variants/" + id + "/submit", { answers, elapsed_sec, revision });

export const checkLesson = (slug, revision) => (id, answer) => post(`/lessons/${slug}/check`, { id, answer, revision });
export const checkTask = (id, answer, revision) => post("/trainer/check", { id, answer, revision });
export const submitCt = (answers, elapsed_sec) => post("/ct/demo/submit", { answers, elapsed_sec });
