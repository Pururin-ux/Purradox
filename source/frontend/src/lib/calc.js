const FN = {
  sin: (d) => Math.sin((d * Math.PI) / 180),
  cos: (d) => Math.cos((d * Math.PI) / 180),
  tg: (d) => Math.tan((d * Math.PI) / 180),
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
    .replace(/,/g, ".")
    .replace(/Ans/g, `(${ans})`);
  let i = 0;
  const eat = (c) => {
    if (s[i] === c) {
      i += 1;
      return true;
    }
    return false;
  };
  const startsPrimary = () => s[i] === "(" || s.startsWith("π", i) || NAMES.some((f) => s.startsWith(f, i));

  function group() {
    const v = expr();
    eat(")");
    return v;
  }
  function primary() {
    if (eat("(")) return group();
    if (s.startsWith("π", i)) {
      i += 1;
      return Math.PI;
    }
    const fn = NAMES.find((f) => s.startsWith(f, i));
    if (fn) {
      i += fn.length;
      return FN[fn](eat("(") ? group() : unary());
    }
    const m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
    if (!m) throw new Error("syntax");
    i += m[0].length;
    return parseFloat(m[0]);
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
  return str.replace(".", ",").replace("-", "−");
}
