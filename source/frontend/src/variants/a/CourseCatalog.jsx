import { useLayoutEffect, useMemo, useRef } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Activity, ArrowDownRight, ArrowRight, ArrowRightLeft, ArrowUpRight, AudioLines, Bike, BookOpen, Check, CircleAlert, Clock3, Droplets, Focus, Orbit, ScanLine, Search, Snowflake, Spline, Target, Thermometer, TrainFront, Waves, X, Zap } from "lucide-react";
import { ShellA, LoadingA } from "./ShellA";
import { useCatalog } from "@/lib/hooks";
import { useGame } from "@/lib/game";
import { recentDrafts } from "@/lib/courseProgress";
import { artImg } from "@/lib/artifacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { lessonEditorial } from "@/lib/lessonEditorial";
import { LINKS } from "@/lib/nav";
import { LessonArtwork } from "./LessonArt";

const tone = { mechanics:"apricot", thermal:"rose", electricity:"violet", optics:"mint", quantum:"sky", nucleus:"lilac" };
const lessonStamp = {
  track:ArrowRightLeft, trace:Activity, gaze:Focus, spectrum:AudioLines, spring:Waves,
  molecules:ScanLine, reaction:Orbit, expansion:Thermometer, fall:ArrowDownRight, rays:Spline, frame:TrainFront, cycles:Bike, field:ArrowUpRight,
  depth:Droplets, melting:Snowflake, coulomb:Zap, decay:Orbit,
  orbit:Orbit, lift:ArrowUpRight, vapor:Droplets, fronts:Waves, routes:Spline, slope:Activity, switch:Zap, helix:Orbit,
};
export const lessonUrl = (slug, practice = false) => (practice ? "/trainer/" : "/lesson/") + slug;
const searchKey = text => text.toLocaleLowerCase("ru").replaceAll("ё", "е").replace(/[^а-яa-z0-9]+/g, " ").trim();

function matchesTopic(row, words) {
  if (!words.length) return true;
  const searchable = searchKey([row.title, row.description, ...row.coverage].join(" "));
  return words.every(word => searchable.includes(word));
}

export default function CourseCatalog({ practice = false }) {
  const { data, error, refetch } = useCatalog();
  const g = useGame();
  const [params, setParams] = useSearchParams();
  const { pathname, search } = useLocation();
  const catalogState = { catalog: { pathname, search } };
  const query = params.get("q") ?? "";
  const term = searchKey(query);
  const section = params.get("section") ?? "all";
  const sectionRail = useRef(null);
  const activeSection = useRef(null);
  const pending = params.get("pending") === "1";
  useLayoutEffect(() => {
    const rail = sectionRail.current, tab = activeSection.current;
    if (!rail || !tab) return;
    const reveal = () => {
      if (rail.scrollWidth <= rail.clientWidth) return;
      const { left, right } = tab.getBoundingClientRect(), edge = rail.getBoundingClientRect();
      if (left < edge.left || right > edge.right) rail.scrollLeft += (left + right - edge.left - edge.right) / 2;
    };
    reveal();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(reveal) : null;
    observer?.observe(rail);
    return () => observer?.disconnect();
  }, [section, data]);
  const progress = row => practice ? row.taskIds.filter(id => g.solved.includes(id)).length : Number(g.completedLessons.includes(row.slug));
  const filtered = useMemo(() => {
    const words = term ? term.split(" ") : [];
    return data?.lessons.filter(row => (section === "all" || row.section === section)
      && matchesTopic(row, words)
      && (!pending || (practice ? row.taskIds.some(id => !g.solved.includes(id)) : !g.completedLessons.includes(row.slug)))) ?? [];
  }, [data, term, section, pending, practice, g.solved, g.completedLessons]);
  const update = (key, value) => setParams(previous => { const next = new URLSearchParams(previous); value ? next.set(key, value) : next.delete(key); return next; }, { replace: true });
  const completed = data?.lessons.filter(row => g.completedLessons.includes(row.slug)).length ?? 0;
  const showContinue = data && !term && section === "all" && !pending;
  const resumed = showContinue && recentDrafts(data.lessons, undefined, { kind: practice ? "trainer" : "lesson", limit: 1 })[0];
  const continueRow = showContinue && data.lessons.find(row => resumed
    ? row.slug === resumed.slug
    : practice
      ? row.taskIds.some(id => !g.solved.includes(id))
      : !g.completedLessons.includes(row.slug));
  const totalTasks = data?.lessons.reduce((n, row) => n + row.taskCount, 0) ?? 0;
  const solved = data?.lessons.reduce((n, row) => n + row.taskIds.filter(id => g.solved.includes(id)).length, 0) ?? 0;
  return <ShellA><div className={"course-catalog " + (practice ? "is-practice" : "is-textbook")}>
    <header className="course-heading">
      <div>
        <h1>{practice ? "Задачи по темам" : "Учебник"}</h1>
        {!practice && <p>Физика к ЦТ, от первого измерения до атомного ядра.</p>}
      </div>
      <div className="course-total" aria-label="Общий прогресс">
        {practice ? <Target aria-hidden="true" /> : <BookOpen aria-hidden="true" />}
        <strong>{practice ? solved : completed}<span>/{practice ? totalTasks : data?.lessons.length ?? "…"}</span></strong>
        <span>{practice ? "решено" : "уроков пройдено"}</span>
      </div>
    </header>
    {showContinue && (continueRow ? (
      <Link to={lessonUrl(continueRow.slug, practice)} state={catalogState} className="course-continue" data-testid="course-continue">
        {!practice && <img className="course-continue-peek" src="/art/lesson-hooks/kot-u-zakladki-v1.webp" width="240" height="377" alt="" />}
        <span className="course-continue-label">{resumed ? "Продолжить" : "Следующая тема"}</span>
        <span className="course-continue-title">{continueRow.title}</span>
        {practice && <span className="course-continue-meta">{continueRow.taskIds.filter(id => g.solved.includes(id)).length}/{continueRow.taskCount} решено</span>}
        <ArrowRight aria-hidden="true" />
      </Link>
    ) : (
      <Link to={LINKS.review} className="course-continue" data-testid="course-continue-done">
        <span className="course-continue-label">{practice ? "Все задачи решены" : "Все уроки пройдены"}</span>
        <span className="course-continue-title">Повторить ошибки</span>
        {practice && <span className="course-continue-meta">{solved}/{totalTasks} решено</span>}
        <ArrowRight aria-hidden="true" />
      </Link>
    ))}
    <div className="course-toolbar">
      <div className="course-search"><Search aria-hidden="true" /><Input aria-label="Найти тему" type="search" placeholder="Название темы или понятие" value={query} onChange={e => update("q", e.target.value)} />
        {query && <Button variant="ghost" size="icon" aria-label="Очистить поиск" onClick={() => update("q", "")}><X aria-hidden="true" /></Button>}
      </div>
      <Button variant="ghost" className="course-pending" aria-pressed={pending} onClick={() => update("pending", pending ? "" : "1")}><span className="course-filter-dot">{pending && <Check aria-hidden="true" />}</span>{practice ? "Осталось решить" : "Ещё не пройдено"}</Button>
    </div>
    {data && <nav ref={sectionRail} className="course-sections" aria-label="Разделы физики">
      <Button ref={section === "all" ? activeSection : null} variant="ghost" aria-pressed={section === "all"} onClick={() => update("section", "")}>Все темы</Button>
      {data.sections.map(s => <Button ref={section === s.id ? activeSection : null} key={s.id} variant="ghost" data-tone={tone[s.id]} aria-pressed={section === s.id} onClick={() => update("section", s.id)}>{s.short}</Button>)}
    </nav>}
    {!data && !error && <LoadingA />}
    {error && <Alert className="course-error"><CircleAlert /><AlertTitle>Каталог не загрузился</AlertTitle><AlertDescription>Проверь соединение и попробуй ещё раз.</AlertDescription><Button variant="secondary" onClick={() => refetch()}>Повторить</Button></Alert>}
    {data && filtered.length === 0 && (term || !pending ? <Card className="course-empty course-search-empty"><CardContent>
      <img src="/art/lesson-hooks/kot-lupa-v1.webp" width="440" height="440" alt="" />
      <div><h2>Ничего не нашлось</h2><p>Попробуй одно слово, например «сила», «газ» или «линза».</p>
        {section === "all" && !pending ? <Button variant="secondary" onClick={() => update("q", "")}>Очистить поиск</Button>
          : <Button variant="secondary" onClick={() => setParams({ q: query }, { replace: true })}>Искать среди всех тем</Button>}
      </div>
    </CardContent></Card> : <Card className="course-empty"><CardContent><h2>{practice ? "Все задачи здесь решены" : "Все уроки здесь пройдены"}</h2><Button variant="secondary" onClick={() => setParams({}, { replace: true })}>Показать все темы</Button></CardContent></Card>)}
    <div className="course-chapters">
      {data?.sections.map(s => {
        const rows = filtered.filter(row => row.section === s.id);
        if (!rows.length) return null;
        const allRows = data.lessons.filter(row => row.section === s.id);
        const done = allRows.reduce((n, row) => n + progress(row), 0);
        const total = practice ? allRows.reduce((n,row) => n + row.taskCount, 0) : allRows.length;
        const featured = practice || term ? null : rows.find(row => lessonEditorial[row.slug]?.art);
        const featuredArt = featured && lessonEditorial[featured.slug].art;
        return <section key={s.id} className="course-chapter" data-tone={tone[s.id]} aria-labelledby={"chapter-" + s.id}>
          <header className="course-chapter-heading">
            <img src={artImg(s.art)} width="240" height="240" alt="" loading="lazy" />
            <div><h2 id={"chapter-" + s.id}>{s.title}</h2><p>{done}/{total} {practice ? "решено" : "пройдено"}</p><Progress value={done / total * 100} aria-label={"Прогресс: " + s.title} /></div>
          </header>
          <div className="course-lesson-list">
            {rows.map(row => {
              const value = progress(row), finished = practice ? value === row.taskCount : value === 1;
              const editorial = !practice && lessonEditorial[row.slug];
              const art = editorial?.art;
              const activity = editorial?.tryInLesson;
              const ActivityIcon = lessonStamp[activity?.kind];
              const lead = featuredArt && featured.slug === row.slug;
              return <Card key={row.slug} className="course-lesson" data-done={finished || undefined} data-featured={lead || undefined}>
                <CardContent>
                  <Link to={lessonUrl(row.slug, practice)} state={catalogState} className="course-lesson-main">
                    {art && <LessonArtwork art={art} className="course-lesson-art" sizes={lead ? "(max-width: 640px) calc(100vw - 76px), 400px" : "82px"} thumbnail={!lead} loading="lazy" decorative />}
                    <span className="course-lesson-mark">{finished ? <Check aria-label="Пройдено" /> : practice ? <Target aria-hidden="true" /> : <span>{String(row.order).padStart(2,"0")}</span>}</span>
                    <div className="course-lesson-copy">
                      <h3>{row.title}</h3>
                      <p className={lead && editorial.title ? "course-lesson-hook" : undefined}>{lead && editorial.title ? editorial.title : row.description}</p>
                      {ActivityIcon && <span className="course-lesson-activity" data-activity={activity.kind}>
                        <ActivityIcon aria-hidden="true" />{activity.label}
                      </span>}
                      <span className="course-lesson-meta">{practice ? <><Target aria-hidden="true" />{value}/{row.taskCount} решено</> : <><Clock3 aria-hidden="true" />{row.minutes} мин</>}</span>
                    </div>
                    <ArrowRight className="course-lesson-arrow" aria-hidden="true" />
                  </Link>
                  {practice && <Link className="course-theory-link" to={lessonUrl(row.slug)} state={catalogState}><BookOpen aria-hidden="true" />К теории</Link>}
                </CardContent>
              </Card>;
            })}
          </div>
        </section>;
      })}
    </div>
    {data && <footer className="course-source">Материалы по спецификации ЦТ {data.basis.year}. <a href={data.basis.source} target="_blank" rel="noreferrer">Что входит в программу<ArrowRight aria-hidden="true" /></a></footer>}
  </div></ShellA>;
}
