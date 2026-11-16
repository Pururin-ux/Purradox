import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, BookOpen, ChevronDown, FlaskConical, List, ListChecks, LockKeyhole, PencilLine, X } from "lucide-react";
import { ShellA, LoadingA, Logo } from "./ShellA";
import { CARDS } from "./cardsA";
import { checkLesson, useLesson } from "@/lib/hooks";
import { LINKS } from "@/lib/nav";
import { useSfx } from "@/lib/sound";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { learningDraftKey, useLearningDraft } from "@/lib/learningDraft";
import { DraftResume, DraftSaveNotice } from "./DraftResume";
import { AnswerA } from "./AnswerA";
import { Rich } from "@/components/shared/Tex";
import { recordQuizAnswer, useProfileGeneration } from "@/lib/game";
import { canonicalQuizId } from "@/lib/progressIds";
import { lessonEditorial } from "@/lib/lessonEditorial";

const shortTitles = {
  hook:"Электричка трогается", idea:"Что такое ускорение", direction:"Разгон и торможение",
  model:"Попробовать на модели", formulas:"Формулы", graph:"График скорости",
  ex1:"Сколько проехала электричка", ex2:"Тормозной путь", check:"Проверить себя", finish:"Итог урока",
};
const cardTitle = (item,slug) => (slug === "ravnouskorennoe-dvizhenie" ? shortTitles[item.id] : null) || item.title || (item.kind === "check" ? "Проверить себя" : "Итог урока");
const V = {
  enter:d => ({x:d*24,opacity:0.65}), center:{x:0,opacity:1}, exit:d => ({x:d*-16,opacity:0.65}),
};

function NotFound() {
  return <div className="lesson-empty"><BookOpen aria-hidden="true" />
    <h1>Этой темы пока нет</h1><p>Можно перейти к доступным задачам.</p>
    <Button asChild className="study-next"><Link to={LINKS.trainer}>К тренажёру <ArrowRight aria-hidden="true" /></Link></Button>
  </div>;
}

export default function LessonA() {
  const {slug} = useParams();
  const [params] = useSearchParams();
  const { state } = useLocation();
  const catalog = state?.catalog;
  const returnTo = [LINKS.textbook, LINKS.practice].includes(catalog?.pathname) ? catalog : LINKS.textbook;
  const {data,isError,error,isFetching,refetch} = useLesson(slug);
  if (!data && isError) return <ShellA>
    {error?.response?.status === 404 ? <NotFound /> :
      <Alert className="lesson-empty" data-testid="lesson-load-error" aria-busy={isFetching}>
        <AlertTitle role="heading" aria-level={1}>Урок не загрузился</AlertTitle>
        <AlertDescription>Попробуй загрузить его ещё раз.</AlertDescription>
        <Button className="study-next" disabled={isFetching} onClick={() => refetch()} data-testid="lesson-load-retry">
          {isFetching ? "Загружаем…" : "Повторить загрузку"}
        </Button>
      </Alert>}
  </ShellA>;
  if (!data) return <ShellA bare><LoadingA /></ShellA>;
  if (params.has("question")) {
    const item = data.quiz.find(question => question.id === canonicalQuizId(params.get("question")));
    return <QuizRetry key={learningDraftKey("lesson",slug,data) + ":" + item?.id} data={data} item={item} />;
  }
  return <LessonContent key={learningDraftKey("lesson",slug,data)} data={data} slug={slug} returnTo={returnTo} />;
}

function QuizRetry({ data, item }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const generation = useProfileGeneration();
  const revision = data._assessment?.revision;
  const check = checkLesson(data.slug, revision);
  return <ShellA><div className="lesson-page lesson-retry">
    <header className="lesson-topbar"><Logo /><Button asChild variant="ghost" className="lesson-close">
      <Link to={LINKS.review}><ArrowLeft aria-hidden="true" />К повторению</Link>
    </Button></header>
    <div className="lesson-heading"><div><h1>Вопрос из урока</h1><p>{data.title}</p></div></div>
    <Card className="lesson-card study-trainer">
      {item ? <>
        <p className="lesson-question"><Rich text={item.text} /></p>
        <AnswerA key={attempt} item={item} check={check} tid={"retry-" + item.id} onResult={result => {
          recordQuizAnswer(item.id, result, revision, generation);
          setResult(result);
        }} />
        {result && <Alert className="lesson-check-result" data-outcome={result.correct ? "right" : "wrong"} role="status">
          <AlertTitle>{result.correct ? "Верно" : "Есть ошибка"}</AlertTitle>
          <AlertDescription><Rich text={result.explanation} /></AlertDescription>
          {!result.correct && <Button type="button" variant="secondary" onClick={() => { setResult(null); setAttempt(n => n + 1); }}>Попробовать ещё раз</Button>}
        </Alert>}
      </> : <p>В текущей версии урока этого вопроса нет.</p>}
      <Button asChild variant="ghost"><Link to={"/lesson/" + data.slug}>Открыть урок<ArrowRight aria-hidden="true" /></Link></Button>
    </Card>
  </div></ShellA>;
}

function LessonContents({cards,current,quizDone,onSelect,slug}) {
  const groups = cards.reduce((all,item,index) => {
    const kind = item.kind === "example" ? "examples" : item.kind === "lab" ? "lab" : ["check","finish"].includes(item.kind) ? "check" : "ideas";
    if (all.at(-1)?.kind !== kind) all.push({kind,items:[]});
    all.at(-1).items.push({item,index});
    return all;
  },[]);
  const labels = {ideas:[BookOpen,"Понятия"],examples:[PencilLine,"Разбор задач"],lab:[FlaskConical,"Лаборатория"],check:[ListChecks,"Самопроверка"]};
  return <nav aria-label="Содержание урока" className="lesson-contents">
    {groups.map(group => {
      const [Icon,label] = labels[group.kind];
      return <section className="lesson-content-group" key={group.items[0].item.id}>
        <h3><Icon aria-hidden="true" />{label}</h3>
        <ol start={group.items[0].index+1}>{group.items.map(({item,index}) => <li key={item.id}>
      <Button variant="ghost" className="lesson-section-link" aria-current={index === current ? "step" : undefined}
        disabled={item.kind === "finish" && !quizDone} onClick={() => onSelect(index)} data-testid={`lesson-section-${item.id}`}>
        <span className="lesson-section-number" aria-hidden="true">{index+1}</span>
        <span>{cardTitle(item,slug)}</span>
        {item.kind === "finish" && !quizDone && <LockKeyhole className="lesson-section-lock" aria-hidden="true" />}
      </Button>
    </li>)}</ol>
      </section>;
    })}
    {!quizDone && <p className="lesson-contents-hint">Итог откроется после проверки.</p>}
  </nav>;
}

// Урок открывается вступлением: о чём тема и что будет в уроке. Затем блоки в порядке учебника.
const introCard = {id:"intro",kind:"intro",title:"Перед уроком"};

function LessonContent({data,slug,returnTo}) {
  const draft = useLearningDraft("lesson",slug,data);
  const {guess,quiz} = draft.value;
  const [dir,setDir] = useState(1);
  const [contentsOpen,setContentsOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const revealCard = useRef(null);
  const focusArticle = useCallback(node => {
    if (!node || revealCard.current !== node.dataset.cardId) return;
    revealCard.current = null;
    node.focus({preventScroll:true});
    node.scrollIntoView?.({block:"start",behavior:"instant"});
  },[]);
  const setGuess = value => draft.update(s => ({...s,guess:value}));
  const setQuiz = change => draft.update(s => ({...s,quiz:typeof change === "function" ? change(s.quiz) : change}));
  const setAnswerDraft = (id,value) => draft.update(s => ({...s,answers:{...s.answers,[id]:value}}));
  const play = useSfx();
  const controls = useDragControls();
  const cards = [introCard,...data.blocks,{id:"finish",kind:"finish"}];
  const editorial = lessonEditorial[slug];
  const i = Math.max(0,cards.findIndex(item => item.id === draft.value.cardId));
  const card = cards[i];
  const nextCard = cards[i+1];
  const nextTitle = nextCard && cardTitle(nextCard,slug);
  const quizDone = Object.keys(quiz.results).length === data.quiz.length;
  const canNext = i < cards.length-1 && !(card.kind === "check" && !quizDone);
  const goTo = n => {
    if (draft.pending || n === i || n < 0 || n >= cards.length || (cards[n].kind === "finish" && !quizDone)) return;
    revealCard.current = cards[n].id;
    setDir(n > i ? 1 : -1);
    draft.update(s => ({...s,cardId:cards[n].id}));
    setContentsOpen(false);
    play("swipe");
  };
  const go = d => { if (d > 0 && !canNext) return; goTo(i+d); };

  useEffect(() => {
    const onKey = e => {
      if (e.defaultPrevented || e.target.closest?.("input,textarea,select,button,a,[role='slider'],[role='button'],[contenteditable='true']")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    };
    window.addEventListener("keydown",onKey);
    return () => window.removeEventListener("keydown",onKey);
  });

  if (draft.pending) return <ShellA><DraftSaveNotice error={draft.warning} /><DraftResume title={data.title} savedAt={draft.savedAt}
    results={quiz.results} position={{label:"Карточка",current:i+1,total:cards.length}} detail={cardTitle(card,slug)}
    onResume={() => { revealCard.current = card.id; draft.resume(); }} onRestart={draft.restart} /></ShellA>;
  const CardContent = CARDS[card.kind];
  return <ShellA bare><div className="lesson-page" data-editorial={editorial ? true : undefined}>
    <header className="lesson-topbar"><Logo /><Button asChild variant="ghost" className="lesson-close">
      <Link to={returnTo} aria-label="Закрыть урок" data-testid="lesson-close-btn"><X aria-hidden="true" /><span>Закрыть урок</span></Link>
    </Button></header>
    <div className="lesson-heading">
      <div><h1>{data.title}</h1><p>{data.grade} класс <span aria-hidden="true">·</span> {data.chapter}</p></div>
      <div className="lesson-position"><BookOpen aria-hidden="true" /><span data-testid="lesson-card-counter">{i+1}/{cards.length}</span></div>
    </div>
    <Progress className="lesson-progress" value={(i+1)/cards.length*100} aria-label="Позиция в уроке"
      aria-valuetext={`Карточка ${i+1} из ${cards.length}`} data-testid="lesson-progress" />
    <DraftSaveNotice error={draft.error ?? draft.warning} />
    <div className="lesson-layout">
      <aside className="lesson-sidebar"><h2>Содержание</h2><LessonContents cards={cards} current={i} quizDone={quizDone} onSelect={goTo} slug={slug} /></aside>
      <div className="lesson-main">
        <Collapsible open={contentsOpen} onOpenChange={setContentsOpen} className="lesson-mobile-contents">
          <CollapsibleTrigger asChild><Button variant="ghost"><List aria-hidden="true" /><span className="lesson-contents-trigger-label">Содержание урока<span>{cardTitle(card,slug)}</span></span><ChevronDown aria-hidden="true" /></Button></CollapsibleTrigger>
          <CollapsibleContent><LessonContents cards={cards} current={i} quizDone={quizDone} onSelect={goTo} slug={slug} /></CollapsibleContent>
        </Collapsible>
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.article ref={focusArticle} key={card.id} tabIndex={-1} aria-labelledby="lesson-step-title" className="lesson-stage"
            custom={dir} variants={reduceMotion ? undefined : V} initial={reduceMotion ? false : "enter"} animate="center" exit={reduceMotion ? undefined : "exit"}
            transition={{duration:0.18,ease:[0.16,1,0.3,1]}} drag={reduceMotion ? false : "x"} dragControls={controls} dragListener={false}
            dragConstraints={{left:0,right:0}} dragElastic={0.12}
            onDragEnd={(e,info) => { if(info.offset.x < -90) go(1); else if(info.offset.x > 90) go(-1); }}
            onPointerDown={e => { if(!e.target.closest("input,textarea,button,a,[role='button'],[role='slider'],[data-nodrag]")) controls.start(e); }}
            data-card-id={card.id} data-testid={`lesson-card-${card.id}`}>
            <Card className="lesson-card" data-kind={card.kind} data-composition={card.kind === "intro" ? editorial?.composition : undefined}>
              <CardContent block={card} lesson={data} ctx={{guess,setGuess,quiz,setQuiz,go,answerDrafts:draft.value.answers,setAnswerDraft,
                isCurrentProfile:draft.isCurrentProfile,index:i,total:cards.length}} />
            </Card>
          </motion.article>
        </AnimatePresence>
        {card.kind !== "finish" && <footer className={`lesson-controls ${card.kind === "check" ? "lesson-check-controls" : ""}`}>
          <Button type="button" variant="ghost" className="lesson-back" onClick={() => go(-1)} disabled={i === 0} data-testid="lesson-prev-btn" aria-label="Назад"><ArrowLeft aria-hidden="true" /><span>Назад</span></Button>
          {card.kind !== "check" && <Button type="button" className="study-next lesson-next" onClick={() => go(1)} disabled={!canNext} data-testid="lesson-next-btn">
            <span className="lesson-next-label"><span>{nextCard?.kind === "check" ? "К проверке" : "Дальше"}</span>
              {nextCard?.kind !== "check" && <span className="lesson-next-title">{nextTitle}</span>}
            </span><ArrowRight aria-hidden="true" />
          </Button>}
        </footer>}
      </div>
    </div>
  </div></ShellA>;
}
