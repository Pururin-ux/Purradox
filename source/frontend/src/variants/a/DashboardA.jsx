import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Target, Timer, RotateCcw, Check, Sparkles } from "lucide-react";
import { ShellA } from "./ShellA";
import { useCatalog } from "@/lib/hooks";
import { solvedTaskCount, useGame, streakView } from "@/lib/game";
import { useRecentDrafts } from "@/lib/courseProgress";
import { LINKS } from "@/lib/nav";
import { plural } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { artThumbnail } from "@/lib/artifacts";
import { ProfilePortrait } from "./ProfileA";

export default function DashboardA() {
  const { data, error, refetch } = useCatalog();
  const g = useGame(), rows = data?.lessons ?? [];
  const next = rows.find(row => !g.completedLessons.includes(row.slug));
  const completed = rows.filter(row => g.completedLessons.includes(row.slug)).length;
  const [lastStudy, ...otherDrafts] = useRecentDrafts(data?.lessons);
  const solved = solvedTaskCount(g);
  const streak = streakView(g);
  return <ShellA><div className="home-studio">
    <section className="home-prism" aria-labelledby="home-title">
      <picture><source media="(max-width:700px)" width="1122" height="1402" sizes="calc(100vw - 36px)"
        srcSet="/art/full-site-20261107/home-mobile-v1-420.webp 420w, /art/full-site-20261107/home-mobile-v1-768.webp 768w, /art/full-site-20261107/home-mobile-v1-1122.webp 1122w" /><img src="/art/full-site-20261107/home-wide-v1.webp" width="1672" height="941" fetchPriority="high" alt="Девушка поворачивает призму, а кот ловит лапой цветной свет на столе." /></picture>
      <div className="home-prism-copy">
        <h1 id="home-title">Есть над чем{" "}<br />помурчать.</h1>
        <p>{rows.length ? `${rows.length} ${plural(rows.length, "урок", "урока", "уроков")} по физике, задачи по темам и пробное ЦТ.` : "Уроки физики, задачи по темам и пробное ЦТ."}</p>
        <Button asChild className="study-next home-primary">
          <Link to={lastStudy ? `/${lastStudy.kind}/${lastStudy.slug}` : next ? `/lesson/${next.slug}` : LINKS.textbook} aria-describedby={lastStudy ? "home-current-topic" : undefined}>
            {lastStudy ? "Продолжить" : next ? completed ? "Следующая тема" : "Начать с основ" : "К учебнику"}<ArrowRight aria-hidden="true" />
          </Link>
        </Button>
        <div className="home-intentions">
          <Button asChild variant="ghost"><Link to={LINKS.textbook}>Найти тему</Link></Button>
          <Button asChild variant="ghost"><Link to={LINKS.ct}>Подготовиться к ЦТ</Link></Button>
        </div>
        {lastStudy && <span id="home-current-topic" className="home-current-topic">{lastStudy.kind === "lesson" ? "Урок" : "Тренажёр"} · {lastStudy.title}</span>}
      </div>
    </section>
    {error && <Alert className="course-error"><AlertTitle>Темы не загрузились</AlertTitle><AlertDescription>Прогресс остался в браузере.</AlertDescription><Button variant="secondary" onClick={()=>refetch()}>Загрузить ещё раз</Button></Alert>}
    {otherDrafts.length > 0 && <section className="home-recent" aria-label="Другие начатые занятия">{otherDrafts.map(row => <Button asChild variant="ghost" className="home-resume-link" key={row.kind+row.slug}><Link to={`/${row.kind}/${row.slug}`}>{row.kind === "lesson" ? <BookOpen aria-hidden="true" /> : <Target aria-hidden="true" />}<span><small>{row.kind === "lesson" ? "Урок" : "Задачи"}</small>{row.title}</span><ArrowRight aria-hidden="true" /></Link></Button>)}</section>}
    <section className="home-desk-grid">
      <Card className="home-course-card"><CardContent>
        <span className="home-card-kicker"><BookOpen aria-hidden="true" />Учебник</span>
        <h2>{next?.title ?? (rows.length ? "Все занятия завершены" : "Оглавление")}</h2>
        {rows.length > 0 && <><p>{completed} из {rows.length} уроков пройдено</p><Progress value={completed / rows.length * 100} aria-label="Прогресс по учебнику" /></>}
        <div className="home-course-actions">
          {next && <Button asChild variant="secondary" className="home-course-open"><Link to={`/lesson/${next.slug}`}>Открыть урок<ArrowRight aria-hidden="true" /></Link></Button>}
          <Button asChild variant="ghost" className="home-text-link"><Link to={LINKS.textbook}>Весь учебник{!next && <ArrowRight aria-hidden="true" />}</Link></Button>
        </div>
      </CardContent></Card>
      <Card className="home-practice-card"><CardContent><span className="home-card-kicker"><Target aria-hidden="true" />Тренажёр</span><ProfilePortrait id="cat" className="" sizes="150px" loading="lazy" /><h2>Попробуем<br />без подсказки?</h2><p>{solved ? solved + " " + plural(solved,"задача решена","задачи решены","задач решено") : "Выбирай знакомую тему или начинай с разминки."}</p><Button asChild className="study-next"><Link to={LINKS.practice}>К задачам<ArrowRight aria-hidden="true" /></Link></Button></CardContent></Card>
      <Card className="home-ct-card"><CardContent><span className="home-card-kicker"><Timer aria-hidden="true" />Практика ЦТ</span><div className="home-ct-time"><strong>3<span>ч</span>30<span>мин</span></strong><span>30 заданий в полном варианте</span></div><p>Бланк, закладки и таймер. После сдачи откроется разбор.</p><Button asChild variant="ghost" className="home-text-link"><Link to={LINKS.ct}>Выбрать вариант<ArrowRight aria-hidden="true" /></Link></Button></CardContent></Card>
    </section>
    <section className="home-bottom-grid">
      <Link className="home-review-note" to={LINKS.review}><RotateCcw aria-hidden="true" /><div><h2>Повторение</h2><p>{g.mistakes.length ? g.mistakes.length + " " + plural(g.mistakes.length,"ошибка","ошибки","ошибок") + " в задачах и проверках." : "Пока нечего повторять."}</p></div><ArrowRight aria-hidden="true" /></Link>
      <Link className="home-shelf-note" to={LINKS.collection}><img src={artThumbnail(g.shelf[0] ?? "cradle", 180)} width="62" height="62" alt="" loading="lazy" decoding="async" /><div><h2>Твоя полка</h2><p>{g.owned.length} {plural(g.owned.length,"предмет","предмета","предметов")}{g.capsules ? " · капсул: " + g.capsules : ""}</p></div><ArrowRight aria-hidden="true" /></Link>
    </section>
    {streak.streak > 0 && <p className="home-streak-note"><Sparkles aria-hidden="true" />{streak.streak} {plural(streak.streak,"день","дня","дней")} занятий подряд{streak.today ? <><Check aria-hidden="true" />Сегодня засчитан</> : ""}</p>}
  </div></ShellA>;
}
