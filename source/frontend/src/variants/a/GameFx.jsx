import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Package, ScrollText, Zap } from "lucide-react";
import { LEVEL_BONUS, levelTitle, onFx } from "@/lib/game";
import { ART_BY_ID, RARITY, artImg } from "@/lib/artifacts";
import { useSfx } from "@/lib/sound";
import { Char } from "./Chars";

export const burst = (colors = ["#FFB830", "#00E5FF", "#B06CFF", "#FF2A6D", "#ffffff"], y = 0.55) =>
  confetti({ particleCount: 140, spread: 95, startVelocity: 42, origin: { y }, colors, zIndex: 140, disableForReducedMotion: true });

function Toast({ t }) {
  const icon = t.type === "quest" ? <ScrollText size={16} /> : t.type === "capsule" ? <Package size={16} /> : <Zap size={16} />;
  return (
    <motion.div layout className={`fx-toast is-${t.type}`} initial={{ opacity: 0, y: -16, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} data-testid={`fx-toast-${t.type}`}>
      <span className="ic">{icon}</span>
      {t.type === "reward" && (
        <span className="flex flex-col">
          <b className="fm">{t.joules ? `+${t.joules} Дж` : ""}{t.joules && t.xp ? " · " : ""}{t.xp ? `+${t.xp} XP` : ""}</b>
          {t.label && <span className="text-[11px] opacity-70">{t.label}</span>}
        </span>
      )}
      {t.type === "quest" && <span className="flex flex-col"><b>Квест выполнен</b><span className="text-[11px] opacity-70">Забери награду в квестах</span></span>}
      {t.type === "capsule" && <b>{t.text}</b>}
    </motion.div>
  );
}

function LevelUp({ e, onClose }) {
  return (
    <div className="ov-card" data-testid="levelup-overlay">
      <div className="ov-rays" />
      <Char who="sena" pose="happy" className="ov-char" />
      <p className="a-tag c-lamp relative">Новый уровень</p>
      <motion.h2 className="fh relative text-7xl font-extrabold" initial={{ scale: 0.3 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 12 }} data-testid="levelup-level">{e.level}</motion.h2>
      <p className="fh relative mt-1 text-xl font-bold">{levelTitle(e.level)}</p>
      <div className="relative mt-4 flex flex-wrap justify-center gap-2">
        <span className="q-chip c-lamp"><Package size={12} /> +1 капсула</span>
        <span className="q-chip c-lamp"><Zap size={12} /> +{LEVEL_BONUS} Дж</span>
      </div>
      <button type="button" className="a-btn relative mt-6" onClick={onClose} data-testid="levelup-close-btn">Дальше</button>
    </div>
  );
}

function ArtifactWon({ e, onClose }) {
  const art = ART_BY_ID[e.id];
  const r = RARITY[art.rarity];
  return (
    <div className="ov-card" style={{ "--rc": r.color }} data-testid="artifact-won-overlay">
      <div className="ov-rays" />
      <p className="a-tag relative" style={{ color: r.color }}>{r.name} артефакт</p>
      <motion.img src={artImg(art.id)} alt={art.name} className="ov-prize" initial={{ scale: 0, rotate: -25 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 220, damping: 13 }} />
      <h2 className="fh relative text-2xl font-extrabold md:text-3xl" data-testid="artifact-won-name">{art.name}</h2>
      {art.how && <p className="t2 relative mt-2 text-sm">За то, что: {art.how.toLowerCase()}</p>}
      <p className="relative mt-3 max-w-sm text-sm font-semibold leading-relaxed">{art.fact}</p>
      <button type="button" className="a-btn relative mt-6" onClick={onClose} data-testid="artifact-won-close-btn">На полку!</button>
    </div>
  );
}

export function GameFx() {
  const [toasts, setToasts] = useState([]);
  const [queue, setQueue] = useState([]);
  const play = useSfx();

  useEffect(() => onFx((e) => {
    if (e.type === "levelup" || e.type === "artifact") {
      setQueue((q) => [...q, { ...e, key: Math.random() }]);
      return;
    }
    const id = Math.random();
    setToasts((t) => [...t.slice(-2), { ...e, id }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
    if (e.type === "reward") play("coin");
  }), [play]);

  const cur = queue[0];
  useEffect(() => {
    if (!cur) return;
    play(cur.type === "levelup" ? "level" : "win");
    const color = cur.type === "artifact" ? RARITY[ART_BY_ID[cur.id].rarity].color : "#FFB830";
    burst([color, "#ffffff", "#00E5FF", "#FFB830"]);
  }, [cur, play]);

  const close = () => setQueue((q) => q.slice(1));

  return (
    <>
      <div className="fx-toasts" aria-live="polite">
        <AnimatePresence>{toasts.map((t) => <Toast key={t.id} t={t} />)}</AnimatePresence>
      </div>
      <AnimatePresence>
        {cur && (
          <motion.div key={cur.key} className="ov-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.7, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
              {cur.type === "levelup" ? <LevelUp e={cur} onClose={close} /> : <ArtifactWon e={cur} onClose={close} />}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
