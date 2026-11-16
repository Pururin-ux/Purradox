export const fmt = (n, d = 1) => String(Number(n.toFixed(d))).replace(".", ",").replace("-", "−");

export const formatJoules = (j) => {
  if (j < 1000) return `${j} Дж`;
  if (j < 1e6) return `${fmt(j / 1000, 2)} кДж`;
  return `${fmt(j / 1e6, 2)} МДж`;
};

export const clock = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

export const partOfDay = () => {
  const h = new Date().getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 18) return "day";
  if (h < 23) return "evening";
  return "night";
};

export const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const plural = (n, one, few, many) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

export const answerText = (task, value) => {
  if (value === undefined || value === null || value === "" || (Array.isArray(value) && !value.length)) return "—";
  if (Array.isArray(value)) return value.join(", ");
  return String(value).replace("-", "−");
};

export const answerLabel = (task, a) => (Array.isArray(a) ? a.join(", ") : task.kind === "number" ? `${a} ${task.unit}` : String(a));

export const WEEK = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
export const todayIndex = () => (new Date().getDay() + 6) % 7;
