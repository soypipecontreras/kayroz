import { NextResponse } from "next/server";
import { createClient as createBareClient } from "@supabase/supabase-js";

// Ingesta de entrenos desde el Apple Watch (u otro wearable), pensada para el
// Atajo de iOS "Cuando termine un entreno" (ver /app/salud). No hay sesión de
// Supabase acá: la autenticación es el health_ingest_token del atleta y la
// valida el RPC ingest_health_workout (security definer). Este handler usa la
// clave anon — nunca service_role (regla del panel, ver CLAUDE.md §3).
//
// Body esperado (el Atajo manda un solo entreno; también se acepta un lote):
//   { "token": "<uuid>", "inicio": "2026-08-20T07:30:00Z", "duracion_seg": 2400,
//     "tipo": "Fuerza", "calorias": 350, "fc_promedio": 132, "fc_max": 171,
//     "distancia_m": 0 }
//   { "token": "<uuid>", "workouts": [ {...}, {...} ] }

const MAX_LOTE = 50;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface EntrenoIn {
  inicio?: unknown;
  duracion_seg?: unknown;
  tipo?: unknown;
  calorias?: unknown;
  fc_promedio?: unknown;
  fc_max?: unknown;
  distancia_m?: unknown;
  fuente?: unknown;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "json_invalido" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!UUID_RE.test(token)) {
    return NextResponse.json({ ok: false, error: "token_invalido" }, { status: 401 });
  }

  const lote: EntrenoIn[] = Array.isArray(body.workouts)
    ? (body.workouts as EntrenoIn[]).slice(0, MAX_LOTE)
    : [body as EntrenoIn];
  if (lote.length === 0) {
    return NextResponse.json({ ok: false, error: "sin_entrenos" }, { status: 400 });
  }

  const supabase = createBareClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );

  const resultados: string[] = [];
  for (const w of lote) {
    const inicio = typeof w.inicio === "string" ? w.inicio : null;
    const fuente = typeof w.fuente === "string" ? w.fuente : "apple_watch";
    if (!inicio || Number.isNaN(Date.parse(inicio))) {
      resultados.push("datos_invalidos");
      continue;
    }
    const { data, error } = await supabase.rpc("ingest_health_workout", {
      p_token: token,
      p_inicio: new Date(inicio).toISOString(),
      p_duracion_seg: num(w.duracion_seg) ?? 0,
      p_tipo: typeof w.tipo === "string" ? w.tipo.slice(0, 60) : null,
      p_calorias: num(w.calorias),
      p_fc_promedio: num(w.fc_promedio),
      p_fc_max: num(w.fc_max),
      p_distancia_m: num(w.distancia_m),
      p_fuente: fuente,
    });
    resultados.push(error ? "error" : String(data));
  }

  // Token que no matchea ningún atleta: 401 para que el Atajo avise en vez de
  // fallar en silencio para siempre.
  if (resultados.length > 0 && resultados.every((r) => r === "token_invalido")) {
    return NextResponse.json({ ok: false, resultados }, { status: 401 });
  }

  const ok = resultados.some((r) => r === "ok" || r === "duplicado");
  return NextResponse.json({ ok, resultados });
}
