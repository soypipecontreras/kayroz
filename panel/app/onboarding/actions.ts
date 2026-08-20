"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const TIPOS = ["gimnasio", "entrenador", "individual"] as const;
type Tipo = (typeof TIPOS)[number];

export async function createOrgProfile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tipo = String(formData.get("tipo") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const marca = String(formData.get("marca") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();

  if (!TIPOS.includes(tipo as Tipo)) {
    redirect(`/onboarding?error=${encodeURIComponent("Elegí qué tipo de cuenta querés")}`);
  }
  if (!nombre) {
    redirect(`/onboarding?error=${encodeURIComponent("Falta tu nombre")}`);
  }

  // Una sola llamada: crea org + membership de dueño (+ athlete si entrena
  // solo) en una transacción. No se puede hacer con inserts sueltos desde acá
  // porque el insert con returning necesita leer una fila que todavía no es
  // visible para el usuario — ver 20260821000300_create_organization_rpc.sql.
  const { error } = await supabase.rpc("create_organization", {
    p_tipo: tipo,
    p_nombre: nombre,
    p_marca: tipo === "individual" ? nombre : marca || nombre,
    p_telefono: telefono,
  });

  if (error) {
    const msg = error.message.includes("ya pertenece")
      ? "Esta cuenta ya tiene una organización."
      : error.message;
    redirect(`/onboarding?error=${encodeURIComponent(msg)}`);
  }

  redirect(tipo === "individual" ? "/app" : "/dashboard");
}
