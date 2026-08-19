import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Corre bajo el rol `authenticated` con RLS real (auth.uid()) — a diferencia
// del bot, que usa service_role y bypassa RLS. Nunca meter la service_role
// key acá.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Se llama desde un Server Component en render — el middleware
            // ya se encarga de refrescar la sesión en cada request.
          }
        },
      },
    },
  );
}
