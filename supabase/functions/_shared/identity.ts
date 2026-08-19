import type { SupabaseClient } from '@supabase/supabase-js';
import { getCoachByTelefono, type AppCoach } from './coaches.ts';
import { getAthleteByTelefono, type AppAthlete } from './athletes.ts';

export type Identity =
  | { kind: 'coach'; coach: AppCoach }
  | { kind: 'athlete'; athlete: AppAthlete }
  | { kind: 'unknown' };

// Un teléfono es coach o atleta, nunca ambos a la vez — este es el único
// lugar donde se decide qué rol tiene quien escribe.
export async function resolveIdentity(supabase: SupabaseClient, telefono: string): Promise<Identity> {
  const coach = await getCoachByTelefono(supabase, telefono);
  if (coach) return { kind: 'coach', coach };

  const athlete = await getAthleteByTelefono(supabase, telefono);
  if (athlete) return { kind: 'athlete', athlete };

  return { kind: 'unknown' };
}
