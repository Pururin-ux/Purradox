import { Component, Suspense, lazy, useEffect, useRef, useState } from "react";
import { matchPath, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import "./a.css";
import DashboardA from "./DashboardA";
import { LoadingA, ShellA } from "./ShellA";
import { ProfileA } from "./ProfileA";
import { prefetchStudyPage, useCatalog } from "@/lib/hooks";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import "./game.css";
import "./workshop.css";
import "./study.css";
import "./lesson.css";
import "./lesson-workbenches.css";
import "./lesson-experiments.css";
import "./lesson-motion-scenes.css";
import "./lesson-demonstrations.css";
import "./review.css";
import "./ct-study.css";
import "./shop-study.css";
import "./common-study.css";
import "./graphic-study.css";
import "./trainer-graphic.css";
import "./trainer-figures.css";
import "./course.css";
import "./home-studio.css";
import "./profile.css";
import "./study-labs.css";
import "./ct-lobby.css";
import "./crafted-shelf.css";
import "./graphic-return.css";
import { LINKS } from "@/lib/nav";
import { syncCourseCatalog, useProfileGeneration } from "@/lib/game";

class RouteLoadBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidUpdate(previous) {
    if (this.state.failed && previous.pathname !== this.props.pathname) this.props.retry();
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <ShellA><div className="study-trainer study-load">
      <Alert className="study-load-error" role="alert" data-testid="route-load-error">
        <AlertTitle role="heading" aria-level={1}>Страница не загрузилась</AlertTitle>
        <AlertDescription>Попробуй открыть её ещё раз.</AlertDescription>
        <Button type="button" className="study-next" onClick={this.props.retry}>Попробовать снова</Button>
      </Alert>
    </div></ShellA>;
  }
}

function deferredRoute(importPage) {
  let readyPage;
  let pending;
  const load = () => pending ??= importPage().then(module => {
    readyPage = module.default;
    return module;
  }, error => {
    pending = undefined;
    throw error;
  });
  function Page(props) {
    const { pathname } = useLocation();
    const [attempt, setAttempt] = useState(() => ({ id: 0, Content: readyPage ?? lazy(load) }));
    const { id, Content } = attempt;
    const retry = () => setAttempt(current => ({ id: current.id + 1, Content: readyPage ?? lazy(load) }));
    // Create a new lazy entry on retry. React retains the failure on the old one.
    return <RouteLoadBoundary key={id} pathname={pathname} retry={retry}>
      <Suspense fallback={<ShellA><LoadingA /></ShellA>}>
        <Content {...props} />
      </Suspense>
    </RouteLoadBoundary>;
  }
  Page.load = load;
  return Page;
}

const LessonA = deferredRoute(() => import("./LessonA"));
const TrainerA = deferredRoute(() => import("./TrainerA"));
const ReviewA = deferredRoute(() => import("./ReviewA"));
const CourseCatalog = deferredRoute(() => import("./CourseCatalog"));
const CtA = deferredRoute(() => import("./CtA"));
const CtLobby = deferredRoute(() => import("./CtLobby"));
const ShopA = deferredRoute(() => import("./ShopA"));
const StyleLab = process.env.NODE_ENV === "development" ? deferredRoute(() => import("../../style-lab/CuteTrainer")) : null;

const initialRoutes = [
  ["/lesson/:slug", LessonA], ["/trainer/:slug", TrainerA], ["/story/*", TrainerA],
  ["/learn", CourseCatalog], ["/practice", CourseCatalog], ["/review", ReviewA],
  ["/shop", ShopA], ["/collection", ShopA], ["/ct", CtLobby],
  ["/ct/demo", CtA], ["/ct/variant/:variantId", CtA],
  ...(process.env.NODE_ENV === "development" ? [["/style-lab", StyleLab]] : []),
];

export function prepareInitialRoute(pathname) {
  const initial = initialRoutes.find(([pattern]) => matchPath(pattern, pathname));
  return initial?.[1]?.load();
}

function CourseProgressSync({ generation }) {
  const { data: catalog } = useCatalog();
  useEffect(() => {
    if (!catalog) return;
    syncCourseCatalog({
      lessonSlugs: catalog.lessons.map(row => row.slug),
      taskIds: catalog.lessons.flatMap(row => row.taskIds),
    });
  }, [catalog, generation]);
  return null;
}

// API хранит id варианта двумя цифрами: /1 канонизируем в /01.
function CtVariantRoute() {
  const { variantId } = useParams();
  if (/^[0-9]$/.test(variantId)) return <Navigate to={`/ct/variant/${variantId.padStart(2, "0")}`} replace />;
  return <CtA />;
}

// Оверлей профиля: адрес /profile, а страница под окном остаётся той, откуда открыли.
function ProfileRoute() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const trigger = useRef(document.activeElement);
  return <ProfileA open onOpenChange={open => { if (!open) navigate(-1); }} onCloseAutoFocus={event => {
    event.preventDefault();
    requestAnimationFrame(() => {
      if (trigger.current?.isConnected && trigger.current.matches("button, a")) trigger.current.focus();
      else if (state?.backgroundLocation) document.querySelector('[data-testid="hud-user-level"]')?.focus();
    });
  }} />;
}

export default function VariantA() {
  const location = useLocation();
  const profileGeneration = useProfileGeneration();
  const client = useQueryClient();
  // backgroundLocation — страница, поверх которой открыт профиль по ссылке с шапки.
  const background = location.state?.backgroundLocation;
  const { pathname } = background || location;
  useEffect(() => { prefetchStudyPage(client, pathname); }, [client, pathname]);
  return (
    <div className={`va va-grain ${/^\/(trainer|lesson|review|ct|shop|learn|practice)(\/|$)/.test(pathname) || pathname === "/" ? "va-study" : ""} ${pathname.startsWith("/ct") ? "ct-study" : ""}`} data-testid="variant-a-root">
      <CourseProgressSync generation={profileGeneration} />
      <Routes location={background || location} key={background || pathname !== "/profile" ? profileGeneration : "profile"}>
        <Route path="/" element={<DashboardA />} />
        {/* Профиль остаётся модальным окном; прямой адрес открывает его поверх главной. */}
        <Route path="/profile" element={<DashboardA openProfile />} />
        {/* Коллекция — та же вкладка магазина, теперь доступная и коротким адресом. */}
        <Route path="/collection" element={<Navigate to="/shop?tab=collection" replace />} />
        <Route path="/learn" element={<CourseCatalog />} />
        <Route path="/practice" element={<CourseCatalog practice />} />
        <Route path="/story/*" element={<Navigate to={LINKS.trainer} replace />} />
        <Route path="/lesson/:slug" element={<LessonA />} />
        <Route path="/trainer/:slug" element={<TrainerA />} />
        <Route path="/review" element={<ReviewA />} />
        <Route path="/shop" element={<ShopA />} />
        <Route path="/ct" element={<CtLobby />} />
        <Route path="/ct/demo" element={<CtA />} />
        <Route path="/ct/variant/:variantId" element={<CtVariantRoute />} />
        {process.env.NODE_ENV === "development" && <Route path="/style-lab" element={<StyleLab />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {background && <Routes><Route path="/profile" element={<ProfileRoute />} /></Routes>}
    </div>
  );
}
