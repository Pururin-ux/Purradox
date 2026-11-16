import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Equation, Rich } from "@/components/shared/Tex";
import { useAnswer } from "@/components/shared/useAnswer";
import { useSfx, haptic } from "@/lib/sound";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AnswerSign({ value, inputRef, onValueChange, disabled, testId }) {
  const negative = /^[−-]/.test(value);
  const toggle = () => onValueChange(negative ? value.slice(1) : "-" + value.replace(/^\+/, ""));
  return <Button type="button" variant="secondary" className="answer-sign" aria-label="Минус в ответе" aria-pressed={negative}
    disabled={disabled} data-testid={testId}
    onPointerDown={event => { if (event.currentTarget.ownerDocument.activeElement === inputRef.current) event.preventDefault(); }}
    onClick={toggle}><span aria-hidden="true">±</span></Button>;
}

export function AnswerA({ item, check, onResult, tid, draft, onDraftChange, initialResult }) {
  const s = useAnswer(item, check, { draft, onDraftChange, initialResult });
  const play = useSfx();
  const numberInput = useRef(null);

  const submit = async () => {
    const r = await s.submit();
    if (!r) return;
    play(r.correct ? "ok" : "bad");
    haptic(r.correct ? 18 : [30, 50, 30]);
    onResult?.(r);
  };

  const inputState = s.result ? (s.result.correct ? "is-right" : "is-wrong") : "";
  const numericValue = s.input.trim();
  const signFits = numericValue.length < 32 || /^[+−-]/.test(numericValue);

  return (
    <div className="space-y-3">
      {s.isNum ? (
        <div className="flex items-center gap-3">
          <Input
            ref={numberInput}
            className={`a-input h-auto min-w-0 max-w-[220px] ${inputState}`}
            inputMode="decimal"
            aria-label="Ответ"
            placeholder="Ответ"
            value={s.input}
            onChange={(e) => s.setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            disabled={s.busy || !!s.result}
            data-testid={`${tid}-input`}
          />
          {item.unit && <span className="a-answer-unit fm t2 shrink-0 whitespace-nowrap text-lg font-bold">{item.unit}</span>}
          {!s.result && <AnswerSign value={numericValue} inputRef={numberInput} disabled={s.busy || !signFits}
            onValueChange={s.setInput} testId={`${tid}-sign`} />}
        </div>
      ) : (
        <div className="grid gap-2.5">
          {s.multi && <p className="a-tag">Можно выбрать несколько</p>}
          {item.options.map((o, i) => (
            <Button
              key={o}
              type="button"
              variant="ghost"
              disabled={s.busy || !!s.result}
              className="a-opt h-auto justify-start whitespace-normal text-left"
              data-state={s.optionState(i + 1)}
              aria-pressed={s.multi ? s.choice.includes(i + 1) : s.choice === i + 1}
              onClick={() => { play("tap"); s.pick(i + 1); }}
              data-testid={`${tid}-opt-${i + 1}`}
            >
              <span className="num">{i + 1}</span>
              <Rich text={o} />
            </Button>
          ))}
        </div>
      )}
      {s.error && <p role="alert" className="text-sm font-semibold text-[var(--bad)]" data-testid={`${tid}-error`}>
        {s.error === "version" ? "Задание обновилось. Перезагрузи страницу перед проверкой." : "Не удалось проверить ответ. Попробуй ещё раз."}
      </p>}
      {!s.result && (
        <Button type="button" className="a-btn h-auto w-full sm:w-auto" disabled={!s.ready || s.busy} onClick={submit} data-testid={`${tid}-check-btn`}>
          {s.busy ? "Проверяю…" : "Проверить"}
          <ArrowRight aria-hidden="true" data-icon="inline-end" />
        </Button>
      )}
    </div>
  );
}

export function Steps({ steps }) {
  return (
    <ol className="space-y-3" data-testid="solution-steps">
      {steps.map((st, i) => (
        <li key={i} className="a-step flex gap-3" style={{ animationDelay: `${i * 90}ms` }}>
          <span className="fm grid h-7 w-7 flex-none place-items-center rounded-lg bg-white/10 text-xs font-bold">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <Rich text={st.text} className="block leading-relaxed" />
            {st.tex && <Equation tex={st.tex} label={`Формула в шаге ${i + 1}`} />}
          </div>
        </li>
      ))}
    </ol>
  );
}
