import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generarHealthToken, revocarHealthToken } from "./actions";

// Conexión con Apple Watch (vía la app Salud + Atajos de iOS). No hay app
// nativa todavía: el puente es una automatización personal de Atajos que
// manda cada entreno terminado a /api/health/ingest con el token del atleta.
// Cuando exista la app nativa usará el mismo endpoint.

export default async function SaludPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: athlete } = await supabase
    .from("athletes")
    .select("id, health_ingest_token")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!athlete) redirect("/login");

  const host = (await headers()).get("host");
  const origin = host?.startsWith("localhost") ? `http://${host}` : `https://${host}`;
  const endpoint = `${origin}/api/health/ingest`;
  const token = athlete.health_ingest_token as string | null;

  const cuerpoEjemplo = `{
  "token": "${token ?? "<tu token>"}",
  "inicio": "Fecha de inicio del entreno (ISO 8601)",
  "duracion_seg": 2400,
  "tipo": "Fuerza",
  "calorias": 350,
  "fc_promedio": 132,
  "fc_max": 171,
  "distancia_m": 0
}`;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Apple Watch y Salud</h1>
        <p className="text-sm text-muted">
          Conectá tus entrenos del reloj: cada sesión que registres con el Apple Watch aparece sola
          en tu historial y tu entrenador la ve como adherencia real.
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <section className="glass rounded-3xl p-7 sm:p-8">
        <h2 className="mb-2 text-lg font-semibold tracking-tight">1. Tu token de conexión</h2>
        {token ? (
          <>
            <p className="mb-3 text-sm text-muted">
              Este token identifica tus entrenos. Tratalo como una contraseña: solo va dentro de tu
              Atajo. Si lo regenerás, el anterior deja de servir.
            </p>
            <p className="glass-input mb-4 select-all break-all rounded-2xl px-4 py-3 font-mono text-sm">
              {token}
            </p>
            <div className="flex flex-wrap gap-3">
              <form action={generarHealthToken}>
                <button type="submit" className="glass-input rounded-xl px-4 py-2 text-sm font-medium">
                  Regenerar
                </button>
              </form>
              <form action={revocarHealthToken}>
                <button
                  type="submit"
                  className="glass-input rounded-xl px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:border-red-400/40"
                >
                  Desconectar
                </button>
              </form>
            </div>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">
              Generá tu token para habilitar la conexión. Lo vas a pegar una sola vez dentro del
              Atajo de iOS.
            </p>
            <form action={generarHealthToken}>
              <button type="submit" className="btn-primary rounded-2xl px-5 py-3 text-[15px] font-semibold">
                Generar token
              </button>
            </form>
          </>
        )}
      </section>

      <section className="glass rounded-3xl p-7 sm:p-8">
        <h2 className="mb-2 text-lg font-semibold tracking-tight">2. Armá el Atajo en tu iPhone</h2>
        <p className="mb-4 text-sm text-muted">
          Una sola vez, en la app <span className="font-medium text-foreground">Atajos</span> de iOS
          (necesita iOS 17 o posterior):
        </p>
        <ol className="flex list-none flex-col gap-3 text-sm leading-relaxed">
          {[
            <>Abrí <span className="font-medium">Atajos</span> → pestaña <span className="font-medium">Automatización</span> → <span className="font-medium">Nueva automatización</span>.</>,
            <>Elegí <span className="font-medium">Entrenamiento de Apple Watch</span> → <span className="font-medium">Cuando termine</span> → <span className="font-medium">Ejecutar inmediatamente</span>.</>,
            <>Agregá la acción <span className="font-medium">Obtener contenido de URL</span>.</>,
            <>Pegá esta URL: <span className="select-all break-all font-mono text-[13px]">{endpoint}</span></>,
            <>Método <span className="font-medium">POST</span>, cuerpo <span className="font-medium">JSON</span>, con estos campos (usá las variables del entrenamiento que te ofrece Atajos para inicio, duración, calorías, pulso y distancia):</>,
          ].map((paso, i) => (
            <li key={i} className="flex gap-3">
              <span className="glass-input flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                {i + 1}
              </span>
              <span>{paso}</span>
            </li>
          ))}
        </ol>
        <pre className="glass-input mt-4 overflow-x-auto rounded-2xl p-4 font-mono text-[13px] leading-relaxed">
          {cuerpoEjemplo}
        </pre>
        <p className="mt-4 text-sm text-muted">
          Listo: al cerrar cualquier entreno en el reloj, aparece solo en tu{" "}
          <span className="text-foreground">Historial</span>. Si mandás el mismo entreno dos veces
          no pasa nada — lo detectamos como duplicado.
        </p>
      </section>

      <section className="glass rounded-3xl p-7 sm:p-8">
        <h2 className="mb-2 text-lg font-semibold tracking-tight">¿Y la app nativa?</h2>
        <p className="text-sm text-muted">
          Está en el plan: una app de iPhone con sincronización automática de HealthKit y su
          compañera de watchOS. Este mismo token y esta misma conexión van a seguir funcionando —
          la app solo va a hacer que no tengas que armar nada a mano.
        </p>
      </section>
    </div>
  );
}
