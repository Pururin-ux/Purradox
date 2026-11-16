export const FIRST_LESSON = "ravnouskorennoe-dvizhenie";
export const canonicalTaskId = id => /^t(?:[1-9]|10)$/.test(id) ? FIRST_LESSON + ":" + id : id;
export const canonicalQuizId = id => /^q[1-5]$/.test(id) ? FIRST_LESSON + ":" + id : id;
export const canonicalProgressId = id => id.startsWith("quiz:") ? "quiz:" + canonicalQuizId(id.slice(5)) : canonicalTaskId(id);
