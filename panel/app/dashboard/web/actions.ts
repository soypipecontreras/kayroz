"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext, esDueno } from "@/lib/org";
import { normalizarBloques } from "@/lib/siteBlocks";

async function soloDueno() {
  const supabase = await createClient();
  const org = await getOrgContext(supabase);
  if (!esDueno(org.rol)) {
    redirect(`/dashboard/web?error=${encodeURIComponent("Solo el dueño puede editar la web")}`);
  }
  return { supabase, org };
}

// Crea el sitio la primera vez, con un slug sugerido a partir de la marca.
export async function crearSitio() {
  const { supabase, org } = await soloDueno();

  const { data: slug, error: slugError } = await supabase.rpc("slug_disponible", {
    p_base: org.marca || org.nombre || "gimnasio",
  });
  if (slugError) redirect(`/dashboard/web?error=${encodeURIComponent(slugError.message)}`);

  const { error } = await supabase.from("org_sites").insert({ org_id: org.orgId, slug });
  if (error) redirect(`/dashboard/web?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/dashboard/web");
  redirect("/dashboard/web");
}

export async function guardarBloques(bloquesRaw: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const org = await getOrgContext(supabase);
  if (!esDueno(org.rol)) return { error: "Solo el dueño puede editar la web." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(bloquesRaw);
  } catch {
    return { error: "No pudimos leer los cambios. Recargá y probá de nuevo." };
  }

  // El JSON viene del navegador: se sanea antes de guardar, nunca se confía.
  const bloques = normalizarBloques(parsed);

  const { data: updated, error } = await supabase
    .from("org_sites")
    .update({ bloques, updated_at: new Date().toISOString() })
    .eq("org_id", org.orgId)
    .select("org_id");

  if (error) return { error: error.message };
  // Un update que RLS bloquea no da error, solo no toca filas (ver §0).
  if (!updated || updated.length === 0) return { error: "No pudimos guardar los cambios." };

  revalidatePath("/dashboard/web");
  return {};
}

export async function actualizarSlug(formData: FormData) {
  const { supabase, org } = await soloDueno();

  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 40) {
    redirect(
      `/dashboard/web?error=${encodeURIComponent("La dirección solo admite minúsculas, números y guiones (3 a 40 caracteres)")}`,
    );
  }

  const { error } = await supabase.from("org_sites").update({ slug }).eq("org_id", org.orgId);
  if (error) {
    const msg = error.code === "23505" ? "Esa dirección ya está tomada" : error.message;
    redirect(`/dashboard/web?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath("/dashboard/web");
  redirect("/dashboard/web?guardado=1");
}

export async function alternarPublicado(publicado: boolean) {
  const { supabase, org } = await soloDueno();

  const { error } = await supabase.from("org_sites").update({ publicado }).eq("org_id", org.orgId);
  if (error) redirect(`/dashboard/web?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/dashboard/web");
}
