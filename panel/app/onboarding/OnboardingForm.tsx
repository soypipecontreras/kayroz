"use client";

import { useState } from "react";
import { createOrgProfile } from "./actions";

const OPCIONES = [
  {
    tipo: "gimnasio",
    titulo: "Gimnasio",
    detalle: "Varias sedes, entrenadores y recepción. Cobrás membresías.",
  },
  {
    tipo: "entrenador",
    titulo: "Entrenador independiente",
    detalle: "Llevás tus propios clientes y les armás rutinas.",
  },
  {
    tipo: "individual",
    titulo: "Entreno por mi cuenta",
    detalle: "Sin entrenador: te armás tus rutinas y registrás tus entrenos.",
  },
] as const;

export default function OnboardingForm({ error }: { error?: string }) {
  const [tipo, setTipo] = useState<string>("");

  return (
    <form action={createOrgProfile} className="flex flex-col gap-4">
      <input type="hidden" name="tipo" value={tipo} />

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2 text-sm text-muted">¿Qué vas a usar?</legend>
        {OPCIONES.map((o) => (
          <button
            key={o.tipo}
            type="button"
            onClick={() => setTipo(o.tipo)}
            aria-pressed={tipo === o.tipo}
            className={`glass-input rounded-2xl px-4 py-3 text-left transition-colors ${
              tipo === o.tipo ? "border-divider-soft0" : "hover:border-border-strong"
            }`}
          >
            <span className="block text-[15px] font-medium">{o.titulo}</span>
            <span className="mt-0.5 block text-sm text-muted">{o.detalle}</span>
          </button>
        ))}
      </fieldset>

      {tipo && (
        <>
          <input
            name="nombre"
            required
            placeholder={tipo === "individual" ? "Tu nombre" : "Tu nombre"}
            className="glass-input rounded-2xl px-4 py-3.5 text-[15px] text-foreground outline-none placeholder:text-muted"
          />
          {tipo !== "individual" && (
            <input
              name="marca"
              placeholder={
                tipo === "gimnasio" ? "Nombre del gimnasio" : "Tu marca (lo ven tus clientes)"
              }
              className="glass-input rounded-2xl px-4 py-3.5 text-[15px] text-foreground outline-none placeholder:text-muted"
            />
          )}
          <input
            name="telefono"
            placeholder="Teléfono (opcional, +57...)"
            className="glass-input rounded-2xl px-4 py-3.5 text-[15px] text-foreground outline-none placeholder:text-muted"
          />
        </>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={!tipo}
        className="btn-primary mt-2 rounded-2xl px-4 py-3.5 text-[15px] font-semibold disabled:opacity-40"
      >
        Empezar
      </button>
    </form>
  );
}
