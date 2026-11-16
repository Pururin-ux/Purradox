import { useState } from "react";
import { VtGraph } from "@/components/shared/VtGraph";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { lensState } from "@/lib/studyModels";

const plum = "#674683";
const amber = "#94551e";
const teal = "#286b66";
const soft = "#af98b7";
const ink = "var(--resume-ink)";

function Plate({ title, height, children }) {
  return <svg className="trainer-plate" viewBox={`0 0 288 ${height}`} role="img" aria-label={title}>
    {children}
  </svg>;
}

function Arrow({ from, to, color = plum, dashed }) {
  const [x, y] = to;
  const angle = Math.atan2(y - from[1], x - from[0]) * 180 / Math.PI;
  return <g fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1={from[0]} y1={from[1]} x2={x} y2={y} strokeDasharray={dashed ? "4 4" : undefined} />
    <path d="M-7 -4L0 0L-7 4" transform={`translate(${x} ${y}) rotate(${angle})`} />
  </g>;
}

function LengthMark({ start, end, y, label }) {
  return <g>
    <path d={`M${start} ${y}H${end} M${start} ${y - 4}v8 M${end} ${y - 4}v8`} stroke={plum} strokeWidth="1.5" />
    <text x={(start + end) / 2} y={y + 19} textAnchor="middle">{label}</text>
  </g>;
}

function DiagramControls({ label, value, options, onChange }) {
  return <ToggleGroup type="single" className="trainer-figure-controls" value={value}
    onValueChange={next => { if (next) onChange(next); }} aria-label={label}>
    {options.map(([id, name]) => <ToggleGroupItem key={id} value={id}>{name}</ToggleGroupItem>)}
  </ToggleGroup>;
}

function Dynamometer({ solved = false }) {
  const position = index => 24 + 24 * index;
  return <Plate height={91} title={solved
    ? "Между нулевым и следующим штрихом 2 ньютона." : "Шкала от 0 до 20 ньютонов. Между отметками десять одинаковых промежутков."}>
    <rect x="13" y="11" width="262" height="46" rx="11" fill="#fff5e4" stroke="#d9b48d" />
    {solved && <rect x="24" y="14" width="24" height="39" rx="3" fill="#f1cb86" />}
    <path d="M24 44H264" stroke={amber} strokeWidth="1.5" />
    {Array.from({ length: 11 }, (_, index) => (
      <line key={index} x1={position(index)} x2={position(index)}
        y1={index % 5 === 0 ? 19 : 28} y2="44" stroke={ink} strokeWidth="1.8" />
    ))}
    <text x="24" y="76" textAnchor="end">0</text>
    <text x="273" y="76" textAnchor="end">20 Н</text>
    {solved && <text x="48" y="76" fill={amber}>2 Н</text>}
  </Plate>;
}

function CoordinateSlope() {
  return <Plate height={187} title="Прямолинейный участок графика: начальная координата 7 метров, спустя 4 секунды минус 5 метров.">
    <path d="M49 40H65 M49 136H248V96" stroke={soft} strokeDasharray="4 4" fill="none" />
    <Arrow from={[65, 96]} to={[271, 96]} />
    <Arrow from={[65, 152]} to={[65, 24]} />
    <path d="M65 40L248 136" stroke={teal} strokeWidth="2.6" strokeLinecap="round" />
    <circle cx="65" cy="40" r="4" fill={teal} />
    <circle cx="248" cy="136" r="4" fill={teal} />
    <text x="61" y="17">x, м</text>
    <text x="47" y="46" textAnchor="end">7</text>
    <text x="47" y="101" textAnchor="end">0</text>
    <text x="47" y="141" textAnchor="end">−5</text>
    <path d="M248 93v6" stroke={plum} strokeWidth="1.6" />
    <text x="248" y="84" textAnchor="middle">4</text>
    <text x="272" y="174" textAnchor="end">Время от старта, с</text>
  </Plate>;
}

function WalkRoute({ solved = false }) {
  const start = [71, 179];
  const east = [197, 179];
  const turn = [197, 11];
  const finish = [141, 11];
  return <Plate height={210} title={solved
    ? "Маршрут свёрнут в прямоугольный треугольник. Катеты: 5 метров на восток и 12 метров на север."
    : "От старта 9 метров вправо, затем 12 метров вверх и 4 метра влево."}>
    {solved && <>
      <path d="M71 179H141V11Z" fill="#fff1d2" />
      <path d="M130 179V168H141" stroke={amber} fill="none" />
      <Arrow from={start} to={finish} color={amber} />
      <Arrow from={[141, 179]} to={finish} dashed color={amber} />
      <text x="111" y="119" fill={amber}>13 м</text>
      <text x="101" y="168" textAnchor="middle" fill={amber}>5 м</text>
    </>}
    <Arrow from={start} to={east} color={plum} />
    <Arrow from={east} to={turn} color={teal} />
    <Arrow from={turn} to={finish} color={plum} />
    <circle cx={start[0]} cy={start[1]} r="3.8" fill={plum} />
    <text x="129" y="199" textAnchor="middle">9 м</text>
    <text x="209" y="96">12 м</text>
    <text x="168" y="31" textAnchor="middle">4 м</text>
  </Plate>;
}

function TrainTrack() {
  return <Plate height={169} title="В первом кадре голова поезда у начала платформы. Во втором хвост у её дальнего края. Длина платформы 180 метров, поезда 120 метров.">
    <rect x="94" y="29" width="100" height="113" rx="7" fill="#efdfc8" />
    <path d="M94 24V142 M194 24V142" stroke={amber} strokeDasharray="3 4" />
    <text x="144" y="20" textAnchor="middle">180 м</text>
    {[61, 115].map(y => (
      <path key={y} d={`M14 ${y}H274`} stroke={soft} strokeWidth="2" />
    ))}
    <path d="M27 37H84L94 47V57H27Z" fill={plum} />
    <path d="M194 91H251L261 101V111H194Z" fill={plum} />
    <path d="M38 44H78 M206 98H245" stroke="#ffedbf" strokeWidth="3" strokeLinecap="round" />
    <text x="20" y="83">Старт</text>
    <text x="268" y="136" textAnchor="end">Финиш</text>
    <LengthMark start={194} end={261} y={147} label="120 м" />
  </Plate>;
}

function CoupledBlocks({ solved = false }) {
  if (solved) return <Plate height={164} title="Сверху граница охватывает оба бруска, справа приложено 20 ньютонов. Снизу внутри границы остался брусок 3 килограмма, его вправо тянет нить.">
    <rect x="20" y="15" width="175" height="58" rx="12" fill="#eee0f3" stroke={plum} strokeDasharray="4 4" />
    <path d="M96 44H133" stroke={soft} strokeWidth="2" />
    <rect x="32" y="28" width="64" height="31" rx="5" fill="#cceddc" stroke={teal} />
    <rect x="133" y="28" width="52" height="31" rx="5" fill="#f8dbab" stroke={amber} />
    <text x="64" y="49" textAnchor="middle">3 кг</text>
    <text x="159" y="49" textAnchor="middle">2 кг</text>
    <Arrow from={[185, 44]} to={[253, 44]} color={amber} />
    <text x="246" y="26" fill={amber} textAnchor="middle">20 Н</text>
    <rect x="20" y="96" width="88" height="53" rx="12" fill="#deeee8" stroke={teal} strokeDasharray="4 4" />
    <rect x="32" y="107" width="64" height="31" rx="5" fill="#cceddc" stroke={teal} />
    <text x="64" y="128" textAnchor="middle">3 кг</text>
    <Arrow from={[96, 122]} to={[170, 122]} color={teal} />
    <text x="182" y="129" fill={teal}>Натяжение</text>
  </Plate>;
  return <Plate height={104} title="На гладком столе брусок 3 килограмма слева, брусок 2 килограмма справа. Между ними нить. Сила 20 ньютонов тянет правый брусок вправо.">
    <path d="M16 81H272V94H16Z" fill="#dbcbe6" />
    <path d="M16 81H272" stroke={soft} strokeWidth="2" />
    <path d="M92 62H127" stroke={plum} strokeWidth="1.8" />
    <rect x="25" y="46" width="67" height="34" rx="5" fill="#cceddc" stroke={teal} />
    <rect x="127" y="46" width="53" height="34" rx="5" fill="#f8dbab" stroke={amber} />
    <text x="58" y="69" textAnchor="middle">3 кг</text>
    <text x="154" y="69" textAnchor="middle">2 кг</text>
    <Arrow from={[180, 62]} to={[254, 62]} color={amber} />
    <text x="250" y="43" fill={amber} textAnchor="end">20 Н</text>
  </Plate>;
}

function RodBalance() {
  const left = 27;
  const support = 85.5;
  const center = 144;
  const right = 261;
  return <Plate height={179} title="Слева груз 12 килограммов, в середине стержня приложена его тяжесть, справа искомый груз. От опоры до левого груза и середины по 0,5 метра, до правого груза 1,5 метра.">
    <path d={`M${support} 52l-15 30h30Z`} fill="#e0b981" stroke={amber} />
    <rect x={left - 6} y="43" width={right - left + 12} height="11" rx="4" fill="#c3a0ce" stroke={plum} />
    <circle cx={center} cy="48.5" r="4" fill={plum} />
    <text x={left - 11} y="29">12 кг</text>
    <text x={center} y="29" textAnchor="middle">6 кг</text>
    <text x={right} y="29" textAnchor="middle">m</text>
    <Arrow from={[left, 56]} to={[left, 89]} color={amber} />
    <Arrow from={[center, 54]} to={[center, 89]} />
    <Arrow from={[right, 56]} to={[right, 89]} />
    <path d={`M${left} 91v20 M${support} 85v67 M${center} 91v20 M${right} 91v61`} stroke={soft} strokeDasharray="3 4" />
    <LengthMark start={left} end={support} y={111} label="0,5 м" />
    <LengthMark start={support} end={center} y={111} label="0,5 м" />
    <LengthMark start={support} end={right} y={150} label="1,5 м" />
  </Plate>;
}

function OilAndWater() {
  const left = 60;
  const right = 228;
  const interfaceY = 120;
  const oilY = 40;
  const waterY = 56;
  const bottom = `V141Q${left} 177 144 177T${right} 141`;
  return <Plate height={205} title="В открытой трубке слева 25 сантиметров масла над границей с водой. Справа 20 сантиметров воды над той же горизонталью. Давления на этом уровне равны.">
    <path d={`M${left} 20${bottom}V20`} stroke="#a481a7" strokeWidth="37" fill="none" />
    <path d={`M${left} 20${bottom}V20`} stroke="#f9f8ed" strokeWidth="32" fill="none" />
    <path d={`M${left} ${interfaceY}${bottom}V${waterY}`} stroke="#a9d4cb" strokeWidth="26" fill="none" />
    <path d={`M${left} ${oilY}V${interfaceY}`} stroke="#ebc371" strokeWidth="26" />
    <path d={`M16 ${interfaceY}H272`} stroke={plum} strokeDasharray="4 4" strokeWidth="1.5" />
    <path d={`M86 ${oilY}V${interfaceY} m-4 0h8 M82 ${oilY}h8 M202 ${waterY}V${interfaceY} m-4 0h8 M198 ${waterY}h8`}
      stroke={plum} strokeWidth="1.4" fill="none" />
    <text x="94" y="68" fill={amber}>25 см</text>
    <text x="194" y="100" fill={teal} textAnchor="end">20 см</text>
    <text x="144" y="146" textAnchor="middle">Уровень раздела</text>
  </Plate>;
}

function EchoPaths() {
  return <Plate height={146} title="До ближней стены 68 метров, до дальней 102 метра. Звук прошёл каждый отрезок дважды.">
    <path d="M26 17H40V123H26Z M248 17H262V123H248Z" fill="#dbcbe6" />
    <path d="M40 17V123 M248 17V123" stroke={plum} strokeWidth="2" />
    <path d="M26 33H39 M26 57H39 M26 81H39 M26 105H39 M249 33H262 M249 57H262 M249 81H262 M249 105H262" stroke={soft} />
    <Arrow from={[123, 43]} to={[43, 43]} color={amber} />
    <Arrow from={[123, 43]} to={[245, 43]} color={teal} />
    <Arrow from={[43, 81]} to={[123, 81]} color={amber} dashed />
    <Arrow from={[245, 81]} to={[123, 81]} color={teal} dashed />
    <path d="M123 36V96" stroke={plum} strokeDasharray="3 4" />
    <circle cx="123" cy="63" r="6" fill={plum} />
    <text x="82" y="67" textAnchor="middle" fill={amber}>0,4 с</text>
    <text x="185" y="67" textAnchor="middle" fill={teal}>0,6 с</text>
    <LengthMark start={40} end={123} y={111} label="68 м" />
    <LengthMark start={123} end={248} y={111} label="102 м" />
  </Plate>;
}

function FrictionForces({ solved = false }) {
  if (solved) return <Plate height={155} title="Две вертикальные силы вверх, реакция стола 30 ньютонов и составляющая тяги 10 ньютонов. Вниз действует сила тяжести 40 ньютонов.">
    <path d="M36 93H250v10H36Z" fill="#e7d7ef" />
    <path d="M36 93H250" stroke={plum} strokeWidth="2" />
    <rect x="117" y="54" width="55" height="39" rx="6" fill="#bd9ccf" stroke={plum} />
    <Arrow from={[137, 70]} to={[137, 25]} color={teal} />
    <text x="126" y="26" fill={teal} textAnchor="end">N = 30 Н</text>
    <Arrow from={[152, 70]} to={[152, 55]} color={amber} />
    <text x="179" y="59" fill={amber}>Fᵧ = 10 Н</text>
    <path d="M156 55H173" stroke={amber} strokeDasharray="2 3" />
    <Arrow from={[144, 70]} to={[144, 130]} />
    <text x="158" y="133">mg = 40 Н</text>
  </Plate>;
  return <Plate height={126} title="На брусок действует сила тяги 20 ньютонов под углом 30 градусов к горизонтальной поверхности.">
    <path d="M12 104H276V117H12Z" fill="#e7d7ef" />
    <path d="M12 104H276" stroke={plum} strokeWidth="2" />
    <rect x="85" y="64" width="50" height="40" rx="6" fill="#bd9ccf" stroke={plum} />
    <Arrow from={[110, 85]} to={[216, 24]} color={amber} />
    <path d="M135 85H216 M147 85a37 37 0 0 0 -5 -18" stroke={soft} fill="none" strokeDasharray="3 4" />
    <text x="273" y="26" fill={amber} textAnchor="end">20 Н</text>
    <text x="180" y="73">30°</text>
  </Plate>;
}

function SpringRunway() {
  return <img className="trainer-scene" alt="Брусок наверху плавного спуска. Внизу дорожка становится горизонтальной и ведёт к закреплённой пружине."
    src="/art/trainer-tasks/spring-runway-v1-640.webp"
    srcSet="/art/trainer-tasks/spring-runway-v1-640.webp 640w, /art/trainer-tasks/spring-runway-v1-1152.webp 1152w"
    sizes="(max-width: 660px) calc(100vw - 80px), 650px" width={1152} height={404} />;
}

function EnergyTransfer() {
  return <dl className="trainer-energy-transfer">
    <div><dt>На вершине</dt><dd><b>50 Дж</b> за счёт высоты</dd></div>
    <div><dt>Пружина сжата</dt><dd><b>50 Дж</b> в пружине</dd></div>
  </dl>;
}

function Crests({ solved = false }) {
  const start = 24;
  const period = 60;
  const center = 57;
  const amplitude = 23;
  const curve = Array.from({ length: 101 }, (_, i) => {
    const x = i * 2.88;
    return `${i ? "L" : "M"}${x.toFixed(1)} ${(center - amplitude * Math.cos((x - start) * Math.PI * 2 / period)).toFixed(1)}`;
  }).join(" ");
  return <Plate height={137} title={solved
    ? "Между первым и пятым гребнем четыре одинаковых промежутка по 3 метра."
    : "От первого из пяти соседних гребней до пятого 12 метров."}>
    <path d="M12 57H276" stroke={soft} strokeDasharray="3 5" />
    <path d={curve} fill="none" stroke={teal} strokeWidth="2.6" strokeLinecap="round" />
    {Array.from({ length: 5 }, (_, i) => {
      const x = start + i * period;
      return <g key={i}>
        <circle cx={x} cy={center - amplitude} r="3.5" fill={plum} />
        <text x={x} y="22" textAnchor="middle">{i + 1}</text>
        {(solved || i === 0 || i === 4) && <path d={`M${x} 41V103`} stroke={soft} strokeDasharray="3 5" />}
      </g>;
    })}
    {solved
      ? [0, 1, 2, 3].map(i => <LengthMark key={i} start={start + i * period} end={start + (i + 1) * period} y={107} label="3 м" />)
      : <LengthMark start={start} end={start + 4 * period} y={107} label="12 м" />}
  </Plate>;
}

function PlotAxes({ origin, xlabel, ylabel, bottom = 170 }) {
  const [x, y] = origin;
  return <>
    <Arrow from={[x, y]} to={[272, y]} />
    <Arrow from={[x, y]} to={[x, 27]} />
    <text x={x + 1} y="18">{ylabel}</text>
    <text x="275" y={bottom} textAnchor="end">{xlabel}</text>
  </>;
}

function Isobar() {
  return <Plate height={154} title="На графике давления от объёма стрелка идёт горизонтально слева направо.">
    <PlotAxes origin={[43, 118]} xlabel="V" ylabel="p" bottom={143} />
    <path d="M43 62H112V118 M230 62V118" stroke={soft} strokeDasharray="4 4" fill="none" />
    <Arrow from={[112, 62]} to={[230, 62]} color={amber} />
    <circle cx="112" cy="62" r="3.8" fill={amber} />
    <text x="112" y="141" textAnchor="middle">V₁</text>
    <text x="230" y="141" textAnchor="middle">V₂</text>
  </Plate>;
}

function Isochores({ solved = false }) {
  return <Plate height={176} title={solved
    ? "При одной температуре давление на первой изохоре втрое больше, чем на второй."
    : "Две прямые на графике давления от температуры. Коэффициент p/T у первой в три раза больше, чем у второй."}>
    <PlotAxes origin={[42, 139]} xlabel="T, К" ylabel="p" bottom={163} />
    {solved && <>
      <path d="M42 49H162V139 M42 109H162" stroke={soft} strokeWidth="1.6" strokeDasharray="4 4" fill="none" />
      <text x="34" y="55" textAnchor="end" fill={plum}>3p*</text>
      <text x="34" y="115" textAnchor="end" fill={teal}>p*</text>
      <text x="162" y="163" textAnchor="middle">T*</text>
    </>}
    <path d="M42 139L182 34" stroke={plum} strokeWidth="2.6" fill="none" />
    <path d="M42 139L246 88" stroke={teal} strokeWidth="2.6" fill="none" />
    <text x="197" y="38" fill={plum}>1</text>
    <text x="256" y="91" fill={teal}>2</text>
    {solved && <>
      <circle cx="162" cy="49" r="3.8" fill={plum} />
      <circle cx="162" cy="109" r="3.8" fill={teal} />
    </>}
  </Plate>;
}

function GasWork({ solved = false }) {
  return <Plate height={178} title={solved
    ? "Под отрезком от 2 до 6 литров выделена трапеция с основаниями 100 и 200 килопаскалей."
    : "На графике давления от объёма отмечен переход от 2 литров и 100 килопаскалей к 6 литрам и 200 килопаскалям."}>
    {solved && <path d="M109 134V89L238 44V134Z" fill="#f7d99c" />}
    <path d="M45 44H238V134 M45 89H109V134" stroke={soft} strokeWidth="1.2" strokeDasharray="4 4" fill="none" />
    <PlotAxes origin={[45, 134]} xlabel="V, л" ylabel="p, кПа" />
    <Arrow from={[109, 89]} to={[238, 44]} color={amber} />
    <circle cx="109" cy="89" r="4" fill={amber} />
    <text x="37" y="49" textAnchor="end">200</text>
    <text x="37" y="94" textAnchor="end">100</text>
    <text x="37" y="151" textAnchor="end">0</text>
    <text x="109" y="155" textAnchor="middle">2</text>
    <text x="238" y="155" textAnchor="middle">6</text>
  </Plate>;
}

function HeatCycle() {
  return <Plate height={185} title="По часовой стрелке: расширение при 300 килопаскалях от 2 до 5 литров, затем сжатие при 100 килопаскалях.">
    <path d="M123 42H225V108H123Z" fill="#f6dda9" />
    <path d="M123 42H55 M123 108H55 M123 108V141 M225 108V141" stroke={soft} strokeDasharray="4 4" fill="none" />
    <PlotAxes origin={[55, 141]} xlabel="V, л" ylabel="p, кПа" bottom={180} />
    <Arrow from={[123, 42]} to={[225, 42]} color={amber} />
    <Arrow from={[225, 42]} to={[225, 108]} color={amber} />
    <Arrow from={[225, 108]} to={[123, 108]} color={teal} />
    <Arrow from={[123, 108]} to={[123, 42]} color={teal} />
    <text x="44" y="49" textAnchor="end">300</text>
    <text x="44" y="115" textAnchor="end">100</text>
    <text x="123" y="163" textAnchor="middle">2</text>
    <text x="225" y="163" textAnchor="middle">5</text>
  </Plate>;
}

function MeltEnergy() {
  return <div className="trainer-melt-ledger">
    <div className="trainer-melt-bar" aria-hidden="true">
      <span style={{ flex: 21 }} /><span style={{ flex: 330 }} /><span style={{ flex: 84 }} />
    </div>
    <dl>
      <div><dt>Лёд от −10 до 0 °C</dt><dd>21 кДж</dd></div>
      <div><dt>Плавление при 0 °C</dt><dd>330 кДж</dd></div>
      <div><dt>Вода от 0 до 20 °C</dt><dd>84 кДж</dd></div>
    </dl>
  </div>;
}

function BranchCircuit({ disabledBranch = false, solved = false }) {
  return <Plate height={174} title={disabledBranch
    ? "Верхняя ветвь разомкнута. Нижняя ветвь по-прежнему подключена к обоим выводам источника."
    : "Две ветви с резисторами соединяют одни и те же два вывода источника напряжения."}>
    <g fill="none" stroke={plum} strokeWidth="2" strokeLinejoin="round">
      <path d="M119 148H21V35H101M181 35H267V148H169 M21 92H112 M176 92H267" />
      <rect x="112" y="82" width="64" height="20" rx="3" />
      <path d="M119 148H139m0-16v32m10-25v18m0-9h20" />
    </g>
    <g fill="none" stroke={disabledBranch ? soft : plum} strokeWidth="2" strokeLinejoin="round">
      <rect x="137" y="25" width="44" height="20" rx="3" />
      <path d="M122 35H137" />
      <path d={disabledBranch ? "M101 35L119 22" : "M101 35H122"} stroke={plum} />
    </g>
    {[21, 267].map(x => <circle key={x} cx={x} cy="92" r="4" fill={plum} />)}
    {[101, 122].map(x => <circle key={x} cx={x} cy="35" r="3" fill={plum} />)}
    <text x="143" y="73" textAnchor="middle" fill={amber}>U</text>
    {solved && <>
      {disabledBranch ? <text x="218" y="25" fill={plum}>0 А</text>
        : <Arrow from={[192, 35]} to={[249, 35]} color={amber} />}
      <Arrow from={[192, 92]} to={[249, 92]} color={teal} />
    </>}
  </Plate>;
}

function BranchComparison() {
  const [state, setState] = useState("before");
  const open = state === "after";
  return <>
    <DiagramControls label="Положение выключателя" value={state} onChange={setState}
      options={[["before", "Обе целы"], ["after", "Одна разомкнута"]]} />
    <BranchCircuit solved disabledBranch={open} />
    <figcaption aria-live="polite">
      {open ? "Верхний ток исчез. Нижняя ветвь подключена к тому же напряжению, её ток сохранился." : "Ток от источника делится между двумя ветвями. Напряжение у ветвей общее."}
    </figcaption>
  </>;
}

function MeterCircuit() {
  return <Plate height={218} title="Слева последовательный резистор 3 Ом. Справа между одними и теми же узлами резисторы 3 Ом и 6 Ом и вольтметр. Источник 20 В подключён ко всей цепи.">
    <g fill="none" stroke={plum} strokeWidth="2" strokeLinejoin="round">
      <path d="M123 184H17V72H36 M94 72H122V29H157 M223 29H270V184H163 M122 72V133H173 M207 133H270 M122 72H157 M223 72H270" />
      <rect x="36" y="62" width="58" height="20" rx="3" />
      <rect x="157" y="19" width="66" height="20" rx="3" />
      <rect x="157" y="62" width="66" height="20" rx="3" />
      <path d="M123 184H138m0-16v32m10-25v18m0-9h15" />
    </g>
    <path d="M122 133H173 M207 133H270" stroke={amber} strokeWidth="2" />
    <circle cx="190" cy="133" r="17" fill="#fff1d2" stroke={amber} strokeWidth="2" />
    <text x="190" y="138" textAnchor="middle" fill={amber}>V</text>
    <text x="65" y="54" textAnchor="middle">3 Ом</text>
    <text x="190" y="77" textAnchor="middle">3 Ом</text>
    <text x="190" y="34" textAnchor="middle">6 Ом</text>
    <text x="143" y="214" textAnchor="middle">20 В</text>
    {[122, 270].map(x => <circle key={x} cx={x} cy="72" r="4" fill={plum} />)}
    <circle cx="270" cy="133" r="4" fill={plum} />
  </Plate>;
}

function ResistorLine() {
  const origin = [65, 132];
  const point = [209, 57];
  const endX = 253;
  const endY = origin[1] - (origin[1] - point[1]) * (endX - origin[0]) / (point[0] - origin[0]);
  return <Plate height={173} title="Ток от напряжения. Прямая проходит через ноль и точку 6 вольт, 0,30 ампера.">
    <PlotAxes origin={origin} xlabel="U, В" ylabel="I, А" bottom={160} />
    <path d={`M${origin[0]} ${point[1]}H${point[0]}V${origin[1]}`} stroke={soft} strokeDasharray="4 4" strokeWidth="1.6" fill="none" />
    <path d={`M${origin[0]} ${origin[1]}L${endX} ${endY}`} stroke={teal} strokeWidth="2.6" fill="none" />
    <circle cx={point[0]} cy={point[1]} r="4.5" fill={teal} />
    <text x={origin[0] - 10} y={point[1] + 6} textAnchor="end">0,30</text>
    <text x={origin[0] - 10} y="155" textAnchor="end">0</text>
    <text x={point[0]} y="155" textAnchor="middle">6</text>
  </Plate>;
}

function MidpointContributions() {
  return <>
    <Plate height={137} title="Равные по модулю заряды находятся на одинаковом расстоянии от средней точки. Поле каждого направлено от плюса к минусу.">
      <path d="M44 45H244 M144 51V116" stroke={soft} strokeDasharray="4 4" fill="none" />
      <circle cx="44" cy="45" r="17" fill="#f8dcae" stroke={amber} />
      <circle cx="244" cy="45" r="17" fill="#d8cdc1" stroke={plum} />
      <circle cx="144" cy="45" r="4.5" fill={plum} />
      <text x="44" y="52" textAnchor="middle" fill={amber}>+Q</text>
      <text x="244" y="52" textAnchor="middle" fill={plum}>−Q</text>
      <text x="94" y="27" textAnchor="middle">r</text>
      <text x="194" y="27" textAnchor="middle">r</text>
      <Arrow from={[144, 77]} to={[209, 77]} color={amber} />
      <Arrow from={[144, 110]} to={[209, 110]} color={plum} />
      <text x="132" y="83" textAnchor="end" fill={amber}>От +Q</text>
      <text x="132" y="116" textAnchor="end" fill={plum}>От −Q</text>
    </Plate>
    <dl className="trainer-midpoint-sum">
      <div><dt>Потенциал</dt><dd>+kQ/r − kQ/r = 0</dd></div>
      <div><dt>Поле</dt><dd>Обе стрелки вправо</dd></div>
    </dl>
  </>;
}

function LorentzDirections() {
  const [particle, setParticle] = useState("proton");
  const proton = particle === "proton";
  return <>
    <DiagramControls label="Частица в магнитном поле" value={particle} onChange={setParticle}
      options={[["proton", "Протон"], ["electron", "Электрон"]]} />
    <Plate height={144} title={`Поле направлено вглубь листа. Скорость вправо, сила ${proton ? "вверх" : "вниз"}.`}>
      {[35, 89, 143, 197, 251].flatMap(x => [27, 75, 123].map(y => (
        <path key={`${x}-${y}`} d={`M${x - 4} ${y - 4}l8 8m0-8l-8 8`} stroke={soft} strokeWidth="1.5" />
      )))}
      <Arrow from={[143, 75]} to={[238, 75]} color={teal} />
      <Arrow from={[143, 75]} to={[143, proton ? 17 : 135]} color={amber} />
      <circle cx="143" cy="75" r="12" fill={plum} />
      <path d={proton ? "M138 75h10m-5-5v10" : "M138 75h10"} stroke="#fffaf8" strokeWidth="1.8" strokeLinecap="round" />
      <text x="239" y="65" fill={teal}>v</text>
      <text x="154" y={proton ? 20 : 139} fill={amber}>F</text>
    </Plate>
    <figcaption aria-live="polite">{proton ? "Положительный заряд отклоняется вверх." : "При той же скорости отрицательный заряд отклоняется вниз."}</figcaption>
  </>;
}

function MovingRail() {
  return <Plate height={169} title="Вертикальная перемычка длиной 0,5 метра скользит вправо по горизонтальным рельсам. Магнитное поле перпендикулярно рисунку.">
    {[70, 107, 144, 181, 218, 250].flatMap(x => [51, 87, 123].map(y => (
      <path key={`${x}-${y}`} d={`M${x - 4} ${y - 4}l8 8m0-8l-8 8`} stroke={soft} strokeWidth="1.5" />
    )))}
    <path d="M28 65V26H265 M28 109V146H265" stroke={plum} strokeWidth="3" strokeLinecap="round" fill="none" />
    <rect x="17" y="65" width="22" height="44" rx="4" fill="#e4d4ec" stroke={plum} strokeWidth="2" />
    <path d="M164 26V146" stroke={amber} strokeWidth="5" strokeLinecap="round" />
    <circle cx="164" cy="26" r="5.5" fill={amber} />
    <circle cx="164" cy="146" r="5.5" fill={amber} />
    <Arrow from={[173, 86]} to={[243, 86]} color={teal} />
    <text x="242" y="74" textAnchor="end" fill={teal}>10 м/с</text>
    <text x="154" y="109" textAnchor="end" fill={amber}>0,5 м</text>
    <text x="51" y="163">B = 0,4 Тл</text>
  </Plate>;
}

function GlassPath({ solved = false }) {
  const normal = [191, 119];
  const entry = [114.5, 17];
  const exit = [191, 119];
  return <Plate height={171} title={solved ? "Толщина пластины 12 сантиметров — прилежащий катет, путь луча 15 сантиметров — гипотенуза." : "Луч внутри пластины идёт под углом бета к нормали. Толщина пластины 12 сантиметров."}>
    <rect x="25" y="17" width="238" height="102" rx="2" fill="#e0eeeb" stroke={teal} />
    {solved && <path d={`M${entry[0]} 17V119H${normal[0]}Z`} fill="#f6d799" />}
    <path d={`M${entry[0]} 9V133 M${entry[0] + 11} 119v-11h-11`} stroke={teal} strokeDasharray="4 4" fill="none" />
    <Arrow from={entry} to={exit} color={amber} />
    <path d="M41 17v102 M35 17h12 M35 119h12" stroke={teal} strokeWidth="1.5" />
    <text x="52" y="73" fill={teal}>12 см</text>
    <text x="121" y="54">β</text>
    <text x="184" y="64" fill={amber}>{solved ? "15 см" : "путь луча"}</text>
    <text x="110" y="152" textAnchor="end">нормаль</text>
  </Plate>;
}

function ShadowRays({ solved = false }) {
  return <Plate height={185} title={solved
    ? "Из подобия треугольников тень втрое выше пластинки. Её высота 60 сантиметров."
    : "Лампа, пластинка и экран на одной оси. До пластинки 1 метр, от неё до экрана ещё 2 метра."}>
    <path d="M22 75L250 24V126Z" fill="#f7ddad" />
    <path d="M22 75L250 24 M22 75L250 126" stroke={amber} strokeWidth="1.8" />
    <path d="M22 75H250" stroke={soft} strokeDasharray="4 5" />
    <circle cx="22" cy="75" r="5.5" fill={amber} />
    <path d="M98 58V92 M250 15V135" stroke={plum} strokeWidth="4" strokeLinecap="round" />
    <path d="M250 24V126" stroke={ink} strokeWidth="5" />
    <text x="7" y="57">Лампа</text>
    <path d="M98 94V122" stroke={soft} strokeDasharray="3 4" />
    <text x="103" y="130">20 см</text>
    <text x="240" y="78" textAnchor="end">{solved ? "60 см" : "Тень"}</text>
    <LengthMark start={22} end={98} y={153} label="1 м" />
    <LengthMark start={98} end={250} y={153} label="2 м" />
  </Plate>;
}

function VirtualImage() {
  const lens = 192;
  const focal = 66;
  const distance = 44;
  const { b, magnification } = lensState(focal, distance);
  const axis = 107;
  const tip = axis - 19;
  const object = lens - distance;
  const image = lens + b;
  const imageTip = axis - magnification * 19;
  return <Plate height={163} title="Предмет находится между фокусом и линзой. Продолжения двух лучей пересекаются слева от предмета, давая прямое увеличенное изображение.">
    <path d={`M14 ${axis}H275`} stroke={soft} strokeDasharray="4 4" />
    <path d="M192 34Q174 67 192 132Q210 67 192 34Z" fill="#c2ddd8" stroke={teal} />
    <path d={`M${image} ${imageTip}L${lens} ${tip} M${image} ${imageTip}L${object} ${tip}`}
      stroke={amber} strokeDasharray="4 4" strokeWidth="2" fill="none" />
    <path d={`M${object} ${tip}H${lens}L274 ${tip + (274-lens)*19/focal} M${object} ${tip}L274 ${tip + (274-object)*19/distance}`}
      stroke={amber} strokeWidth="2" fill="none" />
    <Arrow from={[image, axis]} to={[image, imageTip]} dashed />
    <Arrow from={[object, axis]} to={[object, tip]} />
    {[lens - focal, lens + focal].map(x => <g key={x}>
      <circle cx={x} cy={axis} r="3.5" fill={teal} />
      <text x={x} y="133" textAnchor="middle" fill={teal}>F</text>
    </g>)}
    <text x="16" y="39">Изображение</text>
    <path d="M148 113v29" stroke={soft} strokeDasharray="3 4" />
    <text x="155" y="155" textAnchor="middle">Предмет</text>
  </Plate>;
}

function PhotonTransitions() {
  const [path, setPath] = useState("direct");
  const direct = path === "direct";
  return <>
    <DiagramControls label="Путь атома с верхнего уровня" value={path} onChange={setPath}
      options={[["direct", "Напрямую"], ["cascade", "Через E₂"]]} />
    <Plate height={155} title={direct ? "Прямой переход с E₃ на E₁." : "Два перехода: с E₃ на E₂ и с E₂ на E₁."}>
      {[26, 85, 132].map((y, i) => <g key={y}>
        <path d={`M54 ${y}H258`} stroke={soft} strokeWidth="1.5" />
        <text x="39" y={y + 5} textAnchor="end">{["E₃", "E₂", "E₁"][i]}</text>
      </g>)}
      {direct ? <Arrow from={[106, 26]} to={[106, 132]} color={amber} />
        : <><Arrow from={[171, 26]} to={[171, 85]} color={teal} />
          <Arrow from={[224, 85]} to={[224, 132]} color={plum} /></>}
    </Plate>
    <figcaption aria-live="polite">{direct ? "Один скачок даёт фотон с энергией E₃ − E₁." : "Два скачка дают два фотона. Их энергии E₃ − E₂ и E₂ − E₁."}</figcaption>
  </>;
}

function DecayLedger() {
  return <table className="trainer-decay">
    <caption>Активность исходных изотопов</caption>
    <thead><tr><th scope="col">Время</th><th scope="col">T = 2 ч</th><th scope="col">T = 4 ч</th></tr></thead>
    <tbody>
      <tr><th scope="row">0 ч</th><td>640 Бк</td><td>160 Бк</td></tr>
      <tr><th scope="row">2 ч</th><td>320 Бк</td><td>≈113 Бк</td></tr>
      <tr><th scope="row">4 ч</th><td>160 Бк</td><td>80 Бк</td></tr>
    </tbody>
  </table>;
}

function NuclearLedger() {
  return <table className="trainer-decay">
    <caption>Два баланса реакции</caption>
    <thead><tr><th scope="col">Число</th><th scope="col">Слева</th><th scope="col">У ³⁰P</th><th scope="col">У X</th></tr></thead>
    <tbody>
      <tr><th scope="row">A</th><td>27 + 4</td><td>30</td><td>1</td></tr>
      <tr><th scope="row">Z</th><td>13 + 2</td><td>15</td><td>0</td></tr>
    </tbody>
  </table>;
}

const questionFigures = {
  "izmereniya-i-vektory:t1": { Figure: Dynamometer, tone: "sand" },
  "izmereniya-i-vektory:t3": { Figure: CoordinateSlope, tone: "mint" },
  "izmereniya-i-vektory:t6": { Figure: WalkRoute, tone: "mint" },
  "ravnomernoe-dvizhenie:t6": { Figure: TrainTrack },
  "zakony-nyutona-i-plotnost:t6": { Figure: CoupledBlocks },
  "uprugost-i-trenie:t3": { Figure: FrictionForces },
  "rabota-moshchnost-i-energiya:t6": { Figure: SpringRunway, tone: "scene" },
  "mehanicheskie-volny:t5": { Figure: Crests, tone: "mint" },
  "gazovye-zakony:t1": { Figure: Isobar, tone: "sand" },
  "gazovye-zakony:t3": { Figure: Isochores, tone: "sand" },
  "vnutrennyaya-energiya-i-rabota-gaza:t3": { Figure: GasWork, tone: "sand" },
  "pervyj-zakon-i-teplovye-dvigateli:t3": { Figure: HeatCycle, tone: "sand" },
  "tok-i-soprotivlenie:t2": { Figure: ResistorLine, tone: "mint" },
  "soedineniya-provodnikov:t3": { Figure: BranchCircuit, props: { disabledBranch: true } },
  "soedineniya-provodnikov:t6": { Figure: MeterCircuit },
  "magnitnyj-potok-i-indukciya:t6": { Figure: MovingRail, tone: "mint" },
  "prelomlenie-i-polnoe-otrazhenie:t6": { Figure: GlassPath, tone: "mint" },
  "svet-i-otrazhenie:t6": { Figure: ShadowRays, tone: "sand" },
};

const solutionFigures = {
  "izmereniya-i-vektory:t1": { Figure: Dynamometer, tone: "sand", caption: "Выделен промежуток между нулём и ближайшим штрихом." },
  "izmereniya-i-vektory:t6": { Figure: WalkRoute, tone: "mint", caption: "Конец маршрута на 5 м восточнее старта и на 12 м севернее него." },
  "ravnouskorennoe-dvizhenie:t7": { Figure: ({ graph }) => <VtGraph graph={{ ...graph, fill_to: 4 }} theme="study" className="trainer-area-plot" compact />,
    caption: "Закрашен участок от 0 до 4 с. Высота его левой стороны 2 м/с, правой 10 м/с." },
  "zakony-nyutona-i-plotnost:t6": { Figure: CoupledBlocks },
  "uprugost-i-trenie:t3": { Figure: FrictionForces },
  "rabota-moshchnost-i-energiya:t6": { Figure: EnergyTransfer, tone: "sand" },
  "ravnovesie-i-prostye-mehanizmy:t6": { Figure: RodBalance, tone: "sand" },
  "davlenie-i-arhimed:t3": { Figure: OilAndWater, tone: "mint" },
  "mehanicheskie-volny:t3": { Figure: EchoPaths, tone: "mint" },
  "mehanicheskie-volny:t5": { Figure: Crests, tone: "mint" },
  "gazovye-zakony:t3": { Figure: Isochores, tone: "sand", caption: "При температуре T* давление на первой изохоре втрое выше. При той же температуре и том же количестве газа давление выше у меньшего объёма." },
  "vnutrennyaya-energiya-i-rabota-gaza:t3": { Figure: GasWork, tone: "sand", caption: "Работу за весь ход поршня даёт выделенная трапеция." },
  "teplovoj-balans-i-fazovye-perehody:t6": { Figure: MeltEnergy, tone: "sand" },
  "potencial-i-rabota-polya:t3": { Figure: MidpointContributions, tone: "sand" },
  "soedineniya-provodnikov:t3": { Figure: BranchComparison },
  "sila-lorenca:t2": { Figure: LorentzDirections },
  "prelomlenie-i-polnoe-otrazhenie:t6": { Figure: GlassPath, tone: "mint" },
  "svet-i-otrazhenie:t6": { Figure: ShadowRays, tone: "sand" },
  "tonkie-linzy:t2": { Figure: VirtualImage, tone: "mint", caption: "Пунктир показывает продолжения лучей со стороны предмета." },
  "stroenie-atoma-i-postulaty-bora:t3": { Figure: PhotonTransitions },
  "radioaktivnost-i-poluraspad:t6": { Figure: DecayLedger },
  "yadernye-reakcii:t1": { Figure: NuclearLedger },
};

export function TrainerFigure({ task, phase, figureId = task.id, fallbackToQuestion = false }) {
  const definition = (phase === "solution" ? solutionFigures[figureId] : questionFigures[figureId])
    ?? (fallbackToQuestion ? questionFigures[figureId] : null);
  if (!definition) return null;
  const { Figure, caption, tone, props } = definition;
  return <figure className="trainer-task-figure" data-tone={tone} data-testid={`trainer-figure-${phase}`}>
    <Figure solved={phase === "solution"} graph={task.graph} {...props} />
    {caption && <figcaption>{caption}</figcaption>}
  </figure>;
}
