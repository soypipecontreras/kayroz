import type { SupabaseClient } from '@supabase/supabase-js';

export interface AppAthlete {
  id: string;
  org_id: string;
  unidad_peso: 'kg' | 'lb';
}

// Solo el registro activo: un teléfono puede tener historial bajo una org
// vieja (ver migración), pero como mucho un atleta activo a la vez.
export async function getAthleteByTelefono(
  supabase: SupabaseClient,
  telefono: string,
): Promise<AppAthlete | null> {
  const { data, error } = await supabase
    .from('athletes')
    .select('id, org_id, unidad_peso')
    .eq('telefono', telefono)
    .eq('estado', 'activo')
    .maybeSingle();
  if (error) throw error;
  return data as AppAthlete | null;
}

export async function createAthleteFromInvite(
  supabase: SupabaseClient,
  telefono: string,
  nombre: string | undefined,
  orgId: string,
): Promise<AppAthlete> {
  const { data, error } = await supabase
    .from('athletes')
    .insert({ telefono, nombre, org_id: orgId })
    .select('id, org_id, unidad_peso')
    .single();
  if (error) throw error;
  return data as AppAthlete;
}
