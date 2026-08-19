import type { SupabaseClient } from '@supabase/supabase-js';

export interface AppAthlete {
  id: string;
  coach_id: string;
  unidad_peso: 'kg' | 'lb';
}

// Solo el registro activo: un teléfono puede tener historial bajo un coach
// viejo (ver migración), pero como mucho un atleta activo a la vez.
export async function getAthleteByTelefono(
  supabase: SupabaseClient,
  telefono: string,
): Promise<AppAthlete | null> {
  const { data, error } = await supabase
    .from('athletes')
    .select('id, coach_id, unidad_peso')
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
  coachId: string,
): Promise<AppAthlete> {
  const { data, error } = await supabase
    .from('athletes')
    .insert({ telefono, nombre, coach_id: coachId })
    .select('id, coach_id, unidad_peso')
    .single();
  if (error) throw error;
  return data as AppAthlete;
}
