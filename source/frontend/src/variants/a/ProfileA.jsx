import { withProgressWrite } from "@/lib/progressLock";
import { createContext, useEffect, useRef, useState } from "react";
import { Check, Sparkles, Target, BookOpen, Gem, Volume2, Download, Upload } from "lucide-react";
import { useGame, useProfileGeneration, levelInfo, saveProfile, solvedTaskCount, exportProfile, importProfile } from "@/lib/game";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useMuted, toggleMute } from "@/lib/sound";
import { artImg, artThumbnail } from "@/lib/artifacts";
import { afterPaint } from "@/lib/afterPaint";
import { BrandMark } from "./BrandMark";
import { MAX_PROFILE_BYTES } from "@/lib/profileTransfer";

export const ProfileLauncher = createContext(null);

function portraitArt(name) {
  const base = "/art/full-site-20261107/" + name;
  return { src: base + ".webp", srcSet: [96, 192, 320].map(w => `${base}-${w}.webp ${w}w`).join(", ") };
}

export const AVATARS = [
  {id:"cat",label:"Любопытство",...portraitArt("avatar-cat-notebook-v1")},
  {id:"girl",label:"Своя идея",...portraitArt("avatar-girl-spark-v1")},
  {id:"prism",label:"Спектр",src:artImg("prism"),
    srcSet:[180, 360].map(w => `${artThumbnail("prism", w)} ${w}w`).join(", ")},
  {id:"moon",label:"Пуррадокс",src:null},
];
export function ProfilePortrait({ id, className = "profile-portrait", sizes = "38px", loading }) {
  const avatar = AVATARS.find(a => a.id === id) ?? AVATARS[0];
  return avatar.src
    ? <img className={className} src={avatar.src} srcSet={avatar.srcSet} sizes={sizes}
      width="96" height="96" alt="" loading={loading} decoding="async" draggable="false" />
    : <span className={className}><BrandMark /></span>;
}
export function ProfileA({ open, onOpenChange, onCloseAutoFocus }) {
  const titleRef = useRef(null);
  const cancelInitialFocus = useRef(null);
  const g = useGame(), L = levelInfo(g.xp);
  const generation = useProfileGeneration();
  const muted = useMuted();
  const [avatarEdit,setAvatarEdit] = useState(null), [nameEdit,setNameEdit] = useState(null);
  const [editConflict,setEditConflict] = useState(false);
  const avatar = avatarEdit?.value ?? g.avatar;
  const name = nameEdit?.value ?? g.nickname;
  const [code,setCode] = useState(""), [note,setNote] = useState(null), [pending,setPending] = useState(null);
  const fileRef = useRef(null);
  const fileRead = useRef(0);
  const wasOpen = useRef(false);
  const lastGeneration = useRef(generation);
  useEffect(() => () => {
    cancelInitialFocus.current?.();
    fileRead.current++;
  }, []);
  useEffect(() => {
    if (open && (!wasOpen.current || lastGeneration.current !== generation)) {
      setAvatarEdit(null); setNameEdit(null); setEditConflict(false); setPending(null);
      if (!wasOpen.current) { setCode(""); setNote(null); }
    }
    wasOpen.current = open;
    lastGeneration.current = generation;
  }, [open,generation]);
  const saveEdits = (override = false) => withProgressWrite(() => {
    const result = saveProfile({
      avatar: avatarEdit?.value, nickname: nameEdit?.value, profileGeneration: generation,
      expected: override ? undefined : { avatar: avatarEdit?.before, nickname: nameEdit?.before },
    });
    if (result === true) close(false);
    else setEditConflict(result === "conflict");
  });
  const doExport = () => {
    const res = exportProfile();
    if (!res.ok) { setNote({ kind: "error", text: res.error }); return; }
    const url = URL.createObjectURL(new Blob([res.json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = res.filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setCode(res.code);
    setNote(res.skippedDrafts ? { kind: "warn", text: `Файл готов. Повреждённые черновики остались в этом браузере (${res.skippedDrafts}).` } : null);
  };
  const applyImport = (text, replace) => withProgressWrite(() => {
    const res = importProfile(text, { replace });
    if (res.needsConfirm) { setPending({ text, summary: res.summary, confirmation: res.confirmation, damaged: res.damaged }); setNote(null); return; }
    setPending(null);
    if (!res.ok) { setNote({ kind: "error", text: res.error }); return; }
    setAvatarEdit(null);
    setNameEdit(null);
    setEditConflict(false);
    setCode(res.code);
    setNote({ kind: "ok", text: "Профиль и черновики перенесены." });
  });
  const onFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const request = ++fileRead.current;
    setCode("");
    setNote(null);
    setPending(null);
    if (file.size > MAX_PROFILE_BYTES) { setNote({ kind: "error", text: "Файл профиля больше 16 МБ." }); return; }
    const reader = new FileReader();
    reader.onload = () => { if (request === fileRead.current) applyImport(String(reader.result ?? "")); };
    reader.onerror = () => { if (request === fileRead.current) setNote({ kind: "error", text: "Не удалось прочитать файл. Попробуй ещё раз." }); };
    reader.readAsText(file);
  };
  const close = next => {
    if (!next) {
      cancelInitialFocus.current?.();
      fileRead.current++;
    }
    onOpenChange(next);
  };
  return <Dialog open={open} onOpenChange={close}><DialogContent className="profile-dialog" portalContainer={globalThis.document?.body}
    onOpenAutoFocus={event => {
      event.preventDefault();
      const title = titleRef.current;
      if (!title) return;
      const owner = title.ownerDocument;
      const surface = event.currentTarget;
      // Move focus off the page before Radix hides that page from assistive tech.
      if (owner.activeElement !== owner.body) owner.activeElement?.blur?.();
      cancelInitialFocus.current?.();
      cancelInitialFocus.current = afterPaint(() => {
        if (surface?.dataset.state === "open" && title.isConnected && !surface.contains(owner.activeElement)) {
          title.focus({ preventScroll: true });
        }
      });
    }}
    onCloseAutoFocus={onCloseAutoFocus}>
    <DialogHeader><DialogTitle ref={titleRef} tabIndex={-1}>Твоя мастерская</DialogTitle><DialogDescription className="sr-only">Профиль и настройки</DialogDescription></DialogHeader>
    <div className="profile-preview"><ProfilePortrait id={avatar} sizes="(max-width: 480px) 64px, 95px" /><div><h2>{name.trim() || L.title}</h2><p>Уровень {L.level} · {L.cur}/{L.need} XP</p><Progress value={L.pct*100} aria-label="Опыт до следующего уровня" /></div></div>
    <fieldset className="profile-avatars"><legend>Выбери аватар</legend><div>{AVATARS.map(a => <Button key={a.id} type="button" variant="ghost" aria-pressed={a.id === avatar} aria-label={a.label} onClick={() => setAvatarEdit(edit => ({ before: edit?.before ?? g.avatar, value: a.id }))}><ProfilePortrait id={a.id} sizes="58px" />{a.id === avatar && <Check aria-hidden="true" />}</Button>)}</div></fieldset>
    <div className="profile-name"><Label htmlFor="profile-name">Как к тебе обращаться</Label><Input id="profile-name" value={name} maxLength={28} placeholder="Твоё имя" onChange={e => {
      const value = e.target.value;
      setNameEdit(edit => ({ before: edit?.before ?? g.nickname, value }));
    }} /></div>
    <dl className="profile-numbers"><div><BookOpen aria-hidden="true" /><dt>Уроков</dt><dd>{g.completedLessons.length}</dd></div><div><Target aria-hidden="true" /><dt>Задач</dt><dd>{solvedTaskCount(g)}</dd></div><div><Gem aria-hidden="true" /><dt>Предметов</dt><dd>{g.owned.length}</dd></div></dl>
    <div className="profile-sound"><Label htmlFor="profile-sound"><Volume2 aria-hidden="true" />Звуки действий</Label><Switch id="profile-sound" checked={!muted} onCheckedChange={toggleMute} /></div>
    <Button className="study-next" onClick={() => saveEdits()}><Sparkles aria-hidden="true" />Сохранить</Button>
    {editConflict && <div className="profile-transfer-confirm" role="status">
      <p>Имя или аватар изменились в другой вкладке. Какой вариант оставить?</p>
      <div><Button type="button" variant="secondary" onClick={() => saveEdits(true)}>Мой вариант</Button>
        <Button type="button" variant="ghost" onClick={() => {
          setAvatarEdit(null); setNameEdit(null); setEditConflict(false);
        }}>Из другой вкладки</Button></div>
    </div>}
    <section className="profile-transfer" aria-label="Перенос профиля">
      <h3>Перенос на другое устройство</h3>
      <p>Скачай файл и выбери его в профиле на другом устройстве. Сверь код на обоих экранах.</p>
      <div className="profile-transfer-actions">
        <Button type="button" variant="secondary" onClick={doExport}><Download aria-hidden="true" />Скачать файл</Button>
        <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}><Upload aria-hidden="true" />Выбрать файл</Button>
        <Input ref={fileRef} type="file" accept=".json,application/json" hidden className="hidden" onChange={onFile} aria-label="Выбрать файл профиля" />
      </div>
      {code && <p className="profile-code" aria-live="polite">Код файла <strong>{code}</strong></p>}
      {note && <p role={note.kind === "error" ? "alert" : "status"} className={"profile-transfer-" + note.kind}>{note.text}</p>}
      {pending && <div className="profile-transfer-confirm">
        <p>Заменить профиль и черновики в этом браузере? В файле уроков {pending.summary.lessons}, задач {pending.summary.tasks}, черновиков {pending.summary.drafts}. {pending.damaged ? "Текущий профиль повреждён. Его исходная запись останется в браузере." : "Перед заменой можно скачать текущий профиль."}</p>
        <div><Button type="button" variant="secondary" onClick={() => applyImport(pending.text, pending.confirmation)}>Заменить</Button>
        <Button type="button" variant="ghost" onClick={() => setPending(null)}>Отмена</Button></div>
      </div>}
    </section>
    <p className="profile-local-note">Прогресс хранится в этом браузере. Перед очисткой данных скачай файл профиля.</p>
  </DialogContent></Dialog>;
}
