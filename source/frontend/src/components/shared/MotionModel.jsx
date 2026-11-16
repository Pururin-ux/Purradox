import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Pause, Play, RotateCcw } from "lucide-react";
import { fmt } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider as UISlider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MotionStudyView } from "./MotionStudyView";

export const T = 10;
export const PRESETS = [
  { id: "train", label: "Электричка", v0: 0, a: 0.5 },
  { id: "scooter", label: "Самокат", v0: 2, a: 1 },
  { id: "ice", label: "Тормоз на льду", v0: 15, a: -1.5 },
  { id: "asphalt", label: "Тормоз на асфальте", v0: 15, a: -6 },
];

export const TH = {
  study: { track:"#ceb8c1", mark:"#946e41", body:"#913d59", line:"#913d59", area:"#ead2da", grid:"#e4d6d8", axis:"#947780", label:"#765d67", font:"\'Onest\', sans-serif", fs:18 },
  a: { track: "rgba(255,255,255,.18)", mark: "#FFB830", body: "#00E5FF", line: "#00E5FF", area: "rgba(255,184,48,.24)", grid: "rgba(255,255,255,.06)", axis: "rgba(241,245,249,.45)", label: "#94A3B8", font: "'JetBrains Mono', monospace", fs: 12 },
  b: { track: "#1F2421", mark: "#00A8CC", body: "#1F2421", line: "#1F2421", area: "url(#mm-hatch)", grid: "#E3E0D8", axis: "#1F2421", label: "#5C6560", font: "'Caveat', cursive", fs: 18 },
};

export function kin(v0, a) {
  const tStop = a < 0 ? Math.min(T, v0 / -a) : T;
  const xAt = (t) => {
    const s = Math.min(t, tStop);
    return v0 * s + (a * s * s) / 2;
  };
  const vAt = (t) => (a < 0 ? Math.max(0, v0 + a * t) : v0 + a * t);
  return { tStop, xAt, vAt };
}

const niceMax = (m) => {
  const step = m <= 8 ? 2 : m <= 20 ? 5 : 10;
  return { max: Math.ceil(m / step) * step || step, step };
};

export function useClock(deps, { loop = true, resetOnChange = true, autoPlay = true, drawFrame, rate = 1 } = {}) {
  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [t, setT] = useState(autoPlay && reduce ? T : 0);
  const [playing, setPlayingState] = useState(autoPlay && !reduce);
  const start = useRef(0);
  const tRef = useRef(t);
  const published = useRef(t);
  const playingRef = useRef(playing);
  const showTime = useCallback((instant, animated = false) => {
    tRef.current = instant;
    drawFrame?.current?.(instant);
    // Keep the plot on the frame clock and the readouts on the slider's tenth-second scale.
    const next = drawFrame && animated ? Math.floor(instant * 10) / 10 : instant;
    if (next !== published.current) {
      published.current = next;
      setT(next);
    }
  }, [drawFrame]);

  const setPlaying = useCallback(change => {
    const next = typeof change === "function" ? change(playingRef.current) : change;
    if (next && !loop && tRef.current >= T) showTime(0);
    if (!next && playingRef.current && drawFrame) showTime(Math.round(tRef.current * 10) / 10);
    playingRef.current = next;
    setPlayingState(next);
  }, [drawFrame, loop, showTime]);

  const seek = useCallback(value => {
    if (!Number.isFinite(value)) return;
    playingRef.current = false;
    setPlayingState(false);
    showTime(Math.max(0, Math.min(T, value)));
  }, [showTime]);

  useEffect(() => {
    if (!resetOnChange) return;
    start.current = performance.now();
    showTime(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!playing) return undefined;
    start.current = performance.now() - tRef.current * 1000 / rate;
    let raf;
    const repeat = loop;
    const tick = (now) => {
      if (!playingRef.current) return;
      let s = Math.max(0, (now - start.current) * rate / 1000);
      if (!repeat && s >= T) {
        showTime(T);
        playingRef.current = false;
        setPlayingState(false);
        return;
      }
      if (repeat && s > T + 1.4) {
        start.current = now;
        s = 0;
      }
      showTime(Math.min(s, T), true);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, loop, rate, showTime]);

  const restart = () => {
    start.current = performance.now();
    showTime(0);
    setPlaying(true);
  };
  return { t, timeRef:tRef, playing, setPlaying, restart, seek };
}

function Track({ th, theme, xAt, t, scale, tStop }) {
  const X = (x) => 40 + x * scale;
  const marks = [];
  for (let k = 0; k <= Math.floor(Math.min(t, tStop)); k += 1) marks.push(k);
  const bx = X(xAt(t));
  return (
    <g>
      <line x1="40" y1="70" x2="600" y2="70" stroke={th.track} strokeWidth={theme === "b" ? 1.6 : 2} strokeDasharray={theme === "a" ? "2 6" : "0"} />
      {marks.map((k) => (
        <g key={k} transform={`translate(${X(xAt(k))},70)`}>
          {theme !== "b" ? <circle r="4" fill={th.mark} /> : <path d="M-5 -5 L5 5 M5 -5 L-5 5" stroke={th.mark} strokeWidth="2.2" strokeLinecap="round" />}
          {(theme !== "study" || k % 5 === 0) && <text y={theme === "study" ? 40 : 24} textAnchor="middle" fill={th.label} fontFamily={th.font} fontSize={th.fs}>{k}</text>}
        </g>
      ))}
      <g transform={`translate(${bx},70)`}>
        {theme !== "b" ? (
          <>
            <rect x="-44" y="-22" width="48" height="20" rx="8" fill={th.body} opacity="0.18" />
            <rect x="-40" y="-19" width="40" height="14" rx="6" fill={th.body} />
            <rect x="-34" y="-16" width="8" height="5" rx="1.5" fill="#05202a" />
            <rect x="-22" y="-16" width="8" height="5" rx="1.5" fill="#05202a" />
            <circle cx="-2" cy="-10" r="2.4" fill="#FFF3C4" />
          </>
        ) : (
          <g fill="#FFFEFA" stroke={th.body} strokeWidth="1.6" strokeLinejoin="round">
            <path d="M-46 -6 L-46 -26 L-6 -26 Q2 -26 4 -16 L6 -6 Z" />
            <path d="M-40 -21 h8 v6 h-8 z M-28 -21 h8 v6 h-8 z M-16 -21 h8 v6 h-8 z" fill="#00A8CC" fillOpacity=".25" />
            <circle cx="-36" cy="-3" r="3" />
            <circle cx="-8" cy="-3" r="3" />
          </g>
        )}
      </g>
    </g>
  );
}

export function Graph({ th, kinematics, t, v0 }) {
  const study = th === TH.study;
  const { tStop, vAt } = kinematics;
  const peak = Math.max(v0, vAt(T), 4);
  const { max, step } = niceMax(peak);
  const X = (s) => 70 + (s / T) * 505;
  const Y = (v) => 340 - (v / max) * 190;
  const knots = [0, Math.min(tStop, T), T];
  const line = knots.map((s, i) => `${i ? "L" : "M"}${X(s)},${Y(vAt(s))}`).join(" ");
  const upTo = [0, Math.min(tStop, t), t].filter((s, i, arr) => i === 0 || s > arr[i - 1]);
  const area = `M${X(0)},${Y(0)} ${upTo.map((s) => `L${X(s)},${Y(vAt(s))}`).join(" ")} L${X(t)},${Y(0)} Z`;
  const vTicks = [];
  for (let v = 0; v <= max; v += step) vTicks.push(v);
  return (
    <g>
      {Array.from({ length: T + 1 }, (_, k) => (
        <g key={k}>
          <line x1={X(k)} y1={Y(0)} x2={X(k)} y2={Y(max)} stroke={th.grid} />
          <text x={X(k)} y={Y(0) + (study ? 12 : 18)} dominantBaseline={study ? "hanging" : undefined} textAnchor="middle" fill={th.label} fontFamily={th.font} fontSize={th.fs}>{k}</text>
        </g>
      ))}
      {vTicks.map((v) => (
        <g key={v}>
          <line x1={X(0)} y1={Y(v)} x2={X(T)} y2={Y(v)} stroke={th.grid} />
          <text x={X(0) - 10} y={Y(v) + (study ? 0 : 4)} dominantBaseline={study ? "middle" : undefined} textAnchor="end" fill={th.label} fontFamily={th.font} fontSize={th.fs}>{v}</text>
        </g>
      ))}
      <path d={area} fill={th.area} />
      <path d={line} fill="none" stroke={th.line} strokeWidth="2.6" strokeLinejoin="round" />
      <line x1={X(0)} y1={Y(0)} x2={X(T) + 14} y2={Y(0)} stroke={th.axis} strokeWidth="1.4" />
      <line x1={X(0)} y1={Y(0)} x2={X(0)} y2={Y(max) - 14} stroke={th.axis} strokeWidth="1.4" />
      <text className="mm-axis-time" x={X(T) + 16} y={Y(0) + 4} fill={th.label} fontFamily={th.font} fontSize={th.fs}>t, с</text>
      <text x={X(0) + 8} y={Y(max) - 8} fill={th.label} fontFamily={th.font} fontSize={th.fs}>υ, м/с</text>
      <circle cx={X(t)} cy={Y(vAt(t))} r="5" fill={th.mark} />
    </g>
  );
}

export function Slider({ id, label, value, min, max, step, unit, onChange, onCommit, theme }) {
  return (
    <label className="mm-slider block" data-nodrag>
      <span className="mm-label flex items-baseline justify-between gap-3">
        <span>{label}</span>
        <span className="mm-value">{fmt(value, 1)} {unit}</span>
      </span>
      {theme === "study" ? <UISlider className="mm-kit-slider" min={min} max={max} step={step} value={[value]}
        onValueChange={values => onChange(values[0])} onValueCommit={onCommit}
        thumbProps={{"aria-label":label,"aria-valuetext":`${fmt(value,1)} ${unit}`,"data-testid":id}} /> : <input
        type="range"
        className="mm-range w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        data-testid={id}
      />}
    </label>
  );
}

export function MotionModel({ theme = "a", onTap, onExperiment }) {
  const [v0, setV0] = useState(0);
  const [a, setA] = useState(0.5);
  const [preset, setPreset] = useState("train");
  const [view, setView] = useState("speed");
  const drawFrame = useRef(null);
  const k = useMemo(() => kin(v0, a), [v0, a]);
  const study = theme === "study";
  const { t, timeRef, playing, setPlaying, restart, seek } = useClock([v0, a], study
    ? { loop:false, resetOnChange:false, autoPlay:false, drawFrame } : undefined);
  const th = TH[theme];
  const scale = 520 / Math.max(k.xAt(T), 10);

  const applyPreset = (p) => {
    if (p.v0 !== v0 || p.a !== a) onExperiment?.();
    setPreset(p.id);
    setV0(p.v0);
    setA(p.a);
    if (study) seek(0);
    onTap?.();
  };

  const presets = <div className="mm-presets flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Button key={p.id} type="button" aria-pressed={preset === p.id} onClick={() => applyPreset(p)} className={`mm-chip ${preset === p.id ? "is-active" : ""}`} data-testid={`sim-preset-${p.id}`}>
            {p.label}
          </Button>
        ))}
      </div>;
  const parameters = <div className="mm-parameters mt-4 grid gap-4 sm:grid-cols-2">
    <Slider theme={theme} id="sim-slider-v0" label="Начальная скорость υ₀" value={v0} min={0} max={20} step={1} unit="м/с"
      onChange={value => { if (!study && value !== v0) onExperiment?.(); setV0(value); setPreset(""); }} onCommit={onExperiment} />
    <Slider theme={theme} id="sim-slider-acceleration" label="Ускорение a" value={a} min={-6} max={3} step={0.5} unit="м/с²"
      onChange={value => { if (!study && value !== a) onExperiment?.(); setA(value); setPreset(""); }} onCommit={onExperiment} />
  </div>;
  const brakingNote = a < 0 && <p className="mm-note mt-3" data-testid="sim-note">
    {v0 === 0 ? "Тело стоит. Для торможения задай начальную скорость." : `Остановка через ${fmt(v0 / -a, 1)} с.`}
  </p>;

  if (study) {
    const playLabel = playing ? "Пауза" : t >= T ? "Ещё раз" : "Пуск";
    return <div className="mm-wrap mm-study" data-theme={theme} data-nodrag data-testid="motion-model">
      <ToggleGroup type="single" value={view} onValueChange={value => { if (value) setView(value); }}
        aria-label="Что показать" className="mm-views">
        <ToggleGroupItem value="speed">Скорость</ToggleGroupItem>
        <ToggleGroupItem value="position">Положение</ToggleGroupItem>
      </ToggleGroup>
      <MotionStudyView kinematics={k} duration={T} view={view} timeRef={timeRef} drawFrame={drawFrame} />
      <div className="mm-time-controls">
        <Button type="button" className="mm-btn mm-study-play" onClick={() => setPlaying(p => !p)}
          data-testid="sim-play-pause-btn">
          {playing ? <Pause aria-hidden="true" /> : t >= T ? <RotateCcw aria-hidden="true" /> : <Play aria-hidden="true" />}
          <span>{playLabel}</span>
        </Button>
        <Slider theme="study" id="sim-slider-time" label="Время" value={t} min={0} max={T} step={0.1} unit="с" onChange={seek} />
        <Button type="button" variant="ghost" className="mm-btn mm-study-reset" onClick={() => seek(0)}
          data-testid="sim-restart-btn" aria-label="К началу"><RotateCcw aria-hidden="true" /></Button>
      </div>
      <dl className="mm-measurements" data-testid="sim-readouts">
        <div><dt>Скорость</dt><dd>{fmt(k.vAt(t), 1)} м/с</dd></div>
        <div><dt>Путь</dt><dd>{fmt(k.xAt(t), 1)} м</dd></div>
      </dl>
      {brakingNote}
      <Collapsible className="mm-settings">
        <CollapsibleTrigger asChild><Button type="button" variant="ghost" className="mm-settings-toggle" data-testid="sim-settings">
          <span>Настройки</span><b>{PRESETS.find(item => item.id === preset)?.label ?? "Свои параметры"}</b>
          <ChevronDown aria-hidden="true" />
        </Button></CollapsibleTrigger>
        <CollapsibleContent className="mm-settings-content">
          {presets}
          {parameters}
        </CollapsibleContent>
      </Collapsible>
    </div>;
  }

  return (
    <div className="mm-wrap" data-theme={theme} data-nodrag data-testid="motion-model">
      {presets}
      <svg viewBox="0 0 640 372" className="mm-svg mt-3 w-full" role="img" aria-label="Модель равноускоренного движения">
        {theme === "b" && (
          <defs>
            <pattern id="mm-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="7" stroke="#00A8CC" strokeWidth="2.2" strokeOpacity=".55" />
            </pattern>
          </defs>
        )}
        <Track th={th} theme={theme} xAt={k.xAt} t={t} scale={scale} tStop={k.tStop} />
        <Graph th={th} kinematics={k} t={t} v0={v0} />
      </svg>
      <div className="mm-readouts mt-2 grid grid-cols-3 gap-2" data-testid="sim-readouts">
        <div className="mm-read"><span>t</span><b>{fmt(t, 1)} с</b></div>
        <div className="mm-read"><span>υ</span><b>{fmt(k.vAt(t), 1)} м/с</b></div>
        <div className="mm-read"><span>Δr</span><b>{fmt(k.xAt(t), 1)} м</b></div>
      </div>
      {parameters}
      <div className="mt-4 flex gap-2">
        <Button type="button" className="mm-btn" onClick={() => setPlaying((p) => !p)} data-testid="sim-play-pause-btn" aria-label={playing ? "Пауза" : "Пуск"}>
          {playing ? <Pause size={18} /> : <Play size={18} />}
          <span>{playing ? "Пауза" : "Пуск"}</span>
        </Button>
        <Button type="button" className="mm-btn" onClick={restart} data-testid="sim-restart-btn" aria-label="Сначала">
          <RotateCcw size={18} />
          <span>Сначала</span>
        </Button>
      </div>
      {a < 0 && <p className="mm-note mt-3" data-testid="sim-note">{v0 === 0 ? "Для торможения нужна начальная скорость. Сейчас тело стоит." : "Здесь показано торможение до остановки. После неё скорость и ускорение равны нулю."}</p>}
    </div>
  );
}
