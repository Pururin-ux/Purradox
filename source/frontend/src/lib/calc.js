export class CalculatorDomainError extends Error {}

const radians = degrees => (degrees * Math.PI) / 180;

function tangent(degrees) {
  const angle = degrees % 180;
  if (Math.abs(angle) === 90) throw new CalculatorDomainError("Тангенс не определён для этого угла");
  return Math.tan(radians(angle));
}

const FN = {
  sin: (d) => d % 180 === 0 ? 0 : Math.sin(radians(d % 360)),
  cos: (d) => Math.abs(d % 180) === 90 ? 0 : Math.cos(radians(d % 360)),
  tg: tangent,
  tan: tangent,
  lg: Math.log10,
  "√": Math.sqrt,
};
const NAMES = Object.keys(FN);

export function evaluate(input, ans = 0) {
  const s = input
    .replace(/\s/g, "")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/,/g, ".");
  let i = 0;
  const eat = (c) => {
    if (s[i] === c) {
      i += 1;
      return true;
    }
    return false;
  };
  const startsPrimary = () => s[i] === "(" || s[i] === "π" || s.startsWith("Ans", i)
    || NAMES.some((f) => s.startsWith(f, i));

  function group() {
    const v = expr();
    eat(")");
    return v;
  }
  function primary() {
    if (eat("(")) return group();
    if (eat("π")) return Math.PI;
    if (s.startsWith("Ans", i)) {
      i += 3;
      return ans;
    }
    const fn = NAMES.find((f) => s.startsWith(f, i));
    if (fn) {
      i += fn.length;
      return FN[fn](eat("(") ? group() : unary());
    }
    const m = /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i.exec(s.slice(i));
    if (!m) throw new Error("syntax");
    i += m[0].length;
    return Number(m[0]);
  }
  function power() {
    const b = primary();
    if (eat("^")) return Math.pow(b, unary());
    return b;
  }
  function unary() {
    if (eat("-")) return -unary();
    if (eat("+")) return unary();
    return power();
  }
  function term() {
    let v = unary();
    for (;;) {
      if (eat("*")) v *= unary();
      else if (eat("/")) v /= unary();
      else if (startsPrimary()) v *= unary();
      else return v;
    }
  }
  function expr() {
    let v = term();
    for (;;) {
      if (eat("+")) v += term();
      else if (eat("-")) v -= term();
      else return v;
    }
  }
  const v = expr();
  if (i !== s.length || !Number.isFinite(v)) throw new Error("syntax");
  return v;
}

export function formatResult(v) {
  const a = Math.abs(v);
  const str = a !== 0 && (a >= 1e10 || a < 1e-6) ? v.toExponential(6) : String(parseFloat(v.toPrecision(10)));
  return str.replace(".", ",").replace(/-/g, "−");
}
