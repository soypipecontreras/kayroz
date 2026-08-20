import type { SupabaseClient } from '@supabase/supabase-js';
import { getOrgByTelefono, type AppOrg } from './coaches.ts';
import { getAthleteByTelefono, type AppAthlete } from './athletes.ts';

export type Identity =
  | { kind: 'org'; org: AppOrg }
  | { kind: 'athlete'; athlete: AppAthlete }
  | { kind: 'unknown' };

// Un teléfono es de quien administra (org) o de quien entrena (atleta), nunca
// ambos a la vez — este es el único lugar donde se decide qué rol tiene quien
// escribe.
export async function resolveIdentity(supabase: SupabaseClient, telefono: string): Promise<Identity> {
  const org = await getOrgByTelefono(supabase, telefono);
  if (org) return { kind: 'org', org };

  const athlete = await getAthleteByTelefono(supabase, telefono);
  if (athlete) return { kind: 'athlete', athlete };

  return { kind: 'unknown' };
}
