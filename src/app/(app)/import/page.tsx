"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Preview = {
  categories: number;
  accounts: number;
  creditTransactions: number;
  pixDebit: number;
  incomes: number;
  budgets: number;
  investments: number;
  months: string[];
};

export default function ImportPage() {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);

  async function onFile(f: File | null) {
    setFile(f);
    setPreview(null);
    setError(null);
    if (!f) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", f);
    const res = await fetch("/api/import/preview", { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Falha ao ler planilha");
      return;
    }
    setPreview(data.preview);
    setHasData(data.hasData);
  }

  async function onImport() {
    if (!file) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("replace", replace ? "1" : "0");
    const res = await fetch("/api/import", { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Falha na importação");
      return;
    }
    router.push("/month");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[32px] font-bold tracking-tight">
          Importar
        </h1>
        <p className="mt-1 text-[var(--color-ink-muted)]">
          Planilha Lulife (.xlsx) — apenas para a sua conta
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <label className="panel flex cursor-pointer flex-col items-center justify-center gap-3 border-dashed px-6 py-16 transition hover:border-[var(--color-brand)]">
          <span className="text-sm text-[var(--color-ink-muted)]">
            Clique ou arraste o arquivo .xlsx
          </span>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
          {file && (
            <span className="text-sm font-medium text-[var(--color-brand)]">
              {file.name}
            </span>
          )}
        </label>

        <div className="panel p-6">
          {busy && (
            <p className="text-sm text-[var(--color-ink-muted)]">Processando…</p>
          )}
          {error && (
            <p className="rounded-lg bg-[var(--color-accent-soft)] px-3 py-2 text-sm text-[var(--color-danger)]">
              {error}
            </p>
          )}
          {!preview && !busy && !error && (
            <p className="text-sm text-[var(--color-ink-muted)]">
              A prévia dos dados aparece aqui após escolher o arquivo.
            </p>
          )}
          {preview && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold">Prévia</h2>
              <ul className="grid grid-cols-2 gap-3 text-sm">
                <li className="rounded-lg bg-[var(--color-surface-2)]/70 px-3 py-2">
                  Categorias: <strong>{preview.categories}</strong>
                </li>
                <li className="rounded-lg bg-[var(--color-surface-2)]/70 px-3 py-2">
                  Contas: <strong>{preview.accounts}</strong>
                </li>
                <li className="rounded-lg bg-[var(--color-surface-2)]/70 px-3 py-2">
                  Crédito: <strong>{preview.creditTransactions}</strong>
                </li>
                <li className="rounded-lg bg-[var(--color-surface-2)]/70 px-3 py-2">
                  Pix/Débito: <strong>{preview.pixDebit}</strong>
                </li>
                <li className="rounded-lg bg-[var(--color-surface-2)]/70 px-3 py-2">
                  Entradas: <strong>{preview.incomes}</strong>
                </li>
                <li className="rounded-lg bg-[var(--color-surface-2)]/70 px-3 py-2">
                  Orçamentos: <strong>{preview.budgets}</strong>
                </li>
                <li className="rounded-lg bg-[var(--color-surface-2)]/70 px-3 py-2">
                  Investimentos: <strong>{preview.investments}</strong>
                </li>
                <li className="rounded-lg bg-[var(--color-surface-2)]/70 px-3 py-2">
                  Meses: <strong>{preview.months.length}</strong>
                </li>
              </ul>
              {hasData && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={replace}
                    onChange={(e) => setReplace(e.target.checked)}
                  />
                  Substituir dados existentes da minha conta
                </label>
              )}
              <button
                type="button"
                disabled={busy || (hasData && !replace)}
                onClick={onImport}
                className="btn-primary w-full disabled:opacity-50"
              >
                {hasData && !replace
                  ? "Marque substituir para continuar"
                  : "Confirmar importação"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
