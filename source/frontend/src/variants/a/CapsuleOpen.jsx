import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { ART_BY_ID } from "@/lib/artifacts";
import { haptic, useSfx } from "@/lib/sound";
import { Button } from "@/components/ui/button";
import { DialogPortal, DialogOverlay, DialogSurface, DialogClose, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArtifactArt, RarityBadge } from "./ArtifactUi";

export function CapsuleOpen({ result, onCloseAutoFocus }) {
  const reducedMotion = useReducedMotion();
  const [revealed, setRevealed] = useState(Boolean(reducedMotion));
  const play = useSfx(), art = result.art;
  useEffect(() => {
    if (reducedMotion) { setRevealed(true); return; }
    play("charge");
    const timer = setTimeout(() => { setRevealed(true); play("win"); haptic(25); }, 1150);
    return () => clearTimeout(timer);
  }, [play, reducedMotion]);
  return <DialogPortal>
    <DialogOverlay className="shop-dialog-overlay" />
    <DialogSurface className="shop-dialog shop-capsule-dialog" aria-modal="true" onCloseAutoFocus={onCloseAutoFocus} data-testid="capsule-open-overlay">
      <DialogClose asChild><Button type="button" variant="ghost" className="shop-dialog-close" aria-label="Закрыть капсулу" data-testid="capsule-close-btn"><X aria-hidden="true" /></Button></DialogClose>
      <DialogTitle className="shop-dialog-title">{revealed ? (art ? "Новая находка" : "Всё уже собрано") : "Открываем капсулу"}</DialogTitle>
      <DialogDescription className={revealed ? "shop-capsule-description" : "sr-only"}>{revealed ? (art ? "Предмет уже в твоей коллекции." : "Вместо предмета — джоули.") : "Содержимое капсулы уже сохранено. Можно закрыть окно в любой момент."}</DialogDescription>
      {!revealed ? <motion.div className="shop-capsule-opening" animate={{rotate:[0,-4,4,-3,0],y:[0,-4,0]}} transition={{duration:1.1,ease:"easeOut"}}><ArtifactArt id="capsule" alt="Капсула" eager /></motion.div>
        : <div className="shop-capsule-result" role="status">
          <ArtifactArt id={art ? art.id : "capsule"} alt={art?.name || "Капсула"} eager />
          {art && <RarityBadge rarity={art.rarity} />}
          <p className="shop-prize-name" data-testid="capsule-reveal-name">{art ? art.name : "+" + result.refund + " Дж"}</p>
          <p className="shop-prize-fact">{art ? art.fact : "Все предметы из капсул уже есть в коллекции. Джоули зачислены на баланс."}</p>
          {result.first && <div className="shop-first-bonus" data-testid="capsule-first-bonus"><ArtifactArt id="quark" /><span>За первую капсулу<strong>{ART_BY_ID.quark.name}</strong></span></div>}
          <DialogClose asChild><Button type="button" className="study-next" data-testid="capsule-claim-btn">К коллекции</Button></DialogClose>
        </div>}
    </DialogSurface>
  </DialogPortal>;
}
