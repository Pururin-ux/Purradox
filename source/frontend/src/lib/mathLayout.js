export function splitMathStatements(tex) {
  const original = [{ tex, separator: "" }];
  if (!tex || /\\(?:begin|end|left|right)\b|\\[{}]/.test(tex)) return original;

  const parts = [];
  const groups = [];
  const pairs = { "}": "{", ")": "(", "]": "[" };
  let start = 0;
  let hasEquality = false;

  for (let i = 0; i < tex.length; i++) {
    let slashes = 0;
    for (let j = i - 1; j >= 0 && tex[j] === "\\"; j--) slashes++;
    if (slashes % 2) continue;

    const char = tex[i];
    if ("{([".includes(char)) groups.push(char);
    else if (pairs[char]) {
      if (groups.pop() !== pairs[char]) return original;
    } else if (groups.length === 0) {
      if (char === "=") hasEquality = true;
      if (char === "," || char === ";") {
        const separator = tex.slice(i).match(/^[,;]\s*\\(?:qquad|quad)(?![A-Za-z])\s*/)?.[0];
        if (!separator) continue;
        if (!hasEquality || !tex.slice(start, i).trim()) return original;
        parts.push({ tex: tex.slice(start, i), separator });
        start = i + separator.length;
        i = start - 1;
        hasEquality = false;
      }
    }
  }

  if (!parts.length || groups.length || !hasEquality || !tex.slice(start).trim()) return original;
  parts.push({ tex: tex.slice(start), separator: "" });
  return parts;
}
