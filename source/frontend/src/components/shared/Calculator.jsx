import { useRef, useState } from "react";
import { Delete, X } from "lucide-react";
import { CalculatorDomainError, evaluate, formatResult } from "@/lib/calc";
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
const KEYBOARD_ACTIONS = {
  ".": ",", "*": "×", "/": "÷", "-": "−", "=": "eq", Enter: "eq",
  Backspace: "back", Delete: "back", c: "clear", C: "clear",
};
const INITIAL_STATE = { expr: "", out: "0", ans: 0, error: null };

function enterValue(state, value) {
  const { expr, ans } = state;
  if (value === "clear") return { ...INITIAL_STATE, ans };
  if (value === "back") {
    return { ...state, expr: expr.replace(/(sin\(|cos\(|tg\(|lg\(|√\(|Ans|×10\^|.)$/, ""), error: null };
  }
  if (value === "eq") {
    try {
      const result = evaluate(expr, ans);
      return { expr: "", ans: result, out: formatResult(result), error: null };
    } catch (error) {
      return { ...state, error: error instanceof CalculatorDomainError ? error.message : "Ошибка записи" };
    }
  }
  return { ...state, expr: expr === "" && OPS.has(value) ? `Ans${value}` : expr + value, error: null };
}

export function useCalculator() {
  const [state, setState] = useState(INITIAL_STATE);
  return { ...state, enter: value => setState(current => enterValue(current, value)) };
}

export function Calculator({ calculator, onClose, onKey, dialog = false }) {
  const { expr, out, error, enter } = calculator;
  const display = useRef(null);
  const press = value => {
    onKey?.();
    enter(value);
  };
  function keyDown(event) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.nativeEvent.isComposing) return;
    if (event.key === "Enter" && event.target.closest("button")) return;
    const value = /^[0-9+,()^eE×÷−]$/.test(event.key) ? event.key : KEYBOARD_ACTIONS[event.key];
    if (!value) return;
    event.preventDefault();
    display.current?.focus({ preventScroll: true });
    press(value);
  }

  const Title = dialog ? DialogTitle : CardTitle;
  const Description = dialog ? DialogDescription : "p";
  return (
    <Card className="calc ct-calculator" data-testid="ct-calculator-panel" onKeyDown={keyDown}>
      <CardHeader className="calc-head">
        <Title className="calc-title">Калькулятор</Title>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} className="calc-close" aria-label="Закрыть калькулятор" data-testid="ct-calculator-close"><X aria-hidden="true" /></Button>
      </CardHeader>
      <CardContent className="calc-content">
        <div ref={display} tabIndex={-1} className="calc-display" data-testid="ct-calculator-display">
          <div className="calc-expr">{expr ? <><span className="sr-only">Выражение: </span>{expr}</> : " "}</div>
          <output aria-label="Результат" className={`calc-out ${error ? "is-err" : ""}`}>{error ?? out}</output>
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
