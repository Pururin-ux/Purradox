import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, CircleAlert, PackageOpen, X, Zap } from "lucide-react";
import { ShellA } from "./ShellA";
import { ArtifactArt, ArtifactCard, ArtifactModal } from "./ArtifactUi";
import { CapsuleOpen } from "./CapsuleOpen";
import { ARTIFACTS, ART_BY_ID, RARITY, RARITY_ORDER } from "@/lib/artifacts";
import { SHELF_MAX, openCapsule, trackUnique, useGame, useSaveError } from "@/lib/game";
import { useSfx } from "@/lib/sound";
import { formatJoules } from "@/lib/format";
import { LINKS } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

const FILTERS = [{ id:"all", label:"Все" }, ...RARITY_ORDER.filter(id => id !== "legendary").map(id => ({ id, label:RARITY[id].name }))];
const SORTED = [...ARTIFACTS].sort((a,b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));
const CAST = "/art/cast-reactions/20261106-graphic/";

function PrismFeature({ onOpen }) {
  return <section className="shop-feature" aria-labelledby="shop-feature-title">
    <img className="shop-feature-art" src="/art/full-site-20261107/prism-workbench.webp" width="1350" height="900" decoding="async" fetchPriority="high" alt="" />
    <div className="shop-feature-copy">
      <h2 id="shop-feature-title">Разложи свет</h2>
      <p>Меняй угол падения. Куда уйдут красный и фиолетовый лучи?</p>
      <Button type="button" className="shop-feature-action" aria-haspopup="dialog" data-testid="shop-prism-experiment"
        onClick={event => onOpen(ART_BY_ID.prism, event.currentTarget, "experiment")}>
        Опыт с призмой<ArrowRight aria-hidden="true" data-icon="inline-end" />
      </Button>
    </div>
  </section>;
}

function CapsulePanel({ count, onOpen, exhausted, opening, compact }) {
  return <Card className="shop-capsules" data-compact={compact || undefined} data-ready={(count > 0 && !exhausted) || undefined} data-testid="capsule-panel">
    <ArtifactArt id="capsule" sizes={compact ? "58px" : "(max-width: 760px) 48px, 72px"} />
    <CardHeader className="shop-capsules-copy">
      <CardTitle className="shop-section-title" role="heading" aria-level={2}>Капсулы <Badge variant="secondary" data-testid="capsule-count">{count}</Badge></CardTitle>
      {!compact && <p>{exhausted ? "В следующих капсулах будет по 300 Дж." : count > 0 ? "В каждой капсуле новый предмет для коллекции." : "Капсулы дают за новый уровень и за каждые три дня серии."}</p>}
    </CardHeader>
    <DialogTrigger asChild><Button type="button" className={count > 0 ? "study-next" : "shop-secondary"} disabled={count < 1 || opening} onClick={onOpen} data-testid="capsule-open-trigger"
      aria-label={count > 0 ? "Открыть капсулу" : undefined}>
      <PackageOpen aria-hidden="true" />{count > 0 ? <span>Открыть{!compact && <span className="shop-capsule-open-object"> капсулу</span>}</span> : "Пока нет капсул"}
    </Button></DialogTrigger>
  </Card>;
}

function Shelf({ ids, hasItems, onOpen }) {
  const play = useSfx();
  return <Card className="shop-shelf crafted-shelf" data-testid="collection-shelf">
    <CardHeader className="shop-shelf-heading">
      <div>
        <CardTitle className="shop-section-title" role="heading" aria-level={2}>Моя полка <span data-testid="shelf-count">{ids.length}/{SHELF_MAX}</span></CardTitle>
        {ids.length === 0 && <p>{hasItems ? "Выбери предмет из коллекции, чтобы поставить его на полку." : "Когда появится первый предмет, здесь будет место для него."}</p>}
      </div>
      <img className="shop-shelf-cat" srcSet={CAST + "cat-curious-144.webp 144w, " + CAST + "cat-curious-288.webp 288w"}
        sizes="(max-width:420px) 73px, (max-width:520px) 90px, (max-width:760px) 110px, 138px"
        src={CAST + "cat-curious-144.webp"} width="144" height="108" decoding="async" alt="" draggable="false" />
    </CardHeader>
    <CardContent className="crafted-shelf-scene" style={{backgroundImage:'url("/art/full-site-20261107/shelf-v1.webp")'}}>
      <ol className="shop-shelf-grid">
        {Array.from({length:Math.max(SHELF_MAX,ids.length)},(_,index) => {
          const id=ids[index], art=ART_BY_ID[id];
          return <li key={id || "empty-"+index}>{art ? <Button type="button" variant="ghost" className="shop-shelf-item" aria-haspopup="dialog" onClick={event => { play(art.sfx || "pop"); trackUnique("play","shelf:"+art.id); onOpen(art,event.currentTarget); }} data-testid={"collection-shelf-"+art.id}>
            <ArtifactArt id={art.id} trim /><span>{art.name}</span>
          </Button> : <span className="shop-shelf-space">
            <span className="sr-only">{id ? "Предмет недоступен" : "Свободное место " + (index + 1)}</span>
            <span className="shop-shelf-space-light" aria-hidden="true" />
          </span>}</li>;
        })}
      </ol>
    </CardContent>
  </Card>;
}

function Collection({ g, onOpen }) {
  const [filter,setFilter]=useState("all");
  const knownOwned=SORTED.filter(art=>g.owned.includes(art.id)).length;
  const shown=SORTED.filter(art=>filter==="all" || (filter==="owned" ? g.owned.includes(art.id) : !g.owned.includes(art.id)));
  return <>
    <Shelf ids={g.shelf} hasItems={knownOwned > 0} onOpen={onOpen} />
    <section className="shop-collection-summary" aria-label="Прогресс коллекции"><p>Собрано <strong>{knownOwned} из {ARTIFACTS.length}</strong></p><Progress value={100*knownOwned/ARTIFACTS.length} aria-label={"Собрано "+knownOwned+" из "+ARTIFACTS.length} /></section>
    <ToggleGroup type="single" className="shop-filters" value={filter} onValueChange={value=>{if(value)setFilter(value);}} aria-label="Предметы коллекции">
      <ToggleGroupItem value="all" data-testid="collection-filter-all">Все</ToggleGroupItem><ToggleGroupItem value="owned" data-testid="collection-filter-owned">Собранные</ToggleGroupItem><ToggleGroupItem value="missing" data-testid="collection-filter-missing">Не открыты</ToggleGroupItem>
    </ToggleGroup>
    {shown.length ? <div className="shop-object-grid">{shown.map(art=><ArtifactCard key={art.id} art={art} mode="collection" onOpen={onOpen} />)}</div>
      : <Card className="shop-empty" data-testid="collection-empty">
        <img srcSet={CAST + "cat-blink-180.webp 180w, " + CAST + "cat-blink-360.webp 360w"} sizes="180px"
          src={CAST + "cat-blink.png"} width="1448" height="1086" decoding="async" alt="Кот подмигивает." />
        <div><h2>{filter==="missing" ? "Всё собрано" : "Здесь пока пусто"}</h2><p>{filter==="missing" ? "Все находки уже в твоей коллекции." : "Новые предметы появятся после покупки или открытия капсулы."}</p><Button type="button" className="shop-secondary" onClick={()=>setFilter("all")}>Показать все предметы</Button></div></Card>}
  </>;
}

export default function ShopA() {
  const g=useGame(), saveError=useSaveError(), play=useSfx();
  const [params,setParams]=useSearchParams(), tab=params.get("tab")==="collection" ? "collection" : "store";
  const [filter,setFilter]=useState("all"), [open,setOpen]=useState(null), [opening,setOpening]=useState(null), [notice,setNotice]=useState(null);
  const capsuleBusy=useRef(false), itemOrigin=useRef(null), capsuleOrigin=useRef(null), collectionTab=useRef(null);
  const setTab=value=>{play("tap");setParams(value==="collection"?{tab:"collection"}:{},{replace:true});};
  const inspect=(art,origin,initialTab)=>{itemOrigin.current=origin;setOpen({art,initialTab});};
  const startCapsule=async event=>{
    if(capsuleBusy.current)return;
    capsuleOrigin.current=event.currentTarget;
    capsuleBusy.current=true;
    const result=await openCapsule();
    if(result){setNotice(null);setOpening(result);}
    else{capsuleBusy.current=false;play("bad");setNotice({kind:"capsule-error"});}
  };
  const closeCapsule=()=>{
    capsuleBusy.current=false;setOpening(null);
    if(opening)setNotice({kind:"success",text:opening.art ? `В коллекции появился предмет «${opening.art.name}».` : `+${opening.refund} Дж на балансе.`});
    setTab("collection");
  };
  const owned=SORTED.filter(art=>g.owned.includes(art.id)).length;
  const store=SORTED.filter(art=>art.price&&(filter==="all"||art.rarity===filter));
  const exhausted=ARTIFACTS.every(art=>art.rarity==="legendary"||g.owned.includes(art.id));
  return <ShellA>
    <div className="study-shop">
      <header className="shop-heading"><h1>{tab==="collection" ? "Коллекция" : "Магазин"}</h1><span className="shop-wallet" data-testid="shop-balance" aria-label={"Баланс "+g.joules+" Дж"}><Zap aria-hidden="true" />{formatJoules(g.joules)}</span></header>
      {notice && <Alert className="shop-notice" role={notice.kind==="success"?"status":"alert"} data-kind={notice.kind} data-testid="shop-notice">
        {notice.kind==="success" ? <CheckCircle2 aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
        <AlertDescription>{notice.kind==="success" ? notice.text : saveError ? "Капсула не открылась. Повтори действие после восстановления сохранения." : g.capsules<1 ? "Капсул пока нет." : "Не удалось открыть капсулу. Попробуй ещё раз."}</AlertDescription>
        <Button type="button" variant="ghost" className="shop-notice-close" aria-label="Закрыть сообщение" onClick={()=>setNotice(null)}><X aria-hidden="true" /></Button>
      </Alert>}
      <div className="shop-display" data-tab={tab}>
        {tab === "store" && <PrismFeature onOpen={inspect} />}
        <Dialog open={Boolean(opening)} onOpenChange={value=>{if(!value)closeCapsule();}}>
          <CapsulePanel count={g.capsules} onOpen={startCapsule} exhausted={exhausted} opening={Boolean(opening)} compact={tab==="collection"} />
          {opening && <CapsuleOpen result={opening} onCloseAutoFocus={event=>{event.preventDefault();if(capsuleOrigin.current?.isConnected&&!capsuleOrigin.current.disabled)capsuleOrigin.current.focus();else collectionTab.current?.focus();}} />}
        </Dialog>
      </div>
      <Tabs className="shop-tabs" value={tab} onValueChange={setTab}>
        <TabsList className="shop-tabs-list" aria-label="Магазин и коллекция">
          <TabsTrigger value="store" data-testid="shop-tab-store">Магазин</TabsTrigger>
          <TabsTrigger ref={collectionTab} value="collection" data-testid="shop-tab-collection">Коллекция <Badge variant="secondary">{owned}/{ARTIFACTS.length}</Badge></TabsTrigger>
        </TabsList>
        <TabsContent value="store" className="shop-tab-content" data-testid="shop-store">
          <ToggleGroup type="single" className="shop-filters" value={filter} onValueChange={value=>{if(value){play("tap");setFilter(value);}}} aria-label="Редкость предметов">
            {FILTERS.map(item=><ToggleGroupItem key={item.id} value={item.id} data-testid={"shop-filter-"+item.id}>{item.label}</ToggleGroupItem>)}
          </ToggleGroup>
          <div className="shop-object-grid">{store.map(art=><ArtifactCard key={art.id} art={art} mode="store" onOpen={inspect} />)}</div>
          <p className="shop-catalog-note"><Link to={LINKS.practice}>К тренажёру<ArrowRight aria-hidden="true" /></Link><span>Джоули начисляются за новые решения и уроки.</span></p>
        </TabsContent>
        <TabsContent value="collection" className="shop-tab-content" data-testid="shop-collection"><Collection g={g} onOpen={inspect} /></TabsContent>
      </Tabs>
    </div>
    <Dialog open={Boolean(open)} onOpenChange={value=>{if(!value)setOpen(null);}}>
      {open && <ArtifactModal key={open.art.id} art={open.art} initialTab={open.initialTab} onCloseAutoFocus={event=>{event.preventDefault();if(itemOrigin.current?.isConnected)itemOrigin.current.focus();else collectionTab.current?.focus();}} />}
    </Dialog>
  </ShellA>;
}
