import type { SupabaseClient } from '@supabase/supabase-js';

// "Org" es el tenant: un gimnasio, un entrenador independiente o una persona
// que entrena sola (ver 20260821000000_organizations.sql). El bot solo conoce
// el teléfono, así que da de alta orgs de tipo 'entrenador' — un gimnasio con
// staff se arma desde el panel, no por chat.
export interface AppOrg {
  id: string;
  nombre: string | null;
  marca: string | null;
}

export async function getOrgByTelefono(
  supabase: SupabaseClient,
  telefono: string,
): Promise<AppOrg | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, nombre, marca')
    .eq('telefono', telefono)
    .maybeSingle();
  if (error) throw error;
  return data as AppOrg | null;
}

export async function createOrg(
  supabase: SupabaseClient,
  telefono: string,
  nombre: string | undefined,
): Promise<AppOrg> {
  const trialTerminaEn = new Date();
  trialTerminaEn.setDate(trialTerminaEn.getDate() + 14);

  const { data, error } = await supabase
    .from('organizations')
    .insert({
      telefono,
      nombre,
      tipo: 'entrenador',
      trial_termina_en: trialTerminaEn.toISOString().slice(0, 10),
    })
    .select('id, nombre, marca')
    .single();
  if (error) throw error;
  return data as AppOrg;
}

// Sin 0/O/1/l/I: se dicta o se copia a mano, no puede ser ambiguo.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LENGTH = 8;

function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export async function createInviteCode(supabase: SupabaseClient, orgId: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const codigo = generateCode();
    const { error } = await supabase.from('invite_codes').insert({ org_id: orgId, codigo });
    if (!error) return codigo;
    if (error.code !== '23505') throw error; // colisión de código: reintenta con uno nuevo
  }
  throw new Error('No se pudo generar un código de invitación único tras varios intentos');
}

export type RedeemResult =
  | { ok: true; orgId: string }
  | { ok: false; reason: 'no_encontrado' | 'agotado' | 'vencido' | 'inactivo' };

// El incremento de usos_actuales pasa por la función SQL `redeem_invite_code`
// (atómica, ver migración) para que dos canjes simultáneos del mismo código
// no puedan pasarse ambos del usos_max.
export async function redeemInviteCode(supabase: SupabaseClient, codigoRaw: string): Promise<RedeemResult> {
  const codigo = codigoRaw.trim().toUpperCase();

  const { data: orgId, error: rpcError } = await supabase.rpc('redeem_invite_code', { p_codigo: codigo });
  if (rpcError) throw rpcError;
  if (orgId) return { ok: true, orgId: orgId as string };

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
