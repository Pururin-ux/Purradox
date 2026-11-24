import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { matchPath, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import "./a.css";
import DashboardA from "./DashboardA";
import { LoadingA, ShellA } from "./ShellA";
import { ProfileA, ProfileLauncher } from "./ProfileA";
import { prefetchStudyPage, useCatalog } from "@/lib/hooks";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { preloadFormulaMarkup } from "@/components/shared/Tex";

import "./game.css";
import "./workshop.css";
import "./study.css";
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
import "./ct-lobby.css";
import "./crafted-shelf.css";
import "./graphic-return.css";
import { LINKS } from "@/lib/nav";
import { syncCourseCatalog, useProfileGeneration } from "@/lib/game";

class RouteLoadBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError(error) { return { failed: true, chunkFailed: error?.name === "ChunkLoadError" }; }

  componentDidUpdate(previous) {
    if (this.state.failed && previous.pathname !== this.props.pathname) this.props.retry();
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <ShellA><div className="study-trainer study-load">
      <Alert className="study-load-error" role="alert" data-testid="route-load-error">
        <AlertTitle role="heading" aria-level={1}>Страница не загрузилась</AlertTitle>
        <AlertDescription>Попробуй открыть её ещё раз.</AlertDescription>
        <Button type="button" className="study-next" onClick={() => this.props.retry(this.state.chunkFailed)}>Попробовать снова</Button>
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
    const retry = (recoverNested = false) => {
      if (recoverNested && readyPage) {
        window.location.reload();
        return;
      }
      setAttempt(current => ({ id: current.id + 1, Content: readyPage ?? lazy(load) }));
    };
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

const LessonA = deferredRoute(() => {
  preloadFormulaMarkup();
  return import("./LessonA");
});
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

function ProfileOverlay({ routedOpen, children }) {
  const navigate = useNavigate();
  const trigger = useRef(null);
  const pending = useRef(false);
  const [opening, setOpening] = useState(false);
  const clearOpening = useCallback(() => {
    pending.current = false;
    setOpening(false);
  }, []);
  const launch = useCallback((button, backgroundLocation) => {
    if (pending.current) return;
    pending.current = true;
    trigger.current = button;
    // Show the dialog during the click; the router updates the URL in a transition.
    setOpening(true);
    navigate("/profile", { state: { backgroundLocation } });
  }, [navigate]);

  useEffect(() => {
    if (routedOpen) clearOpening();
  }, [routedOpen, clearOpening]);
  useEffect(() => {
    window.addEventListener("popstate", clearOpening);
    return () => window.removeEventListener("popstate", clearOpening);
  }, [clearOpening]);

  return <ProfileLauncher.Provider value={launch}>
    {children}
    {(routedOpen || opening) && <ProfileA open onOpenChange={open => {
      if (!open) { clearOpening(); navigate(-1); }
    }} onCloseAutoFocus={event => {
      event.preventDefault();
      requestAnimationFrame(() => {
        const button = trigger.current?.isConnected ? trigger.current : document.querySelector('[data-testid="hud-user-level"]');
        button?.focus({ preventScroll: true });
      });
    }} />}
  </ProfileLauncher.Provider>;
}

export default function VariantA() {
  const location = useLocation();
  const profileGeneration = useProfileGeneration();
  const client = useQueryClient();
  // backgroundLocation — страница, поверх которой открыт профиль по ссылке с шапки.
  const background = location.pathname === "/profile" ? location.state?.backgroundLocation : null;
  const { pathname } = background || location;
  useEffect(() => { prefetchStudyPage(client, pathname); }, [client, pathname]);
  return (
    <ProfileOverlay routedOpen={Boolean(background)}>
      <div className={`va va-grain ${/^\/(trainer|lesson|review|ct|shop|learn|practice|profile)(\/|$)/.test(pathname) || pathname === "/" ? "va-study" : ""} ${pathname.startsWith("/ct") ? "ct-study" : ""}`} data-testid="variant-a-root">
        <CourseProgressSync generation={profileGeneration} />
        <Routes location={background || location} key={background || pathname !== "/profile" ? profileGeneration ?? "local" : "profile"}>
          <Route path="/" element={<DashboardA />} />
          <Route path="/profile" element={<ShellA bare profileOpen />} />
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
      </div>
    </ProfileOverlay>
  );
}
