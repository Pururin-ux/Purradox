import { useState } from "react";
import { Delete, X } from "lucide-react";
import { evaluate, formatResult } from "@/lib/calc";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";

const KEYS = [
  ["sin", "sin("], ["cos", "cos("], ["tg", "tg("], ["√", "√("], ["x²", "^2"],
  ["xʸ", "^"], ["(", "("], [")", ")"], ["×10ˣ", "×10^"], ["π", "π"],
  ["7", "7"], ["8", "8"], ["9", "9"], ["⌫", "back"], ["C", "clear"],
  ["4", "4"], ["5", "5"], ["6", "6"], ["×", "×"], ["÷", "÷"],
  ["1", "1"], ["2", "2"], ["3", "3"], ["+", "+"], ["−", "−"],
  ["0", "0"], [",", ","], ["lg", "lg("], ["Ans", "Ans"], ["=", "eq"],
];
const OPS = new Set(["×", "÷", "+", "−", "^", "^2", "×10^"]);
const keyId = (label) => ({ "√": "sqrt", "x²": "sq", "xʸ": "pow", "×10ˣ": "exp", "π": "pi", "⌫": "back", "×": "mul", "÷": "div", "+": "plus", "−": "minus", ",": "comma", "=": "eq", "(": "lp", ")": "rp" }[label] || label.toLowerCase());

export function Calculator({ onClose, onKey, dialog = false }) {
  const [expr, setExpr] = useState("");
  const [out, setOut] = useState("0");
  const [ans, setAns] = useState(0);
  const [err, setErr] = useState(false);

  const press = (value) => {
    onKey?.();
    setErr(false);
    if (value === "clear") {
      setExpr("");
      setOut("0");
      return;
    }
    if (value === "back") {
      setExpr((e) => e.replace(/(sin\(|cos\(|tg\(|lg\(|√\(|Ans|×10\^|.)$/, ""));
      return;
    }
    if (value === "eq") {
      try {
        const v = evaluate(expr, ans);
        setAns(v);
        setOut(formatResult(v));
        setExpr("");
      } catch (e) {
        setErr(true);
      }
      return;
    }
    setExpr((e) => (e === "" && OPS.has(value) ? `Ans${value}` : e + value));
  };

  const Title = dialog ? DialogTitle : CardTitle;
  const Description = dialog ? DialogDescription : "p";
  return (
    <Card className="calc ct-calculator" data-testid="ct-calculator-panel">
      <CardHeader className="calc-head">
        <Title className="calc-title">Калькулятор</Title>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} className="calc-close" aria-label="Закрыть калькулятор" data-testid="ct-calculator-close"><X aria-hidden="true" /></Button>
      </CardHeader>
      <CardContent className="calc-content">
        <div className="calc-display" data-testid="ct-calculator-display">
          <div className="calc-expr" aria-label="Выражение">{expr || " "}</div>
          <output aria-live="polite" className={`calc-out ${err ? "is-err" : ""}`}>{err ? "Ошибка записи" : out}</output>
        </div>
        <div className="calc-keys">
        {KEYS.map(([label, value]) => (
          <Button
            key={label}
            type="button"
            variant="secondary"
            onClick={() => press(value)}
            className={`calc-key ${OPS.has(value) ? "op" : ""} ${value === "eq" ? "eq" : ""} ${/^[a-zа-я√]/i.test(label) && label.length > 1 ? "fn" : ""}`}
            aria-label={value === "back" ? "Удалить последний символ" : value === "clear" ? "Очистить" : value === "eq" ? "Вычислить" : label}
            data-testid={`calc-key-${keyId(label)}`}
          >
            {value === "back" ? <Delete aria-hidden="true" /> : label}
          </Button>
        ))}
        </div>
      </CardContent>
      <CardFooter className="calc-foot"><Description>Углы в градусах.</Description></CardFooter>
    </Card>
  );
}
