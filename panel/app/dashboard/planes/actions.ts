"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext, puedeVerPlata } from "@/lib/org";

export async function crearPlan(formData: FormData) {
  const supabase = await createClient();
  const org = await getOrgContext(supabase);
  if (!puedeVerPlata(org.rol)) {
    redirect(`/dashboard/planes?error=${encodeURIComponent("No tenés permiso para esto")}`);
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  const precio = Number(formData.get("precio"));
  const duracion = Number(formData.get("duracion_dias"));

  if (!nombre) redirect(`/dashboard/planes?error=${encodeURIComponent("Falta el nombre")}`);
  if (!Number.isFinite(precio) || precio < 0) {
    redirect(`/dashboard/planes?error=${encodeURIComponent("Precio inválido")}`);
  }
  if (!Number.isFinite(duracion) || duracion < 1) {
    redirect(`/dashboard/planes?error=${encodeURIComponent("La duración tiene que ser al menos 1 día")}`);
  }

  const { error } = await supabase.from("membership_plans").insert({
    org_id: org.orgId,
    nombre,
    precio,
    duracion_dias: Math.round(duracion),
  });
  if (error) redirect(`/dashboard/planes?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/dashboard/planes");
  redirect("/dashboard/planes");
}

export async function alternarPlan(planId: string, activo: boolean) {
  const supabase = await createClient();
  const org = await getOrgContext(supabase);
  if (!puedeVerPlata(org.rol)) {
    redirect(`/dashboard/planes?error=${encodeURIComponent("No tenés permiso para esto")}`);
  }

  const { error } = await supabase.from("membership_plans").update({ activo }).eq("id", planId);
  if (error) redirect(`/dashboard/planes?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/dashboard/planes");
}

// Le vende un plan a un socio: crea la suscripción y registra el pago. Las dos
// cosas van juntas porque un plan vendido sin plata registrada haría que
// "ingresos" mienta.
export async function venderPlan(formData: FormData) {
  const supabase = await createClient();
  const org = await getOrgContext(supabase);
  if (!puedeVerPlata(org.rol)) {
    redirect(`/dashboard/planes?error=${encodeURIComponent("No tenés permiso para esto")}`);
  }

  const athleteId = String(formData.get("athlete_id") ?? "");
  const planId = String(formData.get("plan_id") ?? "");
  const metodo = String(formData.get("metodo") ?? "efectivo");

  if (!athleteId || !planId) {
    redirect(`/dashboard/planes?error=${encodeURIComponent("Elegí socio y plan")}`);
  }

  const { data: plan } = await supabase
    .from("membership_plans")
    .select("id, precio, duracion_dias")
    .eq("id", planId)
    .maybeSingle();
  if (!plan) redirect(`/dashboard/planes?error=${encodeURIComponent("No encontramos ese plan")}`);

  // Si ya tiene una membresía vigente, la nueva arranca cuando termina esa; si
  // no, arranca hoy. Así renovar por adelantado no le regala días ni se los come.
  const hoyISO = new Date().toISOString().slice(0, 10);
  const { data: vigente } = await supabase
    .from("member_subscriptions")
    .select("termina_en")
    .eq("athlete_id", athleteId)
    .neq("estado", "cancelada")
    .gte("termina_en", hoyISO)
    .order("termina_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  const inicia = vigente ? new Date(vigente.termina_en) : new Date();
  if (vigente) inicia.setDate(inicia.getDate() + 1);
  const termina = new Date(inicia);
  termina.setDate(termina.getDate() + plan.duracion_dias);

  const { data: sub, error: subError } = await supabase
    .from("member_subscriptions")
    .insert({
      org_id: org.orgId,
      athlete_id: athleteId,
      plan_id: planId,
      inicia_en: inicia.toISOString().slice(0, 10),
      termina_en: termina.toISOString().slice(0, 10),
    })
    .select("id")
    .single();
  if (subError) redirect(`/dashboard/planes?error=${encodeURIComponent(subError.message)}`);

  const { error: payError } = await supabase.from("payments").insert({
    org_id: org.orgId,
    athlete_id: athleteId,
    subscription_id: sub.id,
    monto: plan.precio,
    metodo,
    concepto: "membresia",
  });
  if (payError) {
    // Sin el pago, la membresía quedaría regalada y los ingresos no cuadrarían.
    await supabase.from("member_subscriptions").delete().eq("id", sub.id);
    redirect(`/dashboard/planes?error=${encodeURIComponent(payError.message)}`);
  }

  revalidatePath("/dashboard/planes");
  revalidatePath("/dashboard/finanzas");
  revalidatePath("/dashboard/athletes");
  redirect("/dashboard/planes");
}
