"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext, puedeVerPlata } from "@/lib/org";

export async function crearProducto(formData: FormData) {
  const supabase = await createClient();
  const org = await getOrgContext(supabase);
  if (!puedeVerPlata(org.rol)) {
    redirect(`/dashboard/productos?error=${encodeURIComponent("No tenés permiso para esto")}`);
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  const precio = Number(formData.get("precio"));
  const stock = Number(formData.get("stock") ?? 0);

  if (!nombre) redirect(`/dashboard/productos?error=${encodeURIComponent("Falta el nombre")}`);
  if (!Number.isFinite(precio) || precio < 0) {
    redirect(`/dashboard/productos?error=${encodeURIComponent("Precio inválido")}`);
  }

  const { error } = await supabase.from("products").insert({
    org_id: org.orgId,
    nombre,
    precio,
    stock: Number.isFinite(stock) ? Math.max(0, Math.round(stock)) : 0,
  });
  if (error) redirect(`/dashboard/productos?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/dashboard/productos");
  redirect("/dashboard/productos");
}

export async function venderProducto(formData: FormData) {
  const supabase = await createClient();
  const org = await getOrgContext(supabase);
  if (!puedeVerPlata(org.rol)) {
    redirect(`/dashboard/productos?error=${encodeURIComponent("No tenés permiso para esto")}`);
  }

  const productId = String(formData.get("product_id") ?? "");
  const cantidad = Number(formData.get("cantidad") ?? 1);
  const metodo = String(formData.get("metodo") ?? "efectivo");
  const athleteId = String(formData.get("athlete_id") ?? "").trim();

  if (!productId) redirect(`/dashboard/productos?error=${encodeURIComponent("Elegí un producto")}`);
  if (!Number.isFinite(cantidad) || cantidad < 1) {
    redirect(`/dashboard/productos?error=${encodeURIComponent("Cantidad inválida")}`);
  }

  const { data: producto } = await supabase
    .from("products")
    .select("id, precio, stock, nombre")
    .eq("id", productId)
    .maybeSingle();
  if (!producto) redirect(`/dashboard/productos?error=${encodeURIComponent("No encontramos el producto")}`);

  const cant = Math.round(cantidad);
  if (producto.stock < cant) {
    redirect(
      `/dashboard/productos?error=${encodeURIComponent(`Solo quedan ${producto.stock} de ${producto.nombre}`)}`,
    );
  }

  const total = Number(producto.precio) * cant;

  const { data: pago, error: payError } = await supabase
    .from("payments")
    .insert({
      org_id: org.orgId,
      athlete_id: athleteId || null,
      monto: total,
      metodo,
      concepto: "producto",
      detalle: `${cant} x ${producto.nombre}`,
    })
    .select("id")
    .single();
  if (payError) redirect(`/dashboard/productos?error=${encodeURIComponent(payError.message)}`);

  const { error: saleError } = await supabase.from("product_sales").insert({
    org_id: org.orgId,
    product_id: productId,
    athlete_id: athleteId || null,
    payment_id: pago.id,
    cantidad: cant,
    monto_total: total,
  });
  if (saleError) {
    await supabase.from("payments").delete().eq("id", pago.id);
    redirect(`/dashboard/productos?error=${encodeURIComponent(saleError.message)}`);
  }

  // Se descuenta después de registrar la venta: si el update falla, la venta ya
  // quedó y el stock se corrige a mano; al revés perderíamos la plata cobrada.
  await supabase
    .from("products")
    .update({ stock: producto.stock - cant })
    .eq("id", productId);

  revalidatePath("/dashboard/productos");
  revalidatePath("/dashboard/finanzas");
  redirect("/dashboard/productos");
}

export async function ajustarStock(productId: string, formData: FormData) {
  const supabase = await createClient();
  const org = await getOrgContext(supabase);
  if (!puedeVerPlata(org.rol)) {
    redirect(`/dashboard/productos?error=${encodeURIComponent("No tenés permiso para esto")}`);
  }

  const stock = Number(formData.get("stock"));
  if (!Number.isFinite(stock) || stock < 0) {
    redirect(`/dashboard/productos?error=${encodeURIComponent("Stock inválido")}`);
  }

  const { error } = await supabase
    .from("products")
    .update({ stock: Math.round(stock) })
    .eq("id", productId);
  if (error) redirect(`/dashboard/productos?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/dashboard/productos");
}
