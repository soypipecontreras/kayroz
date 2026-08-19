import { createAthlete } from "../actions";

export default async function NewAthletePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="glass max-w-md rounded-3xl p-8 sm:p-10">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Agregar atleta</h1>
      <p className="mb-8 text-sm text-muted">
        Se agrega directo, sin pasar por un código de invitación. Si más adelante el atleta usa el bot, se
        puede vincular su teléfono.
      </p>

      <form action={createAthlete} className="flex flex-col gap-4">
        <input
          name="nombre"
          required
          placeholder="Nombre del atleta"
          className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted"
        />
        <input
          name="telefono"
          placeholder="Teléfono (opcional, +57...)"
          className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted"
        />
        <select
          name="unidad_peso"
          defaultValue="kg"
          className="glass-input rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none"
        >
          <option value="kg">Kilogramos (kg)</option>
          <option value="lb">Libras (lb)</option>
        </select>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" className="btn-primary mt-2 rounded-2xl px-4 py-3 text-[15px] font-semibold">
          Agregar
        </button>
      </form>
    </div>
  );
}
