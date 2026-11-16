export const RARITY = {
  common: { name: "Обычный", color: "#A9B6C9" },
  rare: { name: "Редкий", color: "#38BDF8" },
  epic: { name: "Эпический", color: "#B06CFF" },
  legendary: { name: "Легендарный", color: "#F5A524" },
};

export const RARITY_ORDER = ["common", "rare", "epic", "legendary"];

export const ARTIFACTS = [
  { id: "cradle", name: "Маятник Ньютона", rarity: "common", price: 150, anim: "swing", sfx: "tick", fact: "Удар передаётся через ряд шаров. Часть энергии уходит на звук и нагрев, поэтому качания постепенно затухают." },
  { id: "tuning", name: "Камертон", rarity: "common", price: 120, anim: "buzz", sfx: "tuning", fact: "Ля первой октавы, 440 колебаний в секунду. Ящик под ним — резонатор: без него звук еле слышно." },
  { id: "magnet", name: "Подкова-магнит", rarity: "common", price: 140, anim: "pulse", sfx: "pop", fact: "Опилки выстроились вдоль линий магнитного поля. Само поле не видно, а его форму — пожалуйста." },
  { id: "lava", name: "Лавовая лампа", rarity: "common", price: 150, anim: "glow", sfx: "chime", fact: "Воск снизу нагревается, расширяется и всплывает, наверху остывает и тонет. Конвекция в банке." },
  { id: "bird", name: "Пьющая птичка", rarity: "common", price: 180, anim: "tip", sfx: "pop", fact: "Вода испаряется с головы, голова остывает, пар внутри конденсируется — и жидкость ползёт вверх. Тепловой двигатель на столе." },
  { id: "radiometer", name: "Радиометр Крукса", rarity: "rare", price: 380, anim: "spin", sfx: "whoosh", fact: "Свет сильнее нагревает чёрные стороны лопастей. Из-за разности температур разреженный газ действует на лопасти и вращает их." },
  { id: "plasma", name: "Плазменный шар", rarity: "rare", price: 420, anim: "zap", sfx: "zap", fact: "Внутри разреженный газ и высокое напряжение. Поднеси ладонь — разряд потянется к ней." },
  { id: "gyro", name: "Гироскоп", rarity: "rare", price: 450, anim: "wobble", sfx: "whoosh", fact: "Если опереть быстро вращающийся гироскоп на один конец оси, она может начать поворачиваться вокруг вертикали. Это движение называют прецессией." },
  { id: "stirling", name: "Двигатель Стирлинга", rarity: "rare", price: 480, anim: "spin", sfx: "whoosh", fact: "Газ попеременно нагревается и охлаждается, меняя давление и двигая поршень. Для работы нужна разница температур." },
  { id: "prism", name: "Призма", rarity: "epic", price: 850, anim: "rainbow", sfx: "chime", fact: "Белый свет — смесь цветов. Фиолетовый преломляется сильнее красного, и луч раскрывается веером." },
  { id: "cloud", name: "Камера Вильсона", rarity: "epic", price: 900, anim: "glow", sfx: "chime", fact: "Пересыщенный пар конденсируется на ионах, оставленных заряженной частицей. Из капелек складывается видимый след." },
  { id: "levitron", name: "Левитрон", rarity: "epic", price: 950, anim: "float", sfx: "chime", fact: "Волчок висит над магнитным основанием только при подходящей массе и частоте вращения. Слишком медленное или слишком быстрое вращение нарушает устойчивость." },
  { id: "foucault", name: "Маятник Фуко", rarity: "epic", price: 1000, anim: "swing", sfx: "tick", fact: "Из-за вращения Земли плоскость качаний поворачивается относительно пола. Скорость поворота зависит от широты; на экваторе этого эффекта нет." },
  { id: "tesla", name: "Катушка Тесла", rarity: "epic", price: 1100, anim: "zap", sfx: "zap", fact: "Резонансный трансформатор: сотни тысяч вольт на выходе, а молнии — это пробой воздуха." },
  { id: "meteor", name: "Метеорит в банке", rarity: "epic", price: null, anim: "glow", sfx: "chime", how: "Выпадает только из капсулы", fact: "При пролёте через атмосферу поверхность камня оплавляется. Метеориты обычно не успевают сильно прогреться внутри." },
  { id: "train", name: "Игрушечная электричка", rarity: "legendary", price: null, anim: "drive", sfx: "whoosh", how: "Пройди урок «Равноускоренное движение»", fact: "При постоянном ускорении скорость меняется на одинаковую величину за каждую секунду. Во время торможения ускорение направлено против движения." },
  { id: "watch", name: "Балансирные часы", rarity: "legendary", price: null, anim: "spin", sfx: "tick", how: "Заверши любой полный вариант ЦТ", fact: "В этих часах ровный ритм задаёт колеблющийся баланс со спиралью." },
  { id: "shard", name: "Осколок тёмной материи", rarity: "legendary", price: null, anim: "float", sfx: "chime", how: "Занимайся 7 дней подряд", fact: "Вымышленная находка. В физике о тёмной материи судят по её гравитационному влиянию; её состав пока неизвестен." },
  { id: "quark", name: "Кварковая сфера", rarity: "legendary", price: null, anim: "pulse", sfx: "chime", how: "Открой свою первую капсулу", voice: "quirk", fact: "Кварки здесь изображены условно. Их «цвет» обозначает заряд сильного взаимодействия, а не окраску частицы." },
];

export const ART_BY_ID = Object.fromEntries(ARTIFACTS.map((a) => [a.id, a]));
const artDirectory = "/art/objects-transparent-20261107";
export const artImg = (id) => `${artDirectory}/${id}.webp`;
export const artThumbnail = (id, width) => `${artDirectory}/thumbs/${id}-${width}.webp`;

export const ARTIFACT_LESSONS = {
  cradle: { slug: "impuls-i-stolknoveniya", label: "Разобрать столкновения" },
  tuning: { slug: "mehanicheskie-volny", label: "Откуда берётся звук" },
  magnet: { slug: "magnitnoe-pole-i-sila-ampera", label: "К уроку о магнитном поле" },
  bird: { slug: "pervyj-zakon-i-teplovye-dvigateli", label: "Как работают тепловые двигатели" },
  stirling: { slug: "pervyj-zakon-i-teplovye-dvigateli", label: "Как работают тепловые двигатели" },
  prism: { slug: "prelomlenie-i-polnoe-otrazhenie", label: "Разобрать преломление света" },
  cloud: { slug: "radioaktivnost-i-poluraspad", label: "К уроку о радиоактивности" },
  train: { slug: "ravnouskorennoe-dvizhenie", label: "Разобрать разгон и торможение" },
  watch: { slug: "mehanicheskie-kolebaniya", label: "К уроку о колебаниях" },
};
