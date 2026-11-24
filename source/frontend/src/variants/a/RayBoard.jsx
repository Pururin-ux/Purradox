import { useId } from "react";
import { grid, numberText, onBoard, readCoordinate, readStep } from "@/lib/rayOptics";
import { OpticalInstrument, OpticalLamp } from "./OpticalSpecimen";

const unit = 23, originX = 180, originY = 143;
const sx = x => originX + x * unit;
const sy = y => originY - y * unit;
const xs = Array.from({ length: 13 }, (_, i) => grid.left + i);
const ys = Array.from({ length: 10 }, (_, i) => grid.bottom + i);
const path = (x1, y1, x2, y2) => "M" + sx(x1) + " " + sy(y1) + " L" + sx(x2) + " " + sy(y2);

function Arrowhead({ x, y, dx, dy }) {
  const angle = Math.atan2(-dy, dx) * 180 / Math.PI;
  return <path className="ray-arrowhead" d="M-4 -2.8 L1.5 0 L-4 2.8"
    transform={"translate("+sx(x)+" "+sy(y)+") rotate("+angle+")"} />;
}

function Beam({ scene, index, y, extensions, reference, draft }) {
  const [sourceX, sourceY] = scene.source;
  const hit = scene.hits[index];
  const slope = y === null ? null : (y - hit) / scene.rail;
  const end = scene.direction * 6;
  const midX = sourceX * 0.44, midY = hit + (sourceY - hit) * 0.44;
  const arrowX = scene.rail * .68;
  return <g className={"ray-beam ray-beam-" + index + (reference ? " ray-reference" : "")} data-ray={index+1}>
    {!reference && <>
      <path className="ray-incoming" d={path(sourceX, sourceY, 0, hit)} />
      <Arrowhead x={midX} y={midY} dx={-sourceX} dy={hit-sourceY} />
      <text className="ray-number" x={sx(midX)-10} y={sy(midY)+(index === 0 ? -6 : 13)}>{index + 1}</text>
    </>}
    {slope !== null && <>
      <path className="ray-outgoing" d={path(0,hit,end,hit+slope*end)} />
      <Arrowhead x={arrowX} y={hit+slope*arrowX} dx={scene.direction} dy={slope*scene.direction} />
      {extensions && <path className="ray-extension" d={path(0,hit,-end,hit-slope*end)} />}
      {!reference && <g className="ray-control-point" data-draft={draft}>
        {draft && <circle cx={sx(scene.rail)} cy={sy(y)} r="7.3" className="ray-preview-ring" />}
        <circle cx={sx(scene.rail)} cy={sy(y)} r="3.8" className="ray-pick" />
        {draft && <g className="ray-onboard-value" transform={"translate("+(sx(scene.rail)+9)+" "+(sy(y)+(y>4 ? 14 : -11))+")"}>
          <rect x="-2" y="-10" width="36" height="14" rx="4"/><text x="16" y=".5" textAnchor="middle">y = {numberText(y)}</text>
        </g>}
      </g>}
    </>}
  </g>;
}

function ImagePoint({ point, reference, draft, label = true }) {
  const [x, y] = point;
  const labelX = x >= 4.9 ? -8 : 8, labelY = y >= 4.5 ? 15 : -8;
  return <g className={"ray-image" + (reference ? " ray-reference-point" : "")} transform={"translate("+sx(x)+" "+sy(y)+")"}>
    {reference ? <circle r="6.4" /> : <path d="M0 -5.6 5.6 0 0 5.6 -5.6 0Z" />}
    {draft && <circle className="ray-preview-ring" r="8.5" />}
    {label && <text x={labelX} y={labelY} textAnchor={labelX < 0 ? "end" : "start"}>S′</text>}
  </g>;
}

export default function RayBoard({ scene, values, step, confirmed, guides, reference, crossing, spotlight,
  onPlace, onOffRail, onKeyboard, describedBy }) {
  const title = useId(), clip = useId();
  const image = readStep(values, 2);
  const rayMode = step === 0 || step === 1;
  function place(event) {
    if (step === null) return;
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return;
    const p = new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
    const x = (p.x-originX)/unit, y = (originY-p.y)/unit;
    const pos = [Math.round(x), Math.round(y)];
    if (!onBoard(pos)) return;
    if (rayMode && Math.abs(x - scene.rail) > .88) { onOffRail(); return; }
    if (!rayMode && onBoard(crossing) && Math.hypot(x-crossing[0], y-crossing[1]) <= .48) {
      onPlace(...crossing.map(n => Number(n.toFixed(2))));
    } else onPlace(...pos);
  }
  const sourceLabelX = scene.source[0] <= -5 ? 5 : -13;
  return <div className="ray-board" data-step={step ?? "result"} data-highlight={spotlight}>
    <svg viewBox="0 0 360 283" role="group" tabIndex={step === null ? -1 : 0} aria-labelledby={title}
      aria-describedby={describedBy} onClick={place} onKeyDown={onKeyboard}>
      <title id={title}>{scene.name + ". Сетка построения. Стрелки передвигают точку, Enter подтверждает, Escape отменяет правку."}</title>
      <defs>
        <clipPath id={clip}><rect x={sx(-6)-7} y={sy(5)-6} width={12*unit+14} height={9*unit+12}/></clipPath>
      </defs>
      <g className="ray-grid">{xs.map(x => <line key={x} x1={sx(x)} x2={sx(x)} y1={sy(5)} y2={sy(-4)} />)}
        {ys.map(y => <line key={y} x1={sx(-6)} x2={sx(6)} y1={sy(y)} y2={sy(y)} />)}</g>
      <path className="ray-axis" d={"M"+(sx(-6)-6)+" "+sy(0)+"H"+(sx(6)+8)+"m-4 -3 4 3-4 3"} />
      <g className="ray-ticks">{xs.filter(x => x%2 === 0).map(x => <text key={x} x={x===0 ? sx(x)+11 : sx(x)} y={x===0 ? sy(0)+15 : 254} textAnchor="middle">{numberText(x)}</text>)}
        {ys.filter(y => y%2 === 0 && y !== 0).map(y => <text key={y} x="27" y={sy(y)+4} textAnchor="end">{numberText(y)}</text>)}
        <text x="338" y={sy(0)+4}>x</text><text x="27" y="21">y</text></g>
      <g className="ray-rail" data-active={rayMode}>
        {rayMode && <rect x={sx(scene.rail)-8} y={sy(5)-4} width="16" height={9*unit+8} rx="8" />}
        <path className="ray-guide" d={path(scene.rail,5,scene.rail,-4)} />
        <text x={sx(scene.rail)} y="16" textAnchor="middle" className="ray-guide-label">x = {numberText(scene.rail)}</text>
        {rayMode && <g className="ray-rail-dots">{ys.map(y => <circle key={y} cx={sx(scene.rail)} cy={sy(y)} r="2.2" />)}</g>}
      </g>
      <OpticalInstrument kind={scene.optic} x={originX} y={originY} aperture={188} hitOffset={-scene.hits[0]*unit}/>
      <OpticalLamp x={sx(scene.source[0])} y={sy(scene.source[1])} height={34}/>
      <g clipPath={"url(#"+clip+")"}>
        {scene.hits.map((_,i) => <Beam key={i} scene={scene} index={i} y={readCoordinate(values[i],"y")}
          extensions={guides} draft={step===i && !confirmed[i]} />)}
        {reference && scene.hits.map((_,i) =>
          <Beam key={i} scene={scene} index={i} y={scene.rays[i]} extensions={scene.virtual} reference />)}
      </g>
      {scene.foci.map(x => <g className="ray-focus" key={x}><circle cx={sx(x)} cy={sy(0)} r="3"/>
        <text x={sx(x)+(x>=5 ? -10 : 5)} y={sy(0)+13}>F</text></g>)}
      <g className="ray-source"><circle cx={sx(scene.source[0])} cy={sy(scene.source[1])} r="2.3" />
        <text x={sx(scene.source[0])+sourceLabelX} y={sy(scene.source[1])-13}>S</text></g>
      {image && <ImagePoint point={image} draft={step===2 && !confirmed[2]} label={!reference} />}
      {reference && <ImagePoint point={scene.image} reference />}
    </svg>
    <div className="ray-legend"><span><i/>Луч 1</span><span><i/>Луч 2</span>
      {reference && <span className="ray-reference-key"><i/>Верный ход</span>}</div>
    {reference && image && <div className="ray-point-key"><span>◇ Твоя точка</span><span>○ Верное S′</span></div>}
  </div>;
}
