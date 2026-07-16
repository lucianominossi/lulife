"use client";

import { useState } from "react";

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
}: {
  name: string;
  required?: boolean;
  defaultValue?: string | number;
  id?: string;
  className?: string;
  placeholder?: string;
}) {
  const [cents, setCents] = useState<number>(() => parseInitial(defaultValue));

  const display = cents === 0 ? "" : centsToDisplay(cents);

  return (
    <>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        required={required}
        placeholder={placeholder}
        value={display}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          setCents(digits ? parseInt(digits, 10) : 0);
        }}
        className={className}
      />
      <input type="hidden" name={name} value={(cents / 100).toFixed(2)} />
    </>
  );
}
