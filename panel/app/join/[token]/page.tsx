import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import ActivateForm from "./ActivateForm";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_athlete_activation", { p_token: token });
  const info = data?.[0];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      <div className="pointer-events-none absolute inset-0">
        <Image
          src="/brand/kayroz-cabra.png"
          alt=""
          fill
          className="logo-cabra object-cover object-center opacity-[0.5]"
          priority
        />
        <div className="auth-veil absolute inset-0" />
      </div>

      <div className="glass relative z-10 w-full max-w-md rounded-[28px] p-10 sm:p-12">
        <Image src="/brand/kayroz-wordmark.png" alt="Kayroz" width={200} height={95} priority className="logo-kayroz mb-10" />

        {!info || !info.valid ? (
          <div>
            <h1 className="mb-2 text-2xl font-semibold tracking-tight">Este link no es válido</h1>
            <p className="text-sm text-muted">
              Puede que ya haya vencido o que la cuenta ya esté activada. Pedile a tu entrenador un link nuevo.
            </p>
          </div>
        ) : (
          <>
            <h1 className="mb-2 text-2xl font-semibold tracking-tight">Hola, {info.nombre || "atleta"}</h1>
            <p className="mb-8 text-sm text-muted">
              {info.coach_marca || info.coach_nombre} te invitó a Kayroz. Creá tu contraseña para entrar.
            </p>
            <ActivateForm token={token} />
          </>
        )}
      </div>
    </div>
  );
}
