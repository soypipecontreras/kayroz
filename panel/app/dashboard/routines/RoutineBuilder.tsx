"use client";

import { useMemo, useState } from "react";

export interface CatalogExercise {
  id: string;
  nombre_canonico: string;
  grupo_muscular: string;
  tipo: string;
}

export interface BuilderItem {
  exercise_id: string;
  nombre: string;
  series_obj: number;
  reps_min: number;
  reps_max: number | null; // null = AMRAP
  rpe_obj: number | null;
  descanso_seg: number | null;
  notas: string;
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function formatReps(item: Pick<BuilderItem, "reps_min" | "reps_max">): string {
  if (item.reps_max === null) return "AMRAP";
  if (item.reps_min === item.reps_max) return String(item.reps_min);
  return `${item.reps_min}-${item.reps_max}`;
}

export default function RoutineBuilder({
  exercises,
  initialItems = [],
  initialNombre = "",
  initialDescripcion = "",
  action,
  submitLabel,
  withDescripcion = false,
  metaFields,
  error,
}: {
  exercises: CatalogExercise[];
  initialItems?: BuilderItem[];
  initialNombre?: string;
  initialDescripcion?: string;
  action: (formData: FormData) => void;
  submitLabel: string;
  withDescripcion?: boolean;
  // Campos extra del formulario (disciplina/nivel/objetivo de la plantilla).
  // Van como nodo del server component padre para que este componente cliente
  // no cargue con el vocabulario de disciplinas.
  metaFields?: React.ReactNode;
  error?: string;
}) {
  const [items, setItems] = useState<BuilderItem[]>(initialItems);
  const [query, setQuery] = useState("");

  const yaAgregados = useMemo(() => new Set(items.map((i) => i.exercise_id)), [items]);

  const resultados = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];
    return exercises.filter((e) => normalize(e.nombre_canonico).includes(q)).slice(0, 8);
  }, [query, exercises]);

  function addExercise(e: CatalogExercise) {
    setItems((prev) => [
      ...prev,
      {
        exercise_id: e.id,
        nombre: e.nombre_canonico,
        series_obj: 3,
        reps_min: 10,
        reps_max: 10,
        rpe_obj: null,
        descanso_seg: null,
        notas: "",
      },
    ]);
    setQuery("");
  }

  function updateItem(index: number, patch: Partial<BuilderItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function move(index: number, delta: number) {
    setItems((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <div className="flex flex-col gap-4">
        <input
          name="nombre"
          required
          defaultValue={initialNombre}
          placeholder="Nombre de la rutina (ej: Push A)"
          className="glass-input rounded-2xl px-4 py-3.5 text-[15px] text-foreground outline-none placeholder:text-muted"
        />
        {withDescripcion && (
          <input
            name="descripcion"
            defaultValue={initialDescripcion}
            placeholder="Descripción (opcional)"
            className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted"
          />
        )}
        {metaFields}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-muted">Agregar ejercicio</label>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscá en el catálogo…"
          className="glass-input w-full rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted"
        />
        {resultados.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1.5">
            {resultados.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => addExercise(e)}
                  className="glass-input flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-[15px] transition-colors hover:border-border-strong"
                >
                  <span>
                    {e.nombre_canonico}
                    {yaAgregados.has(e.id) && <span className="ml-2 text-xs text-muted">(ya está)</span>}
                  </span>
                  <span className="text-xs text-muted">
                    {e.grupo_muscular} · {e.tipo}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {query && resultados.length === 0 && (
          <p className="mt-2 text-sm text-muted">
            Nada con ese nombre. Podés crearlo en{" "}
            <a href="/dashboard/exercises" className="underline underline-offset-4">
              Ejercicios
            </a>
            .
          </p>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted">
          Todavía no agregaste ningún ejercicio. Buscá uno arriba para empezar.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item, index) => (
            <li key={`${item.exercise_id}-${index}`} className="glass-input rounded-2xl p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <p className="text-[15px] font-medium">
                  {index + 1}. {item.nombre}
                </p>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Subir"
                    className="rounded-lg px-2 py-1 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    aria-label="Bajar"
                    className="rounded-lg px-2 py-1 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    aria-label="Quitar"
                    className="rounded-lg px-2 py-1 text-sm text-muted transition-colors hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted">Series</span>
                  <input
                    type="number"
                    min={1}
                    value={item.series_obj}
                    onChange={(ev) => updateItem(index, { series_obj: Number(ev.target.value) })}
                    className="glass-input rounded-xl px-3 py-2 text-sm text-foreground outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted">Reps</span>
                  <input
                    type="number"
                    min={1}
                    value={item.reps_min}
                    disabled={item.reps_max === null}
                    onChange={(ev) => {
                      // El builder expone un solo campo de reps, así que min y
                      // max van juntos. (reps_max === null es AMRAP y se
                      // preserva: ahí este input está deshabilitado.)
                      const v = Number(ev.target.value);
                      updateItem(index, {
                        reps_min: v,
                        reps_max: item.reps_max === null ? null : v,
                      });
                    }}
                    className="glass-input rounded-xl px-3 py-2 text-sm text-foreground outline-none disabled:opacity-40"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted">Descanso (s)</span>
                  <input
                    type="number"
                    min={0}
                    step={15}
                    value={item.descanso_seg ?? ""}
                    placeholder="—"
                    onChange={(ev) =>
                      updateItem(index, {
                        descanso_seg: ev.target.value === "" ? null : Number(ev.target.value),
                      })
                    }
                    className="glass-input rounded-xl px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted">RPE</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    step={0.5}
                    value={item.rpe_obj ?? ""}
                    placeholder="—"
                    onChange={(ev) =>
                      updateItem(index, {
                        rpe_obj: ev.target.value === "" ? null : Number(ev.target.value),
                      })
                    }
                    className="glass-input rounded-xl px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted"
                  />
                </label>
              </div>

              <label className="mt-2.5 flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={item.reps_max === null}
                  onChange={(ev) =>
                    updateItem(index, { reps_max: ev.target.checked ? null : item.reps_min })
                  }
                  className="h-4 w-4 accent-white"
                />
                AMRAP (todas las que pueda)
              </label>

              <input
                type="text"
                value={item.notas}
                onChange={(ev) => updateItem(index, { notas: ev.target.value })}
                placeholder="Nota para el atleta (opcional)"
                className="glass-input mt-2.5 w-full rounded-xl px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted"
              />
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={items.length === 0}
        className="btn-primary self-start rounded-2xl px-5 py-3 text-[15px] font-semibold disabled:opacity-40"
      >
        {submitLabel}
      </button>
    </form>
  );
}
