import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import ActivateForm from "./ActivateForm";

const ROL_LABEL: Record<string, string> = {
  dueno: "dueño",
  entrenador: "entrenador",
  recepcion: "recepción",
};

export default async function JoinEquipoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_membership_activation", { p_token: token });
  const info = data?.[0];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      <div className="pointer-events-none absolute inset-0">
        <Image
          src="/brand/kayroz-cabra.png"
          alt=""
          fill
          className="invert object-cover object-center opacity-[0.5]"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/15 to-black/65" />
      </div>

      <div className="glass relative z-10 w-full max-w-md rounded-[28px] p-10 sm:p-12">
        <Image src="/brand/kayroz-wordmark.png" alt="Kayroz" width={200} height={95} priority className="mb-10" />

        {!info || !info.valid ? (
          <div>
            <h1 className="mb-2 text-2xl font-semibold tracking-tight">Este link no es válido</h1>
            <p className="text-sm text-muted">
              Puede que ya haya vencido o que el acceso ya esté activado. Pedile uno nuevo a quien te
              invitó.
            </p>
          </div>
        ) : (
          <>
            <h1 className="mb-2 text-2xl font-semibold tracking-tight">Hola, {info.nombre || "!"}</h1>
            <p className="mb-8 text-sm text-muted">
              {info.org_marca} te dio acceso como {ROL_LABEL[info.rol] ?? info.rol}. Creá tu
              contraseña para entrar.
            </p>
            <ActivateForm token={token} />
          </>
        )}
      </div>
    </div>
  );
}
