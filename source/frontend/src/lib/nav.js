import { BookOpen, Gem, RotateCcw, Store, Target, Timer } from "lucide-react";
import { LESSON_SLUG } from "@/lib/hooks";

export const LINKS = {
  textbook: "/learn",
  practice: "/practice",
  lesson: `/lesson/${LESSON_SLUG}`,
  trainer: `/trainer/${LESSON_SLUG}`,
  review: "/review",
  shop: "/shop",
  collection: "/shop?tab=collection",
  ct: "/ct",
};

export function practiceReturn({ state }) {
  const catalog = state?.catalog;
  return catalog?.pathname === LINKS.practice && typeof catalog.search === "string" && catalog.search.startsWith("?")
    ? { pathname: LINKS.practice, search: catalog.search }
    : LINKS.practice;
}

export const NAV = [
  { to: LINKS.textbook, label: "Учебник", mobileLabel: "Уроки", icon: BookOpen, id: "textbook", mobile: true },
  { to: LINKS.practice, label: "Тренажёр", mobileLabel: "Задачи", icon: Target, id: "trainer", mobile: true },
  { to: LINKS.review, label: "Повторение", mobileLabel: "Повтор", icon: RotateCcw, id: "review", mobile: true },
  { to: LINKS.shop, label: "Магазин", icon: Store, id: "shop", mobile: true },
  { to: LINKS.collection, label: "Коллекция", mobileLabel: "Полка", icon: Gem, id: "collection", mobile: true },
  { to: LINKS.ct, label: "ЦТ", icon: Timer, id: "ct-demo", mobile: true },
];

export const TG_PLACEHOLDER = "[ссылка на ТГК]";
