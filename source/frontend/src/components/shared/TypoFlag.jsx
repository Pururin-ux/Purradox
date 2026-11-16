import { useEffect, useRef, useState } from "react";
import { Check, Copy, CopyX } from "lucide-react";
import { Button } from "@/components/ui/button";

// Нет бэкенда для жалоб, поэтому кнопка копирует код задачи и начало
// формулировки — ученик пересылает их автору любым удобным способом.
export function TypoFlag({ id, text, compact = false }) {
  const [status, setStatus] = useState("");
  const reset = useRef(null);
  useEffect(() => () => clearTimeout(reset.current), []);
  const copy = async (event) => {
    const button = event.currentTarget;
    const payload = `${id} — ${(text ?? "").replace(/\s+/g, " ").slice(0, 120)}`;
    let copied = false;
    try {
      await navigator.clipboard.writeText(payload);
      copied = true;
    } catch {
      const area = document.createElement("textarea");
      area.value = payload;
      area.readOnly = true;
      Object.assign(area.style, { position: "fixed", opacity: "0", pointerEvents: "none" });
      try {
        (button.closest("[role=dialog]") ?? document.body).appendChild(area);
        area.select();
        copied = document.execCommand?.("copy") === true;
      } catch { /* The browser denied clipboard access. */ }
      finally { area.remove(); if (button.isConnected) button.focus({ preventScroll: true }); }
    }
    setStatus(copied ? "Код скопирован" : "Код не скопирован");
    clearTimeout(reset.current);
    reset.current = setTimeout(() => setStatus(""), 2500);
  };
  const icon = status === "Код скопирован" ? <Check aria-hidden="true" /> : status ? <CopyX aria-hidden="true" /> : <Copy aria-hidden="true" />;
  return <Button type="button" variant="ghost" className="typo-flag" size={compact ? "icon" : "default"} onClick={copy}
    title={compact ? status || "Скопировать код задачи" : undefined}
    aria-label={compact ? "Скопировать код задачи" : undefined}
    data-testid={`typo-flag-${id}`}>
    {compact ? <>{icon}<span className="sr-only" role="status">{status}</span></> : <span aria-live="polite">{status || "Скопировать код"}</span>}
  </Button>;
}
