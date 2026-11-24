import { memo, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Flame, ScrollText, Volume2, VolumeX, Zap } from "lucide-react";
import { NAV, practiceReturn } from "@/lib/nav";
import { toggleMute, useMuted, useSfx } from "@/lib/sound";
import { levelInfo, msToReset, questView, refreshGame, streakView, useGame, useSaveError } from "@/lib/game";
import { ProfileA, ProfileLauncher, ProfilePortrait } from "./ProfileA";
import { formatJoules } from "@/lib/format";
import { QuestsDrawer } from "./QuestsA";
import { BrandWordmark } from "./BrandWordmark";
import { BrandMark } from "./BrandMark";

export function Sky() {
  return (
    <div className="a-sky" aria-hidden>
      <div className="a-stars" />
      <div className="a-stars two" />
    </div>
  );
}

export function Logo() {
  return (
    <Link to="/" className="site-logo fh" data-testid="nav-logo" aria-label="Пуррадокс — мастерская физики">
      <span className="brand-cat" aria-hidden="true">
        <BrandMark />
      </span>
      <span className="brand-name"><BrandWordmark /></span>
    </Link>
  );
}

function AnimatedNumber({ value, format }) {
  const [shown, setShown] = useState(value);
  const displayed = useRef(value);
  useEffect(() => {
    const from = displayed.current;
    if (from === value) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      displayed.current = value;
      setShown(value);
      return;
    }
    const started = performance.now();
    let frame;
    const tick = now => {
      const fraction = Math.min(1, (now - started) / 320);
      displayed.current = Math.round(from + (value - from) * (1 - (1 - fraction) ** 3));
      setShown(displayed.current);
      if (fraction < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return format(shown);
}

function LevelBadge({ xp, avatar, onClick }) {
  const L = levelInfo(xp);
  const r = 17;
  const c = 2 * Math.PI * r;
  return (
    <Button variant="ghost" className="hud-level hud-profile" onClick={onClick} data-testid="hud-user-level" aria-label="Открыть профиль">
      <span className="relative grid h-[42px] w-[42px] flex-none place-items-center">
        <svg width="42" height="42" viewBox="0 0 42 42" className="lvl-ring" data-testid="hud-xp-progress" aria-label={`Опыт ${L.cur} из ${L.need}`}>
          <circle cx="21" cy="21" r={r} className="track" />
          <circle cx="21" cy="21" r={r} className="fill" strokeDasharray={c} strokeDashoffset={c * (1 - L.pct)} />
        </svg>
        <ProfilePortrait id={avatar} /><span className="lvl-num fh">{L.level}</span>
      </span>
      <span className="level-caption flex-col leading-tight">
        <b className="text-xs">{L.title}</b>
        <span className="fm tm text-[10px]">{L.cur}/{L.need} XP</span>
      </span>
    </Button>
  );
}

export function Stats({ onQuests, onProfile }) {
  const g = useGame();
  useEffect(() => {
    let timer;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { refreshGame(); arm(); }, Math.max(1, msToReset()));
    };
    arm();
    window.addEventListener("focus", arm);
    return () => { clearTimeout(timer); window.removeEventListener("focus", arm); };
  }, []);
  const s = streakView(g);
  const qs = questView(g);
  const ready = qs.filter((q) => q.done && !q.claimed).length;
  const claimed = qs.filter((q) => q.claimed).length;
  return <HudControls xp={g.xp} avatar={g.avatar} joules={g.joules} streak={s.streak} today={s.today}
    ready={ready} claimed={claimed} onProfile={onProfile} onQuests={onQuests} />;
}

const HudControls = memo(function HudControls({ xp, avatar, joules, streak, today, ready, claimed, onProfile, onQuests }) {
  const muted = useMuted();
  return (
    <div className="hud-stats flex flex-1 items-center justify-between gap-1.5 sm:flex-none sm:justify-end md:gap-2">
      <LevelBadge xp={xp} avatar={avatar} onClick={onProfile} />
      <span className="a-stat c-lamp" data-testid="hud-joules-balance"><Zap size={14} /><AnimatedNumber value={joules} format={formatJoules} /></span>
      <span className={`a-stat streak ${today ? "is-hot" : ""}`} data-testid="hud-streak-count"><Flame size={14} />{streak}</span>
      <Button type="button" variant="ghost" className="a-iconbtn hud-quests" onClick={onQuests}
        aria-label="Квесты дня" data-ready={ready > 0 || undefined} data-testid="hud-quests-button">
        <ScrollText aria-hidden="true" />
        <span className="hud-quest-count" data-testid="hud-quests-count">{ready > 0 ? ready : `${claimed}/3`}</span>
      </Button>
      <Button type="button" variant="ghost" className="a-iconbtn" onClick={toggleMute} aria-label={muted ? "Включить звук" : "Выключить звук"} data-testid="hud-sound-toggle">
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </Button>
    </div>
  );
});

// Router path matching does not distinguish the two /shop query destinations.
// Keep its pathname behavior and choose the current tab before styling/ARIA.
function destinationSelected(item, search) {
  if (item.id !== "shop" && item.id !== "collection") return true;
  const collection = new URLSearchParams(search).get("tab") === "collection";
  return item.id === "collection" ? collection : !collection;
}

function navSelected(item, pathname, search) {
  if (item.id === "textbook") return pathname === "/learn" || pathname.startsWith("/lesson/");
  if (item.id === "trainer") return pathname === "/practice" || pathname.startsWith("/trainer/");
  if (item.id === "ct-demo") return pathname === "/ct" || pathname.startsWith("/ct/");
  return pathname === item.to.split("?")[0] && destinationSelected(item, search);
}

function navTo(item, location) {
  return item.id === "trainer" && location.pathname.startsWith("/trainer/") ? practiceReturn(location) : item.to;
}

const TopBar = memo(function TopBar({ onQuests, onProfile }) {
  const play = useSfx();
  const location = useLocation();
  const { search, pathname } = location;
  return (
    <header className="a-top">
      <div className="topbar-inner">
        <Logo />
        <nav className="desktop-nav" aria-label="Основная навигация">
          {NAV.map((n) => (
            <Link key={n.id} to={navTo(n, location)} aria-current={navSelected(n, pathname, search) ? "page" : undefined} onClick={() => play("tap")} className={"a-navlink " + (navSelected(n, pathname, search) ? "active" : "")} data-testid={`nav-${n.id}-btn`}>
              <n.icon size={16} />
              {n.label}
            </Link>
          ))}
        </nav>
        <Stats onQuests={onQuests} onProfile={onProfile} />
      </div>
    </header>
  );
});

function BottomNav() {
  const play = useSfx();
  const g = useGame();
  const location = useLocation();
  const { search, pathname } = location;
  return (
    <nav className="a-bottom mobile-nav" aria-label="Основная навигация">
      {NAV.filter((n) => n.mobile).map((n) => (
        <Link key={n.id} to={navTo(n, location)} aria-current={(n.id === "shop" ? pathname === "/shop" : navSelected(n, pathname, search)) ? "page" : undefined} onClick={() => play("tap")} className={"a-tab " + ((n.id === "shop" ? pathname === "/shop" : navSelected(n, pathname, search)) ? "active" : "")} data-testid={`tab-${n.id}-btn`}>
          <span className="relative">
            <n.icon size={21} aria-hidden="true" />
            {n.id === "shop" && g.capsules > 0 && <span className="tab-dot" />}
          </span>
          {n.mobileLabel ?? n.label}
        </Link>
      ))}
    </nav>
  );
}

export function ShellA({ children, bare = false, profileOpen: initialProfileOpen = false, mainClassName = "" }) {
  const [quests, setQuests] = useState(false);
  const [profileOpen, setProfileOpen] = useState(Boolean(initialProfileOpen));
  // Шапка открывает профиль поверх текущей страницы и меняет адрес на /profile,
  // чтобы ссылку можно было скопировать; страница остаётся в фоновом маршруте.
  // Прямой адрес использует общую оболочку и возвращает на "/" при закрытии.
  const location = useLocation();
  const navigate = useNavigate();
  const launchProfile = useContext(ProfileLauncher);
  const setProfile = useCallback(open => {
    setProfileOpen(open);
    if (!open && location.pathname === "/profile") navigate("/", { replace: true });
  }, [location.pathname, navigate]);
  const openProfile = useCallback(event => {
    if (location.pathname === "/profile") return setProfileOpen(true);
    if (launchProfile) launchProfile(event.currentTarget, location);
    else navigate("/profile", { state: { backgroundLocation: location } });
  }, [location, launchProfile, navigate]);
  const questsTriggerRef = useRef(null);
  const saveError = useSaveError();
  const play = useSfx();
  const openQuests = useCallback(event => {
    questsTriggerRef.current = event.currentTarget;
    play("pop");
    setQuests(true);
  }, [play]);
  return (
    <div className="relative min-h-screen">
      <Sky />
      {!bare && <TopBar onProfile={openProfile} onQuests={openQuests} />}
      {saveError && <Alert className="study-save-alert" data-testid="progress-save-error"><AlertCircle aria-hidden="true" /><AlertTitle>Проблема с сохранением</AlertTitle><AlertDescription>{saveError}</AlertDescription></Alert>}
      <main id="main-content" tabIndex={-1} className={`relative z-10 ${bare ? "" : "pb-28 lg:pb-16"} ${mainClassName}`}>{children}</main>
      {!bare && <BottomNav />}
      <QuestsDrawer open={quests} onClose={() => setQuests(false)} returnFocusRef={questsTriggerRef} />
      {profileOpen && <ProfileA open onOpenChange={setProfile} />}
    </div>
  );
}

export function LoadingA() {
  return (
    <div className="grid min-h-[60vh] place-items-center" data-testid="loading" role="status">
      <span className="sr-only">Загружаем…</span>
      <div aria-hidden="true" className="h-14 w-14 rounded-full border-2 border-white/10 border-t-[var(--lamp)]" style={{ animation: "a-spin 0.9s linear infinite" }} />
    </div>
  );
}
