import { useId } from "react";
import { OpticalInstrument, OpticalLamp } from "./OpticalSpecimen";
import "./mirror-plate.css";

const axis = 105;
const filamentFraction = .70;

function Lamp({ x, magnification = 1, height, ghost = false }) {
  const size = height / (1 - 120/384);
  return <g transform={"translate("+x+" "+axis+") scale("+magnification+")"} opacity={ghost ? .63 : 1}>
    <OpticalLamp x={0} y={-height} height={size}/>
  </g>;
}

function DirectedLine({ from, to, fraction, incident, dashed = false }) {
  const dx = to[0]-from[0], dy = to[1]-from[1];
  const position = [from[0]+dx*fraction, from[1]+dy*fraction];
  return <g className={incident ? "mirror-incident" : "mirror-reflected"} fill="none">
    <path d={"M"+from.join(" ")+" L"+to.join(" ")} strokeDasharray={dashed ? "3 4" : undefined}/>
    {!dashed && <path className="mirror-chevron" d="M-4 -2.5 0 0 -4 2.5"
      transform={"translate("+position.join(" ")+") rotate("+Math.atan2(dy,dx)*180/Math.PI+")"}/>}
  </g>;
}

export default function MirrorPlate({ focal, distance, imageState }) {
  const clip = useId();
  const { atFocus, b, magnification } = imageState;
  const near = Math.max(distance, focal > 0 ? focal : 0, b > 0 ? b : 0);
  const behind = Math.max(0, -focal, b < 0 ? -b : 0);
  const scale = 345 / (near + behind + 5);
  const pole = 51 + near*scale;
  const physX = length => pole - length*scale;
  const object = physX(distance), focus = physX(focal);
  const image = atFocus ? null : physX(b);
  const height = Math.min(43, 62 / Math.max(1, Math.abs(magnification ?? 0)));
  const source = [object, axis-height], imageTip = [image, axis-height*magnification];
  // In the paraxial construction the reflection points lie in the plane of the pole.
  const hits = [[pole,axis-height],[pole,axis]];
  const kind = focal > 0 ? "concave-mirror" : "convex-mirror";
  const end = 18;
  const reflectedEnd = ([,y], i) => {
    const slope = i === 0 ? -height/(focal*scale) : -height/(distance*scale);
    return [end, y+slope*(end-pole)];
  };
  const measure = n => n.toLocaleString("ru", { maximumFractionDigits:1 });
  const title = atFocus ? "Лампа в фокусе. Отражённые лучи параллельны."
    : b > 0 ? "Два луча от нити лампы сходятся в её перевёрнутом изображении перед зеркалом."
      : "Отражённые лучи расходятся. За зеркалом их продолжения пересекаются в прямом изображении нити.";
  return <div className="mirror-plate">
    <div className="mirror-optics">
      <svg viewBox="0 0 425 228" role="img" aria-label={title} data-focus={atFocus || undefined}>
        <defs>
          <clipPath id={clip}><rect x="8" y="13" width="407" height="171" rx="7"/></clipPath>
        </defs>
        <path className="mirror-dimension" aria-hidden="true"
          d={"M"+object+" 198v7 M"+object+" 202H"+pole+" M"+pole+" 198v7"} />
        <path className="mirror-axis" d={"M12 "+axis+"H413"}/>
        <OpticalInstrument kind={kind} x={pole} y={axis} aperture={124} hitOffset={-height}/>
        <Lamp x={object} height={height}/>
        {!atFocus && <Lamp x={image} height={height} magnification={magnification} ghost/>}
        <g clipPath={"url(#"+clip+")"}>
          {hits.map((hit,i) => <g key={i}>
            <DirectedLine from={source} to={hit} fraction={i===0 ? .55 : .42} incident/>
            <DirectedLine from={hit} to={reflectedEnd(hit,i)} fraction={i===0 ? .22 : .39}/>
            {b < 0 && <DirectedLine from={hit} to={imageTip} fraction={.6} dashed/>}
          </g>)}
        </g>
        <circle className="mirror-source-point" cx={source[0]} cy={source[1]} r="3.1"/>
        {!atFocus && <g className="mirror-image-point"><circle cx={image} cy={imageTip[1]} r="5.2"/><circle cx={image} cy={imageTip[1]} r="1.8"/></g>}
        <g className="mirror-focus-point"><circle cx={focus} cy={axis} r="3.4"/><text x={focus+5} y={axis+13}>F</text></g>
        <g className="mirror-names">
          <text x={object} y={Math.max(18,axis-height/filamentFraction-9)} textAnchor="middle">Лампа</text>
          {!atFocus && <text x={image} y={magnification<0 ? Math.min(178,axis+height*Math.abs(magnification)/filamentFraction+15) : Math.max(16,axis-height*magnification/filamentFraction-10)}
            textAnchor="middle">Изображение</text>}
        </g>
        <g className="mirror-scale"><text x={(object+pole)/2} y="218" textAnchor="middle">До зеркала {measure(distance)} см</text>
          <text x="406" y="218" textAnchor="end">|f| = {measure(Math.abs(focal))} см</text></g>
      </svg>
      <div className="mirror-legend"><span><i/>Падающий луч</span><span><i/>Отражённый луч</span>{b<0 && <span><i/>Продолжение</span>}</div>
    </div>
  </div>;
}
