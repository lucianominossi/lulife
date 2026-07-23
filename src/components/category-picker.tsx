"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { createCategoryInline } from "@/app/actions";

type Category = { id: string; name: string; kind: string };

export function CategoryPicker({
  name = "categoryId",
  kind,
  categories,
  defaultValue = "",
  required = false,
  label = "Categoria",
  optionalEmptyLabel = "Sem categoria",
}: {
  name?: string;
  kind: "expense" | "income";
  categories: Category[];
  defaultValue?: string;
  required?: boolean;
  label?: string;
  optionalEmptyLabel?: string;
}) {
  const [extra, setExtra] = useState<Category[]>([]);
  const [selected, setSelected] = useState(defaultValue);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const items = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) {
      if (c.kind === kind) map.set(c.id, c);
    }
    for (const c of extra) {
      if (c.kind === kind) map.set(c.id, c);
    }
    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    );
  }, [categories, extra, kind]);

  useEffect(() => {
    setCreating(false);
    setNewName("");
    setError(null);
    setSelected((prev) => {
      if (prev && items.some((c) => c.id === prev)) return prev;
      if (defaultValue && items.some((c) => c.id === defaultValue)) {
        return defaultValue;
      }
      return "";
    });
  }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps -- reset only when kind switches

  function submitNew() {
    const trimmed = newName.trim();
    if (!trimmed) {
      setError("Informe o nome da categoria.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await createCategoryInline({
          name: trimmed,
          kind,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setExtra((prev) => {
          if (prev.some((c) => c.id === result.id)) return prev;
          return [
            ...prev,
            { id: result.id, name: result.name, kind: result.kind },
          ];
        });
        setSelected(result.id);
        setNewName("");
        setCreating(false);
      } catch {
        setError("Não foi possível criar a categoria.");
      }
    });
  }

  return (
    <div className="space-y-1.5 text-sm">
      <span className="font-medium text-[var(--color-ink-muted)]">{label}</span>
      <select
        name={name}
        className="input-field"
        value={selected}
        required={required}
        onChange={(e) => setSelected(e.target.value)}
      >
        {!required && <option value="">{optionalEmptyLabel}</option>}
        {required && !selected && (
          <option value="" disabled>
            Selecione
          </option>
        )}
        {items.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {!creating ? (
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setError(null);
          }}
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-ink)] transition hover:text-[var(--ink)]"
        >
          <Plus size={12} />
          Nova categoria
        </button>
      ) : (
        <div className="space-y-2 rounded-xl border border-[var(--dashed-border)] bg-[var(--hover-fill)] p-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitNew();
              }
              if (e.key === "Escape") {
                setCreating(false);
                setNewName("");
                setError(null);
              }
            }}
            placeholder={
              kind === "income" ? "Ex.: Freelance" : "Ex.: Imóvel alugado"
            }
            className="input-field"
            autoFocus
            disabled={pending}
          />
          {error && (
            <p className="text-xs text-[var(--color-danger)]" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submitNew}
              disabled={pending}
              className="btn-primary flex-1 py-2 text-sm"
            >
              {pending ? "Salvando…" : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setNewName("");
                setError(null);
              }}
              disabled={pending}
              className="btn-ghost flex items-center justify-center px-3"
              aria-label="Cancelar"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
