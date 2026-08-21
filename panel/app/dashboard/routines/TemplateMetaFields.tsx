import {
  DISCIPLINAS,
  DISCIPLINA_LABEL,
  MODALIDADES,
  MODALIDAD_LABEL,
  NIVELES,
  NIVEL_LABEL,
  OBJETIVOS,
  OBJETIVO_LABEL,
} from "@/lib/disciplinas";

// Selects de metadata de una plantilla (disciplina/nivel/objetivo/modalidad).
// Server component que se le pasa a RoutineBuilder como `metaFields`, así el
// componente cliente no carga con este vocabulario.
export default function TemplateMetaFields({
  disciplina = "gimnasio",
  nivel = "",
  objetivo = "",
  modalidad = "series",
}: {
  disciplina?: string;
  nivel?: string;
  objetivo?: string;
  modalidad?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <label className="flex flex-col gap-1.5 text-xs text-muted">
        Disciplina
        <select
          name="disciplina"
          defaultValue={disciplina}
          className="glass-input rounded-2xl px-3 py-2.5 text-sm text-foreground outline-none"
        >
          {DISCIPLINAS.map((d) => (
            <option key={d} value={d}>
              {DISCIPLINA_LABEL[d]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-xs text-muted">
        Nivel
        <select
          name="nivel"
          defaultValue={nivel}
          className="glass-input rounded-2xl px-3 py-2.5 text-sm text-foreground outline-none"
        >
          <option value="">Sin definir</option>
          {NIVELES.map((n) => (
            <option key={n} value={n}>
              {NIVEL_LABEL[n]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-xs text-muted">
        Objetivo
        <select
          name="objetivo"
          defaultValue={objetivo}
          className="glass-input rounded-2xl px-3 py-2.5 text-sm text-foreground outline-none"
        >
          <option value="">Sin definir</option>
          {OBJETIVOS.map((o) => (
            <option key={o} value={o}>
              {OBJETIVO_LABEL[o]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-xs text-muted">
        Modalidad
        <select
          name="modalidad"
          defaultValue={modalidad}
          className="glass-input rounded-2xl px-3 py-2.5 text-sm text-foreground outline-none"
        >
          {MODALIDADES.map((m) => (
            <option key={m} value={m}>
              {MODALIDAD_LABEL[m]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
