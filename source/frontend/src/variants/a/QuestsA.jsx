import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check, Clock3, ListChecks, X, Zap } from "lucide-react";
import { claimQuest, msToReset, questView, refreshGame, useGame } from "@/lib/game";
import { LINKS } from "@/lib/nav";
import { useSfx, haptic } from "@/lib/sound";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogClose, DialogDescription, DialogOverlay, DialogPortal, DialogSurface, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ProfilePortrait } from "./ProfileA";

const DESTINATIONS = {
  solve3: { to: LINKS.practice, label: "Выбрать задачи" },
  nohint: { to: LINKS.practice, label: "Выбрать задачи" },
  lesson: { to: LINKS.textbook, label: "Выбрать урок" },
  formula: { to: LINKS.textbook, label: "К учебнику" },
  model: { to: "/lesson/gazovye-zakony", label: "К уроку с моделью" },
  play: { to: LINKS.collection, label: "К полке" },
  ct5: { to: LINKS.ct, label: "К вариантам ЦТ" },
};

function useQuestReset() {
  const [remaining, setRemaining] = useState(msToReset);
  useEffect(() => {
    let timer;
    const update = () => {
      // A long-open drawer must also replace yesterday's quests. This only reads.
      refreshGame();
      const ms = msToReset();
      setRemaining(ms);
      timer = setTimeout(update, Math.min(60000, ms + 50));
    };
    update();
    return () => clearTimeout(timer);
  }, []);
  const minutes = Math.ceil(remaining / 60000);
  const hours = Math.floor(minutes / 60);
  return hours ? `Новые задания через ${hours} ч ${minutes % 60} мин` : `Новые задания через ${minutes} мин`;
}

function QuestRow({ q, onNavigate }) {
  const play = useSfx();
  const titleId = useId();
  const receiptRef = useRef(null);
  const [justClaimed, setJustClaimed] = useState(false);
  const [error, setError] = useState(null);
  const destination = DESTINATIONS[q.id];
  useEffect(() => {
    if (q.claimed && justClaimed) receiptRef.current?.focus();
  }, [q.claimed, justClaimed]);
  const claim = () => {
    const result = claimQuest(q.id);
    if (!result.ok) {
      setError(result.reason === "storage"
        ? "Не удалось сохранить награду. Проверь место и доступ к данным браузера, затем попробуй ещё раз."
        : "Эта награда уже получена или набор заданий сменился.");
      return;
    }
    setError(null);
    setJustClaimed(true);
    play("coin");
    haptic([12, 30, 12]);
  };
  return (
    <Card className="study-quest" data-testid={`quest-${q.id}`} data-quest-id={q.id} data-ready={q.done && !q.claimed || undefined} data-claimed={q.claimed || undefined} aria-labelledby={titleId}>
      <CardContent className="study-quest-body">
        <div className="study-quest-heading">
          <h3 id={titleId}>{q.title}</h3>
          <span className="study-quest-progress" data-testid={`quest-progress-${q.id}`}>{q.progress}/{q.target}</span>
        </div>
        <Progress className="study-quest-track" value={q.progress / q.target * 100} aria-label={q.title} aria-valuenow={q.progress} aria-valuemin={0} aria-valuemax={q.target} aria-valuetext={`${q.progress} из ${q.target}`} />
        <div className="study-quest-bottom">
          <div className="study-quest-rewards" aria-label="Награда">
            <Badge className="study-quest-reward"><Zap aria-hidden="true" />+{q.reward.joules} Дж</Badge>
            <Badge className="study-quest-reward">+{q.reward.xp} XP</Badge>
          </div>
          {q.claimed ? (
            <span className="study-quest-receipt" tabIndex={-1} ref={receiptRef} role="status" data-testid={`quest-receipt-${q.id}`}><Check aria-hidden="true" />Получено</span>
          ) : q.done ? (
            <Button type="button" className="study-quest-claim" onClick={claim} data-testid={`quest-claim-reward-btn-${q.id}`}>Забрать</Button>
          ) : destination && (
            <Button asChild variant="ghost" className="study-quest-open">
              <Link to={destination.to} onClick={onNavigate} data-testid={`quest-open-${q.id}`}>{destination.label}<ArrowUpRight aria-hidden="true" /></Link>
            </Button>
          )}
        </div>
        {error && !q.claimed && <Alert className="study-quest-error" data-testid={`quest-claim-error-${q.id}`}><AlertDescription>{error}</AlertDescription></Alert>}
      </CardContent>
    </Card>
  );
}

export function QuestList({ onNavigate }) {
  const g = useGame();
  return (
    <div className="study-quest-list" data-testid="quest-list">
      {questView(g).map(q => <QuestRow key={`${g.quests.day}:${q.id}`} q={q} onNavigate={onNavigate} />)}
    </div>
  );
}

function Head({ dialog = false }) {
  const reset = useQuestReset();
  const Title = dialog ? DialogTitle : "h2";
  const Description = dialog ? DialogDescription : "p";
  return (
    <div className="study-quests-heading">
      {!dialog && <span className="study-quest-emblem" aria-hidden="true"><ListChecks /></span>}
      <div className="study-quests-heading-copy">
        <Title className="study-quests-title">Квесты дня</Title>
        <Description className="study-quests-reset" data-testid="quest-reset-label"><Clock3 aria-hidden="true" /><span>{reset}</span></Description>
      </div>
    </div>
  );
}

export function QuestsCard() {
  return <Card className="study-quests-card" data-testid="quests-card"><Head /><QuestList /></Card>;
}

export function QuestsDrawer({ open, onClose, returnFocusRef }) {
  const closeRef = useRef(null);
  return (
    <Dialog open={open} onOpenChange={value => { if (!value) onClose(); }}>
      <DialogPortal>
        <DialogOverlay className="study-quests-overlay" data-testid="quests-drawer-overlay" />
        <DialogSurface className="study-quests-dialog" data-testid="quests-drawer" aria-modal="true"
          onOpenAutoFocus={event => { event.preventDefault(); closeRef.current?.focus(); }}
          onCloseAutoFocus={event => {
            const trigger = returnFocusRef?.current;
            if (trigger?.isConnected) { event.preventDefault(); trigger.focus(); }
          }}>
          <div className="study-quests-top">
            <Head dialog />
            <ProfilePortrait id="cat" className="study-quests-cat" sizes="(max-width: 355px) 72px, (max-width: 600px) 87px, 99px" />
            <DialogClose asChild><Button ref={closeRef} type="button" variant="ghost" size="icon" className="study-quests-close" aria-label="Закрыть квесты" data-testid="quests-drawer-close-btn"><X aria-hidden="true" /></Button></DialogClose>
          </div>
          <div className="study-quests-scroll"><QuestList onNavigate={onClose} /></div>
        </DialogSurface>
      </DialogPortal>
    </Dialog>
  );
}
