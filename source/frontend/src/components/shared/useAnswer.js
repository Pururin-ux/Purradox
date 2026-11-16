import { useRef, useState } from "react";
import { assessmentChanged } from "@/lib/hooks";

export function useAnswer(item, check, options = {}) {
  const multi = item.kind === "multi";
  const isNum = item.kind === "number";
  const [localChoice, setChoice] = useState(multi ? [] : null);
  const [localInput, setInputRaw] = useState("");
  const controlled = typeof options.onDraftChange === "function";
  const choice = controlled ? options.draft?.choice ?? (multi ? [] : null) : localChoice;
  const input = controlled ? options.draft?.input ?? "" : localInput;
  const answer = useRef({ choice, input });
  answer.current = { choice, input };
  const [result, setResult] = useState(options.initialResult ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const submission = useRef(options.initialResult ? "done" : "idle");

  const number = input.trim().replace(/−/g, "-").replace(",", ".");
  const ready = isNum ? /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(number) : multi ? choice.length > 0 : choice !== null;

  const pick = (n) => {
    if (submission.current !== "idle") return;
    const c = answer.current.choice;
    const next = multi ? (c.includes(n) ? c.filter((x) => x !== n) : [...c, n].sort((a, b) => a - b)) : n;
    answer.current = { ...answer.current, choice: next };
    if (controlled) options.onDraftChange(answer.current);
    else setChoice(next);
  };

  const setInput = (v) => {
    if (submission.current !== "idle") return;
    answer.current = { ...answer.current, input: v.slice(0, 32) };
    if (controlled) options.onDraftChange(answer.current);
    else setInputRaw(answer.current.input);
  };

  const submit = async () => {
    if (!ready || submission.current !== "idle") return null;
    submission.current = "pending";
    setBusy(true);
    setError(false);
    try {
      const given = isNum ? input.trim() : choice;
      const r = await check(item.id, isNum ? number : choice);
      submission.current = "done";
      setResult(r);
      return { ...r, given };
    } catch (e) {
      submission.current = "idle";
      setError(assessmentChanged(e) ? "version" : "network");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const optionState = (n) => {
    const chosen = multi ? choice.includes(n) : choice === n;
    if (!result) return chosen ? "selected" : "idle";
    const right = multi ? result.answer.includes(n) : result.answer === n;
    if (right) return "right";
    return chosen ? "wrong" : "idle";
  };

  return { choice, input, setInput, pick, submit, result, busy, ready, optionState, multi, isNum, error };
}
