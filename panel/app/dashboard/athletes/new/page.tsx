import { createAthlete } from "../actions";

export default async function NewAthletePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="max-w-sm">
      <h1 className="mb-1 text-xl font-semibold">Agregar atleta</h1>
      <p className="mb-6 text-sm text-muted">
        Se agrega directo, sin pasar por un código de invitación. Si más adelante el atleta usa el bot, se
        puede vincular su teléfono.
      </p>

      <form action={createAthlete} className="flex flex-col gap-3">
        <input
          name="nombre"
          required
          placeholder="Nombre del atleta"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-white"
        />
        <input
          name="telefono"
          placeholder="Teléfono (opcional, +57...)"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-white"
        />
        <select
          name="unidad_peso"
          defaultValue="kg"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-white"
        >
          <option value="kg">Kilogramos (kg)</option>
          <option value="lb">Libras (lb)</option>
        </select>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          Agregar
        </button>
      </form>
    </div>
  );
}
