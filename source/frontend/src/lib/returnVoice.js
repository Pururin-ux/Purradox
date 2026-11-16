export const CAT_NAME = "Мефистофель";
const DAY = 24 * 60 * 60 * 1000;

function dayWord(days) {
  const lastTwo = days % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return "дней";
  return days % 10 === 1 ? "день" : days % 10 >= 2 && days % 10 <= 4 ? "дня" : "дней";
}

export function returnVoice({ savedAt, results = {}, now = Date.now() } = {}) {
  const elapsed = Number.isFinite(savedAt) && savedAt > 0 && now >= savedAt ? now - savedAt : 0;
  const days = Math.floor(elapsed / DAY);
  if (days >= 3) return {
    state: "aged-draft",
    text: `${CAT_NAME} караулит закладку уже ${days} ${dayWord(days)}.`,
  };
  // Distinct saved mistakes, not an invented chronological failure streak.
  if (Object.values(results ?? {}).filter((result) => result?.correct === false).length >= 2) return {
    state: "several-errors",
    text: "Давай начнём с того, что известно из условия.",
  };
  return {
    state: "return",
    text: "Ну что, продолжим?",
  };
}
