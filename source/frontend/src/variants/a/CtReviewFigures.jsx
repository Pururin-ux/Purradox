const ink = "#514365", plum = "#674487", teal = "#286b66", rust = "#935026";
const paper = "#fff9ed", lilac = "#e6d8f1", gold = "#f6deb5", mint = "#d1e8d8";

function Arrow({ from, to, color = plum, dashed }) {
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]) * 180 / Math.PI;
  return <g fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={`M${from.join(" ")}L${to.join(" ")}`} strokeDasharray={dashed ? "5 4" : undefined} />
    <path d="M-7 -4L0 0L-7 4" transform={`translate(${to.join(" ")}) rotate(${angle})`} />
  </g>;
}
function Plate({ height, label, children }) {
  return <svg viewBox={`0 0 288 ${height}`} className="ct-diagram" role="img" aria-label={label}>{children}</svg>;
}

function Mirror() {
  return <Plate height={164} label="Зеркало и нормаль. Два луча по 60 градусов от нормали; между одним лучом и зеркалом 30 градусов.">
    <path d="M144 134L53 82A105 105 0 0 1 235 82Z" fill={gold} opacity=".64" />
    <path d="M20 134H268" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    <path d="M144 134V19" stroke={ink} strokeDasharray="4 4" />
    <path d="M112 116A37 37 0 0 1 144 97A37 37 0 0 1 176 116" fill="none" stroke={rust} strokeWidth="2" />
    <Arrow from={[27,67]} to={[144,134]} /><Arrow from={[144,134]} to={[261,67]} color={teal} />
    <text x="152" y="22">нормаль</text>
    <text x="102" y="89" textAnchor="middle" fill={rust}>60°</text>
    <text x="186" y="89" textAnchor="middle" fill={rust}>60°</text>
    <text x="212" y="124" fill={teal}>30°</text>
    <text x="24" y="155">зеркало</text>
  </Plate>;
}

function Piston() {
  const dots = [[18,0],[31,1],[53,0],[72,1],[24,2],[45,2],[61,3],[79,2]];
  return <Plate height={148} label="Два цилиндра с одной порцией газа при одной температуре. Высота газа в первом 69 условных единиц, во втором 23. Давления p и 3p.">
    {[{x:14, height:69, text:"V, p"},{x:180, height:23, text:"V/3, 3p"}].map(({x,height,text}) => {
      const top = 114 - height;
      return <g key={x} transform={`translate(${x} 0)`}>
        <rect x="5" y={top} width="89" height={height} fill={gold} rx="3" />
        <path d="M4 35V114H95V35" fill="none" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
        <path d={`M9 ${top-3}H90M49 ${top-3}v-13`} stroke={plum} strokeWidth="7" strokeLinecap="round" />
        {dots.map(([dx, i]) => <circle key={dx} cx={dx} cy={top + 4 + i*(height-8)/3} r="2.6" fill={rust} />)}
        <text x="49" y="138" textAnchor="middle">{text}</text>
      </g>;
    })}
    <Arrow from={[126,82]} to={[163,82]} color={rust} />
  </Plate>;
}

function Friction() {
  return <Plate height={151} label="Тяга 10 ньютонов вправо, трение 6 ньютонов влево. Равнодействующая направлена вправо.">
    <rect x="14" y="107" width="260" height="13" rx="6" fill={gold} />
    <path d="M18 107H270" stroke={rust} strokeWidth="2" />
    <rect x="119" y="56" width="55" height="50" rx="9" fill={lilac} stroke={plum} strokeWidth="2" />
    <path d="M130 65h21m-20 8h13" stroke={paper} strokeWidth="4" strokeLinecap="round" />
    <Arrow from={[147,82]} to={[87,82]} color={rust} />
    <Arrow from={[147,82]} to={[247,82]} color={teal} />
    <text x="87" y="59" textAnchor="middle" fill={rust}>6 Н</text>
    <text x="230" y="59" textAnchor="middle" fill={teal}>10 Н</text>
    <text x="147" y="144" textAnchor="middle">Сила вдоль стола: 4 Н вправо</text>
  </Plate>;
}

function Lens({ distance, image, focal }) {
  const start = 27, end = 261, axis = 86, unit = (end-start) / (distance + image);
  const x = start + unit * distance, f1 = x - unit * focal, f2 = x + unit * focal;
  const h = 24, y = axis + h * image / distance;
  return <Plate height={194} label="Луч через центр линзы идёт прямо. Параллельный оси луч после линзы проходит через фокус. Их пересечение показывает верхнюю точку перевёрнутого изображения.">
    <path d="M16 86H272" stroke={ink} strokeWidth="1.3" />
    <path d={`M${x} 26Q${x-14} 86 ${x} 155Q${x+14} 86 ${x} 26Z`} stroke={teal} strokeWidth="1.3" fill={mint} fillOpacity=".62" />
    <path d={`M${end} 50V185`} stroke={ink} strokeWidth="3" strokeLinecap="round" opacity=".36" />
    <path d={`M${start} ${axis-h}H${x}L${end} ${y}`} stroke={rust} strokeWidth="2.3" fill="none" />
    <path d={`M${start} ${axis-h}L${end} ${y}`} stroke={teal} strokeWidth="2" fill="none" />
    <circle cx={f1} cy={axis} r="3.3" fill={ink} /><circle cx={f2} cy={axis} r="3.3" fill={ink} />
    <Arrow from={[start,axis]} to={[start,axis-h]} /><Arrow from={[end,axis]} to={[end,y]} />
    <text x={f2} y="77" textAnchor="middle">F</text>
    <text x="17" y="46">предмет</text>
    <text x="271" y="37" textAnchor="end">экран</text>
  </Plate>;
}

function Route() {
  return <Plate height={146} label="По прямой от минус двух до семи пройдено 9 метров. На обратном пути от семи до трёх пройдено 4 метра.">
    <path d="M18 80H269" stroke={ink} opacity=".55" strokeWidth="1.2" />
    <Arrow from={[36,42]} to={[252,42]} />
    <Arrow from={[252,68]} to={[156,68]} color={teal} />
    {[[36,"−2"],[156,"3"],[252,"7"]].map(([x,n]) => <g key={x}>
      <path d={`M${x} 78v12`} stroke={ink} strokeWidth="2" />
      <text x={x} y="111" textAnchor="middle">{n}</text>
    </g>)}
    <text x="139" y="28" textAnchor="middle" fill={plum}>9 м</text>
    <text x="204" y="62" textAnchor="middle" fill={teal}>4 м</text>
    <text x="273" y="124" textAnchor="end">x, м</text>
  </Plate>;
}

function Horizontal() {
  return <Plate height={175} label="Горизонтальный бросок: 48 метров по горизонтали за 4 секунды; вертикальное падение составляет 80 метров.">
    <path d="M31 140H268" stroke={ink} strokeWidth="2" opacity=".6" />
    <path d="M39 138V28H53" fill="none" stroke={ink} strokeWidth="3" />
    <path d="M53 28Q155 28 245 140" stroke={plum} strokeWidth="2.6" fill="none" />
    <path d="M53 32V140M245 140V153" stroke={ink} strokeDasharray="4 4" />
    <circle cx="53" cy="28" r="5" fill={rust} />
    <Arrow from={[62,23]} to={[155,23]} color={teal} />
    <text x="161" y="26" fill={teal}>12 м/с</text>
    <text x="69" y="112">80 м</text>
    <text x="149" y="163" textAnchor="middle">48 м</text>
  </Plate>;
}

function Overtake() {
  function Train({ end, y, length, color }) {
    return <g transform={`translate(${end-length} ${y})`}>
      <path d={`M2 0H${length-9}L${length} 9V21H2Z`} fill={color} />
      <path d={`M10 6H${length-12}`} stroke={paper} strokeWidth="3" strokeLinecap="round" />
    </g>;
  }
  return <Plate height={199} label="Медленный поезд длиной 180 метров остаётся на месте. Сначала передняя часть быстрого у хвоста медленного, в конце хвост быстрого у головы медленного.">
    <text x="16" y="21">Начало</text><text x="16" y="106">Конец</text>
    <path d="M16 72H271M16 156H271M91 50V163M199 50V163" stroke={ink} strokeWidth="1.2" strokeDasharray="4 4" opacity=".65" />
    <Train end={91} y={44} length={72} color={plum} /><Train end={199} y={44} length={108} color={teal} />
    <Train end={199} y={128} length={108} color={teal} /><Train end={271} y={128} length={72} color={plum} />
    <Arrow from={[91,179]} to={[271,179]} color={rust} />
    <text x="180" y="173" textAnchor="middle" fill={rust}>120 + 180 м</text>
  </Plate>;
}

function Compression() {
  return <Plate height={166} label="На графике давления от объёма давление 200 килопаскалей, стрелка идёт влево от 8 до 5 литров.">
    <rect x="145" y="49" width="95" height="76" rx="3" fill={gold} />
    <path d="M53 24V125H262M145 48V125M240 48V125" fill="none" stroke={ink} strokeWidth="1.3" />
    <Arrow from={[240,49]} to={[145,49]} color={rust} />
    <text x="53" y="24">p, кПа</text>
    <text x="41" y="54" textAnchor="end">200</text>
    <text x="145" y="145" textAnchor="middle">5</text>
    <text x="240" y="145" textAnchor="middle">8</text>
    <text x="271" y="161" textAnchor="end">V, л</text>
    <text x="192" y="91" textAnchor="middle" fill={rust}>−600 Дж</text>
  </Plate>;
}

function Drop() {
  return <Plate height={158} label="Вектор поля направлен вниз. У отрицательно заряженной капли электрическая сила вверх, тяжесть вниз.">
    {[37,74,216,253].map(x => <Arrow key={x} from={[x,28]} to={[x,143]} color={teal} dashed />)}
    <path d="M146 51C138 67 129 77 129 88A17 17 0 0 0 163 88C163 77 153 65 146 51Z" fill={lilac} stroke={plum} strokeWidth="2" />
    <text x="146" y="96" textAnchor="middle">−</text>
    <Arrow from={[146,55]} to={[146,16]} /><Arrow from={[146,108]} to={[146,147]} color={rust} />
    <text x="159" y="28" fill={plum}>Fэл</text>
    <text x="159" y="148" fill={rust}>mg</text>
    <text x="24" y="23" fill={teal}>E</text>
  </Plate>;
}

function Lorentz() {
  return <Plate height={159} label="Скорость составляет 30 градусов с полем. Составляющая, перпендикулярная полю, равна v sin 30 градусов.">
    <path d="M30 124H270" stroke={ink} strokeDasharray="4 4" />
    <Arrow from={[30,124]} to={[203,124]} color={teal} />
    <path d="M203 24V124" stroke={rust} strokeDasharray="4 4" />
    <path d="M87 124A57 57 0 0 0 79 95" stroke={ink} strokeWidth="1.4" fill="none" />
    <Arrow from={[30,124]} to={[203,24]} />
    <Arrow from={[203,124]} to={[203,24]} color={rust} />
    <text x="96" y="110">30°</text>
    <text x="127" y="53" fill={plum}>v</text>
    <text x="215" y="75" fill={rust}>v⊥</text>
    <text x="200" y="147" textAnchor="end" fill={teal}>v∥</text>
    <text x="267" y="147" textAnchor="end">вдоль B</text>
  </Plate>;
}

function Walk() {
  return <Plate height={181} label="Путь 3 километра на юг и 4 на запад. Перемещение длиной 5 километров направлено в юго-западную четверть.">
    <path d="M218 32V146H66Z" fill={gold} opacity=".62" />
    <path d="M218 132H204V146" stroke={rust} fill="none" />
    <Arrow from={[218,32]} to={[218,146]} /><Arrow from={[218,146]} to={[66,146]} />
    <Arrow from={[218,32]} to={[66,146]} color={teal} dashed />
    <circle cx="218" cy="32" r="4" fill={ink} />
    <text x="217" y="20" textAnchor="middle">Старт</text>
    <text x="232" y="101">3 км</text>
    <text x="148" y="170" textAnchor="middle">4 км</text>
    <text x="138" y="83" textAnchor="middle" fill={teal}>5 км</text>
  </Plate>;
}

function SelectorCircuit({ mode = "branch" }) {
  return <Plate height={181} label={mode === "branch" ? "Верхняя лампа отключена. Нижняя лампа соединена с двумя клеммами источника." :
    "Два сопротивления по шесть ом. Слева они включены друг за другом, справа по отдельным ветвям."}>
    {mode === "branch" ? <>
      <path d="M142 150H26V47H85M104 47H262V150H156M26 99H129M159 99H262" stroke={ink} strokeWidth="2" fill="none" />
      <path d="M129 47h30m-74 0 18-14m39 117v-14m0 14v14m14-24v20" stroke={ink} strokeWidth="2" fill="none" />
      <circle cx="144" cy="47" r="15" fill={lilac} stroke={ink} /><circle cx="144" cy="99" r="15" fill={gold} stroke={rust} />
      <path d="M134 37l20 20m0-20-20 20m0 32 20 20m0-20-20 20" stroke={ink} strokeWidth="1.5" />
      <path d="M26 99H129M159 99H262" stroke={teal} strokeWidth="2.8" />
      <text x="14" y="24">Разрыв</text><text x="144" y="130" textAnchor="middle" fill={teal}>U = U источника</text>
    </> : <>
      <text x="69" y="21" textAnchor="middle">По цепочке</text><text x="217" y="21" textAnchor="middle">Две ветви</text>
      <path d="M17 103V49H119V103M156 103V49H276V103M156 83H276" stroke={ink} strokeWidth="1.8" fill="none" />
      {[[31,49],[77,49],[197,49],[197,83]].map(([x,y]) => <g key={x+":"+y}>
        <rect x={x} y={y-9} width="31" height="18" rx="3" fill={paper} stroke={plum} strokeWidth="1.6" />
        <text x={x+16} y={y+5} textAnchor="middle">6</text>
      </g>)}
      <text x="68" y="132" textAnchor="middle">12 Ом</text><text x="216" y="132" textAnchor="middle">3 Ом</text>
      <text x="68" y="157" textAnchor="middle" fill={rust}>12 Вт</text><text x="216" y="157" textAnchor="middle" fill={teal}>48 Вт</text>
    </>}
  </Plate>;
}

function Rails() {
  const slices = [{ y:38, left:125, right:185, label:"9 мм" }, { y:105, left:141, right:161, label:"3 мм" }];
  return <Plate height={161} label="Рельсы удлиняются к зазору с двух сторон: слева на 2,4 миллиметра, справа на 3,6. Зазор сужается с 9 до 3 миллиметров.">
    {slices.map(({y,left,right,label}, i) => <g key={y}>
      <path d={`M15 ${y}H${left}v15H15ZM${right} ${y}H272v15H${right}Z`} fill={i ? plum : lilac} />
      <path d={`M${left} ${y-8}v31M${right} ${y-8}v31`} stroke={ink} strokeDasharray="3 3" />
      <text x={(left+right)/2} y={y-13} textAnchor="middle">{label}</text>
    </g>)}
    <Arrow from={[86,139]} to={[139,139]} color={rust} /><Arrow from={[218,139]} to={[163,139]} color={teal} />
    <text x="69" y="153" textAnchor="middle" fill={rust}>2,4 мм</text><text x="234" y="153" textAnchor="middle" fill={teal}>3,6 мм</text>
  </Plate>;
}

function Ice() {
  return <div className="ct-ice" role="img" aria-label="Из 60 граммов льда 50 растаяли, осталось 10. Каждая из шести клеток означает 10 граммов.">
    <p>60 г льда при 0 °C</p>
    <div aria-hidden="true">{Array.from({ length:6 }, (_, i) => <span key={i} data-melted={i < 5 || undefined} />)}</div>
    <dl><div><dt>Растаяло</dt><dd>50 г</dd></div><div><dt>Осталось</dt><dd>10 г</dd></div></dl>
  </div>;
}

function Decay() {
  return <ol className="ct-decay" aria-label="Число ядер через каждые восемь суток">
    {[[800,"Начало"],[400,"8 сут"],[200,"16 сут"],[100,"24 сут"]].map(([n,t]) => <li key={n}>
      <span>{t}</span><strong>{n}</strong><i aria-hidden="true" style={{ "--remaining":`${n/8}%` }} />
    </li>)}
  </ol>;
}

function Stages() {
  return <dl className="ct-gas-stages">
    {[
      ["До сжатия","4 л, 300 К","120 кПа"],
      ["После сжатия","2 л, 300 К","240 кПа"],
      ["После нагрева","2 л, 450 К","360 кПа"],
    ].map(([event, params, pressure]) => <div key={event}>
      <dt>{event}</dt><dd>{params}</dd><dd>{pressure}</dd>
    </div>)}
  </dl>;
}

function Sled() {
  return <Plate height={163} label="На вершине склона 200 джоулей потенциальной энергии. К концу спуска остаётся 90 джоулей кинетической. Потеря механической энергии 110 джоулей.">
    <path d="M16 60H60Q83 60 109 81Q175 126 227 128H276V160H16Z" fill={lilac} />
    <path d="M16 60H60Q83 60 109 81Q175 126 227 128H276" fill="none" stroke={plum} strokeWidth="2.4" />
    <path d="M40 49c0 4 4 6 8 6h24m120 58c1 4 5 6 8 7l24 2" fill="none" stroke={rust} strokeWidth="3" strokeLinecap="round" />
    <text x="23" y="32" fill={plum}>200 Дж</text>
    <text x="260" y="103" textAnchor="end" fill={teal}>90 Дж</text>
    <text x="143" y="148" textAnchor="middle">Работа трения: −110 Дж</text>
  </Plate>;
}

const figures = {
  piston: [Piston, "Точки обозначают одну и ту же порцию газа. После сжатия она занимает треть прежнего объёма.", "sand"],
  mirror: [Mirror, "Угол между лучами складывается из двух углов по 60°.", "sand"],
  friction: [Friction, "По вертикали тяжесть и опора уравновешены. На схеме оставлены силы, которые меняют скорость вдоль стола.", "sand"],
  "lens-demo": [() => <Lens distance={30} image={60} focal={20} />, "Два луча от верхушки предмета сходятся в 60 см за линзой.", "mint"],
  "lens-01": [() => <Lens distance={20} image={80} focal={16} />, "До линзы 20 см, после неё 80 см. Эти два отрезка вместе дают 100 см.", "mint"],
  "lens-03": [() => <Lens distance={40/3} image={40} focal={10} />, "Изображение втрое выше предмета. Отрезок от линзы до экрана тоже втрое длиннее.", "mint"],
  "decay-demo": [Decay, "Отсчёт начинается с 800. До 100 проходят три интервала по 8 суток."],
  route: [Route, "Отметь место разворота. Точка проходит оба отрезка, даже если второй направлен обратно."],
  horizontal: [Horizontal, "Траектория показана без масштаба. Оба перемещения происходят одновременно."],
  overtake: [Overtake, "В системе медленного поезда весь обгон занимает 300 м.", "mint"],
  compression: [Compression, "Стрелка идёт от большего объёма к меньшему. Поэтому работа газа отрицательная.", "sand"],
  drop: [Drop, "Стрелки поля смотрят вниз. Отрицательный заряд испытывает силу в обратную сторону.", "mint"],
  lorentz: [Lorentz, "Составляющая вдоль поля уносит частицу вперёд. Поперечная задаёт радиус витка.", "mint"],
  walk: [Walk, "Сплошными стрелками показан путь, пунктиром — прямой отрезок от старта."],
  branch: [SelectorCircuit, "Разрыв не затронул провода, ведущие к нижней лампе.", "mint"],
  sled: [Sled, "Разница между энергиями внизу и наверху со знаком минус.", "sand"],
  rails: [Rails, "Торцы сближаются с двух сторон. Масштаб зазора условный."],
  states: [Stages, "Чтобы восстановить начальное давление, читай снизу вверх."],
  ice: [Ice, "Каждый кусочек отвечает за 10 г. Вода успела растопить пять из шести.", "mint"],
  resistors: [() => <SelectorCircuit mode="resistors" />, "Напряжение на выводах обеих цепей одинаковое: 12 В.", "mint"],
};

export function CtReviewFigure({ name }) {
  const definition = figures[name];
  if (!definition) return null;
  const [Figure, caption, tone] = definition;
  return <figure className="ct-review-figure" data-tone={tone} data-testid={`ct-figure-${name}`}>
    <Figure />
    <figcaption>{caption}</figcaption>
  </figure>;
}
