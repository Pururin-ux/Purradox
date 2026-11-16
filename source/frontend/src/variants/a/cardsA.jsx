import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ChevronDown, CircleAlert, Lightbulb, Target, Zap } from "lucide-react";
import { Equation, Rich } from "@/components/shared/Tex";
import { MotionModel } from "@/components/shared/MotionModel";
import { VtGraph } from "@/components/shared/VtGraph";
import { Vectors } from "@/components/shared/Vectors";
import { checkLesson } from "@/lib/hooks";
import { TypoFlag } from "@/components/shared/TypoFlag";
import { completeLesson, recordQuizAnswer, trackUnique } from "@/lib/game";
import { useSfx, haptic } from "@/lib/sound";
import { StudyLab } from "./StudyLab";
import { AnswerA } from "./AnswerA";
import { LessonArtwork } from "./LessonArt";
import { LessonFigure } from "./LessonFigures";
import { lessonEditorial } from "@/lib/lessonEditorial";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const Title = ({children}) => <h2 id="lesson-step-title" className="lesson-step-title">{children}</h2>;
const Para = ({text, glossary, lead}) => <p className={lead ? "lesson-paragraph lesson-lead" : "lesson-paragraph"}><Rich text={text} glossary={glossary} /></p>;
const Why = ({text}) => text ? <aside className="lesson-why"><Lightbulb aria-hidden="true" /><p><Rich text={text} /></p></aside> : null;

const HOOK_FALLBACK = { src: "/art/learning-graphic-20261106/platform.webp", alt: "Электричка у платформы перед разгоном." };
function HookCard({block,ctx}) {
  // Урок может задать свою заставку: block.art — имя файла в /art/lesson-hooks/.
  // Пока файла нет, показывается общая сцена с электричкой.
  const art = block.art ? { src: "/art/lesson-hooks/" + block.art, alt: block.title } : HOOK_FALLBACK;
  return <>
    <Title>{block.title}</Title>
    <figure className="lesson-opening-scene" data-testid="lesson-platform-art">
      <img src={art.src} width="1672" height="941" alt={art.alt} draggable="false" />
    </figure>
    {block.paragraphs.map(p => <Para key={p} text={p} />)}
    <Alert className="lesson-estimate">
      <AlertTitle className="lesson-question">{block.question}</AlertTitle>
      <AlertDescription>
        <label className="lesson-estimate-label" htmlFor="lesson-estimate">Как думаешь?</label>
        <div className="lesson-estimate-field">
          <Input id="lesson-estimate" className="a-input" inputMode="decimal" placeholder="Примерно…"
            aria-label={`Твоя догадка, ${block.unit}`} value={ctx.guess}
            onChange={e => ctx.setGuess(e.target.value.replace(/[^\d,.]/g,"").slice(0,6))} data-testid="lesson-guess-input" />
          <span>{block.unit}</span>
        </div>
        <p className="lesson-caption">Позже сравним с расчётом.</p>
      </AlertDescription>
    </Alert>
  </>;
}

const meniscus = {
  src: "/art/lesson-hooks/cilindr-menisk-v1.webp",
  compact: "/art/lesson-hooks/cilindr-menisk-v1-768.webp",
  width: 1536,
  height: 1024,
  alt: "Крупный план воды в мерном цилиндре. Её поверхность выше у стенок и ниже посередине.",
};

function ScaleDiagram() {
  // The painted water surface reaches its lowest point at y = 571/1024.
  const reading = 16;
  const readingY = 100 * 571 / meniscus.height;
  const position = volume => readingY - (volume - reading) * 3.65;
  return <figure className="lesson-scale lesson-meniscus">
    <div className="lesson-meniscus-photo" style={{ "--meniscus-reading": `${readingY}%` }}>
      <LessonArtwork art={meniscus} sizes="(max-width: 740px) calc(100vw - 60px), 460px" />
      <div className="lesson-meniscus-scale" aria-hidden="true">
        {[10, 12, 14, 16, 18, 20, 22, 24].map(volume => <span key={volume} className="lesson-meniscus-tick"
          data-major={volume % 10 === 0 || undefined} data-reading={volume === reading || undefined}
          style={{ top: `${position(volume)}%` }}>
          {(volume % 10 === 0 || volume === reading) && <b>{volume}{volume === reading ? " мл" : ""}</b>}
        </span>)}
        <i className="lesson-meniscus-guide" />
      </div>
    </div>
    <figcaption><strong>На шкале 16 мл.</strong> Между 10 и 20 мл пять промежутков по 2 мл. Смотри на нижнюю точку мениска на уровне глаз.</figcaption>
  </figure>;
}

function TextCard({block,lesson}) {
  const editorial = lessonEditorial[lesson.slug];
  const art = editorial?.cardArt?.[block.id];
  const selected = editorial?.cardFigures?.[block.id] ?? block.figure;
  const figures = selected ? [selected].flat() : [];
  const lead = editorial?.cardLeads?.[block.id];
  return <>
    <Title>{block.title}</Title>
    {figures.filter(figure => figure.beforeText).map(figure => <LessonFigure key={figure.kind} figure={figure} />)}
    {block.paragraphs.map((p,index) => <Fragment key={p}>
      <Para text={index === 0 && lead ? lead : p} glossary={block.glossary} lead={index === 0} />
      {index === 0 && block.scale && <ScaleDiagram />}
      {figures.filter(figure => !figure.beforeText && index === (figure.afterParagraph ?? 0))
        .map(figure => <LessonFigure key={figure.kind} figure={figure} />)}
      {art && index === art.afterParagraph && <figure className="lesson-scene">
        <LessonArtwork art={art} sizes="(max-width: 740px) calc(100vw - 76px), 660px" />
      </figure>}
    </Fragment>)}
    {block.comparison && <dl className="lesson-comparison">{block.comparison.map(item => <div key={item.label}>
      <dt>{item.label}</dt><dd><Rich text={item.detail} glossary={block.glossary} /></dd>
    </div>)}</dl>}
    {block.formula && <div className="lesson-equation"><span className="lesson-equation-label">Формула</span><Equation tex={block.formula} className="math-centered" /></div>}
    {block.after?.map(p => <Para key={p} text={p} />)}
    {block.vectors && <figure className="lesson-diagram"><Vectors theme="study" /></figure>}
    {block.graph && <figure className="lesson-diagram lesson-graph">
      <VtGraph graph={block.graph} theme="study" />
      <figcaption>Перемещение за 4 с: (2 + 10) / 2 · 4 = 24 м.</figcaption>
    </figure>}
    {block.note && <Alert className="lesson-observation"><Lightbulb aria-hidden="true" /><AlertDescription><Rich text={block.note} glossary={block.glossary} /></AlertDescription></Alert>}
    <Why text={block.why} />
  </>;
}

function ModelCard({block,lesson}) {
  const play = useSfx();
  const lead = lessonEditorial[lesson.slug]?.modelLead;
  return <>
    <Title>{block.title}</Title>
    {(lead ? [lead] : block.paragraphs).map(p => <Para key={p} text={p} />)}
    <MotionModel theme="study" onTap={() => play("tap")} onExperiment={() => trackUnique("model",lesson.slug)} />
  </>;
}

function FormulaTile({f,i,onOpen}) {
  const [open,setOpen] = useState(false);
  return <Collapsible open={open} onOpenChange={value => {setOpen(value); if(value) onOpen(i);}}
    className="lesson-formula" data-testid={`formula-tile-${i}`}>
    <CollapsibleTrigger asChild><Button variant="ghost" className="lesson-formula-trigger">
      <span>{f.label}</span><ChevronDown aria-hidden="true" />
    </Button></CollapsibleTrigger>
    <div className="lesson-formula-tex"><Equation tex={f.tex} label={f.label} /></div>
    <CollapsibleContent className="lesson-formula-detail"><p><Rich text={f.when} /></p></CollapsibleContent>
  </Collapsible>;
}

function FormulasCard({block,lesson}) {
  const [seen,setSeen] = useState([]);
  const play = useSfx();
  const open = i => {
    play("pop");
    setSeen(s => s.includes(i) ? s : [...s,i]);
    trackUnique("formula",JSON.stringify([lesson.slug,block.id,block.items[i].tex]));
  };
  return <>
    <Title>{block.title}</Title>
    {block.intro && <Para text={block.intro} lead />}
    <div className="lesson-formula-list">{block.items.map((f,i) => <FormulaTile key={f.tex} f={f} i={i} onOpen={open} />)}</div>
    <p className="lesson-caption" data-testid="formulas-seen-count">Пояснения: {seen.length} из {block.items.length}</p>
  </>;
}

function GuessVerdict({guess,value}) {
  const g = parseFloat(String(guess).replace(",",".")); 
  let text = `Получилось ${value} м. Длина пути зависит от того, как менялась скорость.`;
  if (!Number.isNaN(g)) {
    if (Math.abs(g-value) <= value*0.1) text = `Ты предположил ${guess} м. По расчёту — ${value} м.`;
    else if (g === 50) text = "Ты предположил 50 м. Так вышло бы при постоянной скорости 5 м/с. Электричка разгонялась с нуля, и средняя скорость была вдвое меньше.";
    else text = `Ты предположил ${guess} м, по расчёту получилось ${value} м. Сравни начальную и конечную скорости.`;
  }
  return <p className="lesson-guess-verdict" data-testid="lesson-guess-verdict">{text}</p>;
}

function ExampleCard({block,lesson,ctx}) {
  const [shown,setShown] = useState(1);
  const play = useSfx();
  const all = shown >= block.steps.length;
  const figure = lessonEditorial[lesson.slug]?.exampleFigures?.[block.id] ?? block.figure;
  const figureStep = figure?.afterStep;
  return <>
    <Title>{block.title}</Title>
    {block.intro && <Para text={block.intro} lead />}
    {!figureStep && <LessonFigure figure={figure} />}
    <div className="lesson-example">
      <aside className="lesson-given" aria-label="Условие задачи">
        <h3>Дано</h3>
        {block.given.map(g => <div key={g}><Equation tex={g} label="Величина из условия" /></div>)}
        <div className="lesson-find"><Equation tex={block.find} label="Искомая величина" /></div>
      </aside>
      <div className="lesson-example-work">
        <ol className="lesson-steps">
          {block.steps.slice(0,shown).map((st,index) => <li key={index}>
            <span className="lesson-step-number" aria-hidden="true">{index+1}</span>
            <div>
              <p><Rich text={st.text} /></p>
              {st.tex && <div className="lesson-step-equation"><Equation tex={st.tex} label={`Формула в шаге ${index + 1}`} /></div>}
              {figureStep === index + 1 && <LessonFigure figure={figure} />}
            </div>
          </li>)}
        </ol>
        {!all ? <Button variant="secondary" className="lesson-step-button"
          onClick={() => {play("tap");setShown(s => s+1);}} data-testid={`${block.id}-next-step-btn`}>
          Следующий шаг <ArrowRight aria-hidden="true" />
        </Button> : <Alert className="lesson-example-answer" data-testid={`${block.id}-answer`}><Check aria-hidden="true" /><AlertDescription>{block.answer}</AlertDescription></Alert>}
        {all && block.answer_value && <GuessVerdict guess={ctx.guess} value={block.answer_value} />}
      </div>
    </div>
  </>;
}

function CheckCard({lesson,ctx}) {
  const {quiz,setQuiz} = ctx;
  const total = lesson.quiz.length;
  const q = lesson.quiz[quiz.idx];
  const res = quiz.results[q.id];
  const revision = lesson._assessment?.revision;
  const check = useMemo(() => checkLesson(lesson.slug, revision),[lesson.slug, revision]);
  const onResult = r => {
    if (!ctx.isCurrentProfile()) return;
    setQuiz(s => ({...s,results:{...s.results,[q.id]:r}}));
    recordQuizAnswer(q.id, r, revision);
  };
  const next = () => quiz.idx < total-1 ? setQuiz(s => ({...s,idx:s.idx+1})) : ctx.go(1);
  return <>
    <div className="lesson-check-heading"><Title>Проверь себя</Title>
      <span className="lesson-check-counter">{quiz.idx+1}/{total}</span><TypoFlag id={`quiz:${q.id}`} text={q.text} />
    </div>
    <ol className="lesson-quiz-progress" data-testid="lesson-quiz-progress" aria-label="Результаты вопросов">
      {lesson.quiz.map((x,index) => { const result = quiz.results[x.id]; return <li key={x.id}
        data-outcome={result ? result.correct ? "right" : "wrong" : undefined}
        aria-current={index === quiz.idx ? "step" : undefined}>
        <Button variant="ghost" className="lesson-quiz-step" disabled={!result && index !== quiz.idx}
          aria-label={`Вопрос ${index+1}: ${result ? result.correct ? "верно" : "ошибка" : "без ответа"}`}
          onClick={() => setQuiz(s => ({...s,idx:index}))} data-testid={`lesson-quiz-review-${x.id}`}>
          {result ? result.correct ? <Check aria-hidden="true" /> : <CircleAlert aria-hidden="true" /> : <span aria-hidden="true">{index+1}</span>}
        </Button>
      </li>;})}
    </ol>
    <p className="lesson-question" data-testid="lesson-quiz-question">{quiz.idx+1}. <Rich text={q.text} /></p>
    {!res && <div className="study-trainer lesson-answer">
      <AnswerA key={q.id} item={q} check={check} onResult={onResult} tid={`lesson-${q.id}`}
        draft={ctx.answerDrafts[q.id]} onDraftChange={value => ctx.setAnswerDraft(q.id,value)} />
    </div>}
    {res && <Alert className="lesson-check-result" data-outcome={res.correct ? "right" : "wrong"} data-testid="lesson-quiz-verdict" role="status">
      {res.correct ? <Check aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
      <AlertTitle>{res.correct ? "Верно" : "Есть ошибка"}</AlertTitle>
      <AlertDescription><Rich text={res.explanation} /></AlertDescription>
      <Button className="study-next" onClick={next} data-testid="lesson-quiz-next-btn">
        {quiz.idx < total-1 ? "Следующий вопрос" : "Завершить урок"}<ArrowRight aria-hidden="true" />
      </Button>
    </Alert>}
  </>;
}

function FinishCard({lesson,ctx}) {
  const [fresh,setFresh] = useState(undefined);
  const ran = useRef(false);
  const play = useSfx();
  const save = () => {
    if (!ctx.isCurrentProfile()) return;
    const result = completeLesson(lesson.joules, lesson.slug);
    setFresh(result);
    if (result === true) { play("win"); haptic([20,40,60]); }
  };
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    save();
    // A completion is charged once by the game store. Retry is explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  const correct = Object.values(ctx.quiz.results).filter(r => r.correct).length;
  const total = lesson.quiz.length;
  const editorial = lessonEditorial[lesson.slug];
  return <div className="lesson-finish" data-section={lesson.section}>
    <div className="lesson-finish-head">
      <Title>Урок пройден</Title>
      <p className="lesson-finish-score">Верных ответов {correct} из {total}</p>
      <div className="lesson-earned" data-testid="lesson-joules-reward" role="status"><Zap aria-hidden="true" />
        {fresh === undefined ? "Сохраняем результат…" : fresh === null ? "Не удалось сохранить результат" : fresh === false ? "Джоули уже начислены" : `+${lesson.joules} Дж`}
      </div>
      {editorial?.art && <LessonArtwork art={editorial.art} className="lesson-finish-art" sizes="(max-width: 740px) 98px, 230px" decorative />}
    </div>
    {lesson.summary?.length > 0 && <section className="lesson-finish-recap" aria-labelledby="lesson-recap-title">
      <h3 id="lesson-recap-title">Что пригодится в задачах</h3>
      <ul className="lesson-summary">{lesson.summary.map((text,index)=><li key={index}><span><Rich text={text} /></span></li>)}</ul>
    </section>}
    <div className="lesson-finish-actions">
      {fresh === null && <Button type="button" variant="secondary" onClick={save}>Сохранить ещё раз</Button>}
      <Button asChild className="study-next"><Link to={'/trainer/' + lesson.slug} data-testid="lesson-to-trainer-btn"><Target aria-hidden="true" />К задачам <ArrowRight aria-hidden="true" /></Link></Button>
      <Button variant="ghost" className="lesson-back" onClick={() => ctx.go(-1)} data-testid="lesson-back-to-questions">К вопросам</Button>
    </div>
  </div>;
}

function IntroCard({lesson}) {
  const editorial = lessonEditorial[lesson.slug];
  const art = editorial?.art;
  const artSizes = editorial?.composition === "window"
    ? "(max-width: 740px) calc(100vw - 36px), (max-width: 1020px) 64vw, 870px"
    : "(max-width: 740px) calc(100vw - 64px), (max-width: 1020px) 60vw, 680px";
  return <div className="lesson-intro" data-composition={editorial?.composition}>
    <div className="lesson-intro-copy">
      <Title>{editorial?.title ?? lesson.blocks[0]?.title ?? "Что разберём"}</Title>
      <p className="lesson-lead"><Rich text={editorial?.lead ?? lesson.description} /></p>
      {lesson.minutes > 0 && <p className="lesson-intro-time">{lesson.minutes} мин</p>}
      {!art && !editorial?.figure && lesson.coverage?.length > 0 && <ul className="lesson-roadmap" aria-label="Темы урока">
        {lesson.coverage.map(item => <li key={item}>{item}</li>)}
      </ul>}
    </div>
    {art && <figure className="lesson-intro-art" data-crop={editorial.crop}><LessonArtwork art={art} sizes={artSizes} /></figure>}
    {editorial?.figure && <LessonFigure figure={editorial.figure} />}
  </div>;
}

export const CARDS = {intro:IntroCard,hook:HookCard,text:TextCard,model:ModelCard,lab:StudyLab,formulas:FormulasCard,example:ExampleCard,check:CheckCard,finish:FinishCard};
