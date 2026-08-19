import type { SupabaseClient } from '@supabase/supabase-js';

export interface AppCoach {
  id: string;
  nombre: string | null;
  marca: string | null;
}

export async function getCoachByTelefono(
  supabase: SupabaseClient,
  telefono: string,
): Promise<AppCoach | null> {
  const { data, error } = await supabase
    .from('coaches')
    .select('id, nombre, marca')
    .eq('telefono', telefono)
    .maybeSingle();
  if (error) throw error;
  return data as AppCoach | null;
}

export async function createCoach(
  supabase: SupabaseClient,
  telefono: string,
  nombre: string | undefined,
): Promise<AppCoach> {
  const trialTerminaEn = new Date();
  trialTerminaEn.setDate(trialTerminaEn.getDate() + 14);

  const { data, error } = await supabase
    .from('coaches')
    .insert({ telefono, nombre, trial_termina_en: trialTerminaEn.toISOString().slice(0, 10) })
    .select('id, nombre, marca')
    .single();
  if (error) throw error;
  return data as AppCoach;
}

// Sin 0/O/1/l/I: un coach dicta o copia este código a mano, no puede ser ambiguo.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LENGTH = 8;

function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export async function createInviteCode(supabase: SupabaseClient, coachId: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const codigo = generateCode();
    const { error } = await supabase.from('invite_codes').insert({ coach_id: coachId, codigo });
    if (!error) return codigo;
    if (error.code !== '23505') throw error; // colisión de código: reintenta con uno nuevo
  }
  throw new Error('No se pudo generar un código de invitación único tras varios intentos');
}

export type RedeemResult =
  | { ok: true; coachId: string }
  | { ok: false; reason: 'no_encontrado' | 'agotado' | 'vencido' | 'inactivo' };

// El incremento de usos_actuales pasa por la función SQL `redeem_invite_code`
// (atómica, ver migración) para que dos canjes simultáneos del mismo código
// no puedan pasarse ambos del usos_max.
export async function redeemInviteCode(supabase: SupabaseClient, codigoRaw: string): Promise<RedeemResult> {
  const codigo = codigoRaw.trim().toUpperCase();

  const { data: coachId, error: rpcError } = await supabase.rpc('redeem_invite_code', { p_codigo: codigo });
  if (rpcError) throw rpcError;
  if (coachId) return { ok: true, coachId: coachId as string };

  const { data: row, error: selectError } = await supabase
    .from('invite_codes')
    .select('activo, usos_actuales, usos_max, expira_en')
    .eq('codigo', codigo)
    .maybeSingle();
  if (selectError) throw selectError;

  if (!row) return { ok: false, reason: 'no_encontrado' };
  if (!row.activo) return { ok: false, reason: 'inactivo' };
  if (row.expira_en && new Date(row.expira_en) <= new Date()) return { ok: false, reason: 'vencido' };
  return { ok: false, reason: 'agotado' };
}
