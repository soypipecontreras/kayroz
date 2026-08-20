import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

// Corre bajo el rol `authenticated` con RLS real (auth.uid()) — a diferencia
// del bot, que usa service_role y bypassa RLS. Nunca meter la service_role
// key acá.
//
// Va envuelto en `cache()` de React: dentro de un mismo request, layout y
// página comparten la MISMA instancia en vez de crear una cada uno. Eso no es
// cosmético — es lo que permite que `getOrgContext` (que se cachea por
// cliente) acierte en la segunda llamada en vez de repetir el viaje a
// Supabase. El caché de React es por request, así que no hay riesgo de que se
// mezclen sesiones de dos usuarios distintos.
export const createClient = cache(async () => {
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
});
