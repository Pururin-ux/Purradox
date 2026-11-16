import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, BookOpen, Boxes, Check, ChevronRight, CircleHelp, CornerDownRight, House, MessageCircle, Plus, RotateCcw, Target, Timer, Volume2, VolumeX, X, Zap } from "lucide-react";
import { ARTIFACTS, ART_BY_ID, artImg } from "@/lib/artifacts";
import { levelInfo, useGame } from "@/lib/game";
import { LINKS } from "@/lib/nav";
import { toggleMute, useMuted, useSfx } from "@/lib/sound";
import "./station-study.css";

const SECTIONS = [
  { to: "/study/station", label: "Мастерская", icon: House, active: true },
  { to: LINKS.lesson, label: "Учебник", icon: BookOpen },
  { to: LINKS.trainer, label: "Тренажёр", icon: Target },
  { to: LINKS.collection, label: "Коллекция", icon: Boxes },
  { to: LINKS.review, label: "Повторение", icon: RotateCcw },
  { to: LINKS.ct, label: "Демо ЦТ", icon: Timer },
];

const EXCHANGE = [
  "— Я записываю. Он торопится.",
  "— Держи ровно. Да, и тележку тоже.",
  "— На этот раз засечём время до того, как она упадёт.",
];

function FieldHeader({ game }) {
  const muted = useMuted();
  const level = levelInfo(game.xp);
  return (
    <header className="station-top">
      <Link className="station-brand" to="/study/station" aria-label="Пуррадокс — мастерская физики">
        <img className="station-brand-cat" src="/art/brand/purradox-cat-20261104-v3.png" alt="" width="44" height="44" />
        <span>Purradox</span>
      </Link>
      <div className="station-header-meta"><span className="station-live-dot" /> Мастерская открыта</div>
      <div className="station-account">
        <span className="station-money" data-testid="study-balance"><Zap size={16} strokeWidth={1.6} />{game.joules.toLocaleString("ru-RU")} <small>Дж</small></span>
        <button type="button" className="station-icon" onClick={toggleMute} aria-label={muted ? "Включить звук" : "Выключить звук"}>{muted ? <VolumeX size={19} /> : <Volume2 size={19} />}</button>
        <span className="station-level" title={`${level.title}, ${level.cur} из ${level.need} XP`}><span>{String(level.level).padStart(2, "0")}</span><small>уровень</small></span>
      </div>
    </header>
  );
}

function FieldNav({ game }) {
  const level = levelInfo(game.xp);
  return (
    <aside className="station-sidebar">
      <p className="station-eyebrow station-nav-label">Твой маршрут</p>
      <nav aria-label="Основная навигация" className="station-nav">
        {SECTIONS.map(({ to, label, icon: Icon, active }, index) => <Link to={to} key={label} aria-current={active ? "page" : undefined} className={active ? "is-current" : ""}><Icon size={19} strokeWidth={1.6} /><span>{label}</span><small>{String(index + 1).padStart(2, "0")}</small></Link>)}
      </nav>
      <div className="station-sidebar-progress">
        <span className="station-eyebrow">{level.title}</span>
        <strong>{level.cur}<small> / {level.need} XP</small></strong>
        <progress value={level.cur} max={level.need} aria-label="Опыт до следующего уровня" />
        <p>Следующий уровень — ещё одна капсула.</p>
      </div>
      <Link to={LINKS.shop} className="station-sidebar-capsule"><Boxes size={21} strokeWidth={1.5} /><span>{game.capsules ? `${game.capsules} в запасе` : "Заглянуть в лавку"}<small>{game.capsules ? "Капсулы с находками" : "Артефакты за джоули"}</small></span><ChevronRight size={16} /></Link>
    </aside>
  );
}

function Scene({ game }) {
  const [line, setLine] = useState(0);
  const play = useSfx();
  return (
    <section className="station-scene" aria-labelledby="study-episode-title">
      <div className="station-scene-image">
        <img src="/art/station-scene-v2.png" width="1536" height="1024" alt="В мастерской над виадуком девушка записывает опыт, а светлое существо с длинными тёмными руками держит тележку на наклонной дорожке." fetchPriority="high" data-testid="study-scene-art" />
        <div className="station-episode">
          <p className="station-eyebrow"><span className="station-episode-number">01</span> Механика</p>
          <h1 id="study-episode-title">Скорость<br />растёт.</h1>
          <p className="station-episode-copy">Каждую секунду быстрее.<br />Но насколько?</p>
          <Link to={LINKS.lesson} className="station-primary" data-testid="study-start-lesson">{game.lessonDone ? "К пройденному уроку" : "Начать урок"}<ArrowRight size={19} /></Link>
          <span className="station-episode-meta">9 класс <span>·</span> 10 карточек</span>
        </div>
        <button className="station-talk" type="button" aria-label="Послушать разговор за столом" onClick={() => { setLine((v) => (v + 1) % EXCHANGE.length); play("tap"); }} data-testid="study-talk"><MessageCircle size={19} strokeWidth={1.7} /><span>За столом</span></button>
        <span className="station-scene-caption" aria-hidden="true">Мастерская / 01</span>
      </div>
      <div className="station-dialogue"><span className="station-dialogue-label"><CornerDownRight size={17} />Слышно за столом</span><p aria-live="polite" data-testid="study-dialogue">{EXCHANGE[line]}</p><button type="button" onClick={() => { setLine((v) => (v + 1) % EXCHANGE.length); play("tap"); }} aria-label="Следующая реплика"><ArrowRight size={18} /></button></div>
      <div className="station-episode-footer"><span>Равноускоренное движение</span><Link to={LINKS.collection}><img src={artImg("train")} alt="" />{game.owned.includes("train") ? "Электричка уже на полке" : "За урок — электричка в коллекцию"}<ArrowRight size={15} /></Link></div>
    </section>
  );
}

function Collection({ game, onSelect }) {
  const owned = game.shelf.map((id) => ART_BY_ID[id]).filter(Boolean).slice(0, 3);
  return (
    <section className="station-collection" aria-labelledby="study-collection-title">
      <div className="station-section-title"><div><p className="station-eyebrow">Можно потрогать</p><h2 id="study-collection-title">На твоей полке<span>{String(game.owned.length).padStart(2, "0")} / {ARTIFACTS.length}</span></h2></div><Link to={LINKS.collection} aria-label="Открыть всю коллекцию"><ArrowRight size={21} /></Link></div>
      <div className="station-specimens">
        {owned.map((art, index) => <button type="button" className="station-specimen" onClick={() => onSelect(art)} key={art.id} data-testid={`study-artifact-${art.id}`}><span className="station-specimen-code">№ {String(index + 1).padStart(2, "0")}<Check size={12} /></span><img loading="lazy" src={artImg(art.id)} alt="" width="210" height="160" /><span className="station-specimen-name">{art.name}</span><span className="station-specimen-action">Рассмотреть <ArrowRight size={13} /></span></button>)}
        {Array.from({ length: Math.max(0, 3 - owned.length) }, (_, i) => <Link to={LINKS.shop} key={i} className="station-empty-specimen" aria-label="Выбрать новую находку в лавке"><span className="station-empty-number">{String(owned.length + i + 1).padStart(2, "0")}</span><Plus size={21} strokeWidth={1} /><span>Для новой находки</span></Link>)}
      </div>
      <Link to={LINKS.shop} className="station-shop-link">В лавке есть кое-что ещё <ArrowRight size={15} /></Link>
    </section>
  );
}

function RouteCard({ game }) {
  return (
    <section className="station-route" aria-labelledby="study-route-title">
      <div className="station-section-title"><div><p className="station-eyebrow">Механика · 9 класс</p><h2 id="study-route-title">Дальше по маршруту</h2></div><ArrowDown size={21} /></div>
      <Link to={LINKS.lesson}><span className="station-step">{game.lessonDone ? <Check size={16} /> : "01"}</span><span><strong>Разобраться в движении</strong><small>{game.lessonDone ? "Урок пройден" : "Равноускоренное движение"}</small></span><ArrowRight size={17} /></Link>
      <Link to={LINKS.trainer}><span className="station-step">02</span><span><strong>Проверить себя</strong><small>{game.solved.length} из 10 задач решено</small></span><ArrowRight size={17} /></Link>
      <Link to={LINKS.review}><span className="station-step">03</span><span><strong>Вернуться к сложному</strong><small>{game.mistakes.length ? `В повторении: ${game.mistakes.length}` : "Пока без нерешённых ошибок"}</small></span><ArrowRight size={17} /></Link>
    </section>
  );
}

function SpecimenDialog({ artifact, onClose }) {
  const ref = useRef(null);
  const play = useSfx();
  useEffect(() => {
    if (!artifact) return undefined;
    const dialog = ref.current;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, [artifact]);
  return (
    <dialog ref={ref} className="station-specimen-dialog" aria-labelledby="study-specimen-title" onCancel={onClose} onClose={onClose} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {artifact && <><button className="station-dialog-close" type="button" onClick={onClose} aria-label="Закрыть находку" autoFocus><X size={21} /></button><p className="station-eyebrow">Из твоей коллекции</p><img src={artImg(artifact.id)} width="280" height="230" alt={artifact.name} /><h2 id="study-specimen-title">{artifact.name}</h2><p className="station-artifact-fact">{artifact.fact}</p><div className="station-dialog-actions"><button type="button" onClick={() => play(artifact.sfx)}><Volume2 size={17} />Послушать</button><Link to={LINKS.collection}>Вся коллекция<ArrowRight size={17} /></Link></div></>}
    </dialog>
  );
}

export default function StationStudyA() {
  const game = useGame();
  const [artifact, setArtifact] = useState(null);
  return (
    <div className="station-page" data-testid="station-study">
      <a href="#station-main" className="station-skip">К содержимому</a>
      <FieldHeader game={game} />
      <div className="station-layout">
        <FieldNav game={game} />
        <main id="station-main" className="station-main">
          <div className="station-page-heading"><span>Твоя мастерская</span><span className="station-eyebrow">Равноускоренное движение · 9 класс</span></div>
          <Scene game={game} />
          <div className="station-lower"><Collection game={game} onSelect={setArtifact} /><RouteCard game={game} /></div>
          <footer className="station-page-footer"><span>Purradox</span><Link to={LINKS.review}><CircleHelp size={15} />Разобрать ошибки</Link></footer>
        </main>
      </div>
      <nav className="station-mobile-nav" aria-label="Мобильная навигация">{SECTIONS.slice(0, 4).map(({ to, label, icon: Icon, active }) => <Link key={label} to={to} aria-current={active ? "page" : undefined}><Icon size={20} strokeWidth={1.7} /><span>{label}</span></Link>)}</nav>
      <SpecimenDialog artifact={artifact} onClose={() => setArtifact(null)} />
    </div>
  );
}
