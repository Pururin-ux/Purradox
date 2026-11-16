import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Check, CheckCircle2, Diamond, ImageOff, Lock, X, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { ARTIFACT_LESSONS, RARITY, artImg, artThumbnail } from "@/lib/artifacts";
import artifactBounds from "@/lib/artifactBounds";
import { SHELF_MAX, buy, toggleShelf, useGame, useSaveError } from "@/lib/game";
import { LINKS } from "@/lib/nav";
import { haptic, useSfx } from "@/lib/sound";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { DialogPortal, DialogOverlay, DialogSurface, DialogClose, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PrismExperiment } from "./PrismExperiment";

export function RarityBadge({ rarity, className = "" }) {
  return <Badge variant="secondary" className={"shop-rarity " + className} data-rarity={rarity}><Diamond aria-hidden="true" />{RARITY[rarity].name}</Badge>;
}

export function ArtifactArt({ id, alt = "", className = "", eager = false, trim = false, sizes }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [id]);
  const thumbnailWidths = id === "capsule" ? [72, 144] : [180, 360];
  const srcSet = sizes ? thumbnailWidths.map(width => `${artThumbnail(id, width)} ${width}w`).join(", ") : undefined;
  return <span className={"shop-art " + className}>
    {failed ? <span className="shop-art-error" role="img" aria-label="Рисунок не загрузился"><ImageOff aria-hidden="true" /><span>Нет рисунка</span></span>
      : trim && artifactBounds[id] ? <svg className="shop-art-viewport" viewBox={artifactBounds[id]} preserveAspectRatio="xMidYMax meet" aria-hidden={alt ? undefined : true} role={alt ? "img" : undefined} aria-label={alt || undefined}><image href={artImg(id)} x="0" y="0" width="512" height="512" onError={() => setFailed(true)} /></svg>
      : <img
          sizes={sizes}
          srcSet={srcSet}
          src={artImg(id)}
          alt={alt}
          width="512"
          height="512"
          loading={eager ? "eager" : "lazy"}
          decoding={sizes ? "async" : undefined}
          draggable="false"
          onError={() => setFailed(true)}
        />}
  </span>;
}

export function ArtifactCard({ art, mode, onOpen }) {
  const g = useGame(), owned = g.owned.includes(art.id), onShelf = g.shelf.includes(art.id);
  const reveal = owned || Boolean(art.price), name = reveal ? art.name : "Неизвестная находка";
  const meta = owned ? (onShelf ? "На полке" : "В коллекции") : art.price ? art.price + " Дж" : art.how;
  const tid = mode === "store" ? "shop-item-card-" + art.id : "collection-artifact-slot-" + art.id;
  return <Button type="button" variant="ghost" className="shop-object" data-owned={owned || undefined} data-hidden={!reveal || undefined}
    aria-label={name + ". " + meta + ". Осмотреть"} aria-haspopup="dialog" onClick={event => onOpen(art, event.currentTarget)} data-testid={tid}>
    <span className="shop-object-meta"><RarityBadge rarity={art.rarity} />{owned && <Check className="shop-owned-mark" aria-hidden="true" />}</span>
    <ArtifactArt id={art.id} sizes="(max-width: 520px) min(138px, calc(50vw - 51px)), 178px" />
    <span className="shop-object-name">{name}</span>
    <span className="shop-object-caption">{!owned && art.price && <Zap aria-hidden="true" />}{meta}</span>
  </Button>;
}

function Actions({ art, onBought }) {
  const g = useGame(), saveError = useSaveError(), play = useSfx();
  const [outcome, setOutcome] = useState(null);
  const owned = g.owned.includes(art.id), onShelf = g.shelf.includes(art.id);
  const buyItem = () => {
    const result = buy(art.id);
    if (result.ok) { play("buy"); haptic([15, 30, 15]); setOutcome("bought"); onBought?.(art); }
    else if (result.reason === "storage") { play("bad"); setOutcome("storage"); }
    else if (result.reason === "poor") { play("bad"); setOutcome("poor"); }
    else setOutcome(null);
  };
  const shelf = () => {
    if (toggleShelf(art.id)) { play("pop"); setOutcome(onShelf ? "removed" : "placed"); }
    else { play("bad"); setOutcome("storage"); }
  };
  const full = !onShelf && g.shelf.length >= SHELF_MAX;
  const lack = Math.max(0, (art.price || 0) - g.joules);
  return <div className="shop-object-actions">
    {outcome && <Alert className="shop-action-status" role={outcome === "storage" || outcome === "poor" ? "alert" : "status"} data-kind={outcome} data-testid="artifact-action-status">
      {outcome === "bought" && <><CheckCircle2 aria-hidden="true" /><AlertTitle role="heading" aria-level={3}>Предмет твой</AlertTitle><AlertDescription>Можно найти его в коллекции.</AlertDescription></>}
      {outcome === "placed" && <AlertDescription>Поставлено на полку.</AlertDescription>}
      {outcome === "removed" && <AlertDescription>Снято с полки. Предмет остаётся в коллекции.</AlertDescription>}
      {outcome === "storage" && <AlertDescription>{saveError || "Не удалось сохранить действие. Повтори его ещё раз."}</AlertDescription>}
      {outcome === "poor" && <AlertDescription>Не хватает {lack} Дж. Можно вернуться после занятий.</AlertDescription>}
    </Alert>}
    {owned ? <>
      <Button type="button" className={onShelf ? "shop-secondary" : "study-next"} disabled={full} onClick={shelf} data-testid="artifact-shelf-toggle-btn">
        {onShelf ? "Убрать с полки" : "Поставить на полку"}
      </Button>
      {full && <p className="shop-action-note">Все {SHELF_MAX} мест заняты. Освободи место на полке.</p>}
    </> : art.price ? <>
      <Button type="button" className="study-next" disabled={lack > 0} onClick={buyItem} data-testid="shop-buy-btn"><Zap aria-hidden="true" />Купить за {art.price} Дж</Button>
      {lack > 0 && <p className="shop-action-note" data-testid="shop-lack">Не хватает {lack} Дж.</p>}
      <p className="shop-action-note">Твой баланс: {g.joules} Дж.</p>
    </> : null}
  </div>;
}

export function ArtifactModal({ art, onBought, onCloseAutoFocus, initialTab = "object" }) {
  const g = useGame(), reveal = g.owned.includes(art.id) || Boolean(art.price);
  const name = reveal ? art.name : "Неизвестная находка";
  const prism = art.id === "prism";
  const lesson = ARTIFACT_LESSONS[art.id];
  const route = reveal && lesson ? { to: `/lesson/${lesson.slug}`, label: lesson.label }
    : !reveal && art.id === "train" ? { to: `/lesson/${lesson.slug}`, label: "Открыть урок" }
    : !reveal && art.id === "watch" ? { to: LINKS.ct, label: "Выбрать вариант ЦТ" }
    : null;
  const lessonLink = route && <Button asChild variant="ghost" className="shop-lesson-link">
    <Link to={route.to}><BookOpen aria-hidden="true" />{route.label}<ArrowRight aria-hidden="true" /></Link>
  </Button>;
  const title = <DialogTitle className="shop-dialog-title" data-testid="artifact-modal-name">{name}</DialogTitle>;
  const object = <>
    <figure className="shop-object-stage" data-rarity={art.rarity} data-hidden={!reveal || undefined}><ArtifactArt id={art.id} alt={reveal ? art.name : "Силуэт неизвестной находки"} eager /></figure>
    <div className="shop-object-details">
      <RarityBadge rarity={art.rarity} />
      {!prism && title}
      {prism ? <p className="shop-object-fact" data-testid="artifact-modal-fact">{art.fact}</p>
        : reveal ? <DialogDescription className="shop-object-fact" data-testid="artifact-modal-fact">{art.fact}</DialogDescription>
        : <DialogDescription className="shop-action-note shop-locked-how" data-testid="artifact-how"><Lock aria-hidden="true" />{art.how}</DialogDescription>}
      {reveal && <Actions art={art} onBought={onBought} />}
      {lessonLink}
    </div>
  </>;
  return <DialogPortal>
    <DialogOverlay className="shop-dialog-overlay" />
    <DialogSurface className={"shop-dialog " + (prism ? "shop-prism-dialog" : "shop-object-dialog")} aria-modal="true" onCloseAutoFocus={onCloseAutoFocus} data-testid="artifact-modal">
      <DialogClose asChild><Button type="button" variant="ghost" className="shop-dialog-close" aria-label="Закрыть осмотр" data-testid="artifact-modal-close-btn"><X aria-hidden="true" /></Button></DialogClose>
      {prism ? <Tabs defaultValue={initialTab}>
        {title}
        <DialogDescription className="sr-only">Осмотри призму или проверь, как она отклоняет свет.</DialogDescription>
        <TabsList className="shop-prism-tabs" aria-label="Осмотр призмы">
          <TabsTrigger value="object">Предмет</TabsTrigger>
          <TabsTrigger value="experiment">Опыт с призмой</TabsTrigger>
        </TabsList>
        <TabsContent value="object" className="shop-object-dialog">{object}</TabsContent>
        <TabsContent value="experiment"><PrismExperiment />{lessonLink}</TabsContent>
      </Tabs> : object}
    </DialogSurface>
  </DialogPortal>;
}
