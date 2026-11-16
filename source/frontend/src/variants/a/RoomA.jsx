import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowRight, Plus } from "lucide-react";
import { LINKS } from "@/lib/nav";
import { SHELF_MAX, track, useGame } from "@/lib/game";
import { ART_BY_ID, RARITY, artImg } from "@/lib/artifacts";
import { haptic, useSfx } from "@/lib/sound";
import { pickOne } from "@/lib/format";
import { Bubble, Char } from "./Chars";
import { QUIRK, SENA, TAHI } from "./lines";

gsap.registerPlugin(useGSAP);

function Shelf({ onPlay, playing }) {
  const g = useGame();
  const items = g.shelf.map((id) => ART_BY_ID[id]).filter(Boolean);
  const empty = Math.max(0, SHELF_MAX - items.length);
  return (
    <div className="shelf" data-testid="room-shelf">
      <div className="shelf-plank" />
      <div className="shelf-row">
        {items.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`shelf-item anim-${a.anim} ${playing === a.id ? "is-playing" : ""}`}
            style={{ "--rc": RARITY[a.rarity].color }}
            onClick={() => onPlay(a)}
            aria-label={a.name}
            data-testid={`room-artifact-${a.id}`}
          >
            <img src={artImg(a.id)} alt={a.name} draggable={false} />
            <span className="shelf-tag">{a.name}</span>
          </button>
        ))}
        {Array.from({ length: empty }, (_, i) => (
          <Link key={i} to="/shop" className="shelf-empty" aria-label="Пустое место — в лавку" data-testid={`room-empty-slot-${i}`}><Plus size={18} /></Link>
        ))}
      </div>
    </div>
  );
}

export function RoomA({ messy, line, onSay }) {
  const g = useGame();
  const root = useRef(null);
  const timer = useRef(0);
  const play = useSfx();
  const [playing, setPlaying] = useState(null);
  const [sena, setSena] = useState("idle");
  const [quirk, setQuirk] = useState(messy ? "coin" : "idle");

  useGSAP(() => {
    const el = root.current;
    if (!window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const bx = gsap.quickTo(".room-bg", "x", { duration: 0.9, ease: "power3" });
    const by = gsap.quickTo(".room-bg", "y", { duration: 0.9, ease: "power3" });
    const sx = gsap.quickTo(".room-sena", "x", { duration: 0.7, ease: "power3" });
    const qx = gsap.quickTo(".room-quirk", "x", { duration: 0.6, ease: "power3" });
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      bx(px * -22);
      by(py * -14);
      sx(px * 12);
      qx(px * 18);
    };
    el.addEventListener("pointermove", move);
    return () => el.removeEventListener("pointermove", move);
  }, { scope: root });

  const pose = (setter, p, base) => {
    setter(p);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setSena("idle"); setQuirk(base); }, 1900);
  };

  const onArtifact = (a) => {
    play(a.sfx);
    haptic(10);
    setPlaying(null);
    requestAnimationFrame(() => setPlaying(a.id));
    setTimeout(() => setPlaying((p) => (p === a.id ? null : p)), 1700);
    track("play");
    const who = a.voice ?? "sena";
    onSay({ who, text: a.fact });
    pose(who === "quirk" ? setQuirk : setSena, who === "quirk" ? "jump" : "think", messy ? "coin" : "idle");
  };

  return (<>
    <div ref={root} className={`room ${messy ? "is-messy" : ""}`} data-testid="home-room-scene">
      <picture>
        <source media="(max-width: 767px)" srcSet="/art/room_bg_sm.webp" />
        <img src="/art/room_bg.webp" alt="" className="room-bg" draggable={false} />
      </picture>
      <div className="room-shade" />
      <div className="room-mission">
        <p className="a-tag c-lamp">Сегодня · механика</p>
        <h2>Поезд трогается.<br />Что происходит<br />со скоростью?</h2>
        <p className="room-topic">Равноускоренное движение · 9 класс</p>
        <Link to={LINKS.lesson} className="a-btn" data-testid="home-start-lesson">{g.lessonDone ? "Вернуться к уроку" : "Начать урок"}<ArrowRight size={17} /></Link>
      </div>
      <div className="room-bubble"><Bubble who={line.who} text={line.text} avatar testid="room-dialog" /></div>
      <Char who="sena" pose={sena} className="room-sena" showName onClick={() => { play("pop"); onSay({ who: "sena", text: pickOne(SENA.tap) }); pose(setSena, "happy", messy ? "coin" : "idle"); }} testid="sena-character" />
      <Char who="quirk" pose={quirk} className="room-quirk" showName onClick={() => { play("pop"); onSay({ who: "quirk", text: messy ? QUIRK.messy : pickOne(QUIRK.tap) }); pose(setQuirk, "jump", messy ? "coin" : "idle"); }} testid="quirk-character" />
      <Char who="tahi" className="room-tahi" showName onClick={() => { play("pop"); onSay({ who: "tahi", text: pickOne(TAHI.tap) }); }} />
    </div>
    <section className="collection-shelf" aria-labelledby="shelf-heading">
      <header className="collection-heading"><div><p className="a-tag">Личная коллекция</p><h2 id="shelf-heading">Твои находки</h2></div><Link to={LINKS.collection}>Вся коллекция <span>{g.owned.length} / 19</span><ArrowRight size={16} /></Link></header>
      <Shelf onPlay={onArtifact} playing={playing} />
      <p className="shelf-note">Нажми на находку — у каждой своя история.</p>
    </section>
    </>
  );
}
