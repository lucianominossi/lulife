"use client";

import { useEffect, useRef, useState } from "react";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function centsToDisplay(cents: number): string {
  return brl.format(cents / 100);
}

function parseInitial(value?: string | number): number {
  if (value === undefined || value === null || value === "") return 0;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function CurrencyInput({
  name,
  required,
  defaultValue,
  id,
  className = "input-field",
  placeholder = "R$ 0,00",
  allowNegative = false,
}: {
  name: string;
  required?: boolean;
  defaultValue?: string | number;
  id?: string;
  className?: string;
  placeholder?: string;
  /** When true, press "-" to toggle estorno (negative amount). */
  allowNegative?: boolean;
}) {
  const initial = parseInitial(defaultValue);
  const [absCents, setAbsCents] = useState(() => Math.abs(initial));
  const [isNegative, setIsNegative] = useState(
    () => allowNegative && initial < 0,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // React resets uncontrolled fields after a form action; mirror that here
  // so the internal amount/sign state clears too (fixes "fica sempre negativo").
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const handleReset = () => {
      const init = parseInitial(defaultValue);
      setAbsCents(Math.abs(init));
      setIsNegative(allowNegative && init < 0);
    };
    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, [defaultValue, allowNegative]);

  const cents = allowNegative && isNegative ? -absCents : absCents;
  const display = absCents === 0 ? "" : centsToDisplay(cents);

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        required={required}
        placeholder={placeholder}
        value={display}
        onKeyDown={(e) => {
          if (!allowNegative) return;
          if (e.key === "-" || e.key === "−") {
            e.preventDefault();
            setIsNegative((n) => !n);
          }
        }}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          setAbsCents(digits ? parseInt(digits, 10) : 0);
        }}
        className={className}
      />
      <input type="hidden" name={name} value={(cents / 100).toFixed(2)} />
    </>
  );
}
