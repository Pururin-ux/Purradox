import { useEffect, useRef } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import World from "@/variants/a/VariantA";

const homeTitle = "Purradox · мастерская физики";
const sectionTitles = {
  learn: "Учебник",
  lesson: "Урок",
  practice: "Задачи по темам",
  trainer: "Тренажёр",
  review: "Повторение",
  shop: "Магазин",
  ct: "Практика ЦТ",
  "style-lab": "Тренажёр",
};

function RouteNavigation() {
  const location = useLocation();
  const { pathname: backgroundPath, search } = location.state?.backgroundLocation ?? location;
  const pathname = backgroundPath === "/profile" ? "/" : backgroundPath;
  const params = new URLSearchParams(search);
  const collection = pathname === "/shop" && params.get("tab") === "collection";
  const archivedReport = pathname.startsWith("/ct/") && params.get("report") === "previous";
  const profile = location.pathname === "/profile";
  const styleLab = process.env.NODE_ENV === "development" && pathname === "/style-lab";
  const route = collection ? "/shop?tab=collection" : archivedReport ? pathname + "?report=previous" : pathname;
  const previous = useRef(route);

  useEffect(() => {
    const changed = previous.current !== route;
    previous.current = route;
    if (profile) {
      document.title = "Профиль · Purradox";
      return;
    }
    if (changed) {
      const active = document.activeElement;
      if (pathname === "/shop" && active?.matches('.shop-tabs-list [role="tab"]:focus-visible')) {
        active.scrollIntoView({ block: "nearest" });
      } else {
        window.scrollTo(0, 0);
      }
    }

    const section = collection ? "Коллекция" : sectionTitles[pathname.split("/")[1]];
    document.title = section ? section + " · Purradox" : homeTitle;
    const updateHeading = () => {
      const main = document.getElementById("main-content");
      const heading = main?.querySelector('h1, [role="heading"][aria-level="1"]');
      if (!heading || heading.closest('[role="status"]')) return false;
      const title = heading.textContent.replace(/\s+/g, " ").trim();
      const alert = heading.closest('[role="alert"]');
      if (pathname !== "/" && title && !alert) document.title = title + " · Purradox";
      const active = document.activeElement;
      if (changed && !main.contains(active) && !active?.closest('[role="dialog"], [role="alertdialog"]')) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
      return !alert;
    };

    // Lazy pages and data-dependent headings can appear after the route commit.
    if (updateHeading() || styleLab) return;
    const observer = new MutationObserver(() => { if (updateHeading()) observer.disconnect(); });
    observer.observe(document.getElementById("root"), { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [collection, pathname, profile, route, styleLab]);

  return !styleLab && <a className="skip-to-content" href="#main-content" onClick={event => {
    const main = document.getElementById("main-content");
    if (!main) return;
    event.preventDefault();
    main.focus({ preventScroll: true });
    main.scrollIntoView({ block: "start" });
  }}>К основному содержимому</a>;
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteNavigation />
      <World />
    </BrowserRouter>
  );
}
