"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import LoadingScreen from "../LoadingScreen";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      setLoading(false);
      setError("Email o contraseña incorrectos.");
      return;
    }

    // Un mismo login sirve para staff (gimnasio/entrenador) y para quien
    // entrena — se resuelve acá a qué lado va cada uno (mismo concepto que
    // resolveIdentity del bot).
    const { data: membership } = await supabase
      .from("memberships")
      .select("id")
      .eq("auth_user_id", data.user.id)
      .eq("estado", "activo")
      .maybeSingle();

    // OJO: acá NO se hace setLoading(false). Entre el push y que el panel
    // aparezca todavía falta lo más lento (el servidor arma la página), y
    // apagar el loader dejaría el formulario quieto justo en ese tramo — que
    // es exactamente lo que se sentía como "se queda cargando un rato".
    if (membership) {
      router.push("/dashboard");
    } else {
      // Atleta, o alguien recién registrado sin cuenta armada: /app y
      // /onboarding se encargan de mandarlo donde corresponda.
      router.push("/app");
    }
    router.refresh();
  }

  // Mientras se resuelve el login se muestra la marca a pantalla completa en
  // vez del formulario congelado. Se mantiene hasta que el panel reemplaza
  // esta página.
  if (loading) return <LoadingScreen label="Entrando" />;

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
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">Bienvenido de nuevo</h1>
        <p className="mb-8 text-sm text-muted">Entrá con tu cuenta de coach.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="glass-input rounded-2xl px-4 py-3.5 text-[15px] text-foreground outline-none placeholder:text-muted"
          />
          <input
            type="password"
            required
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="glass-input rounded-2xl px-4 py-3.5 text-[15px] text-foreground outline-none placeholder:text-muted"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-2 rounded-2xl px-4 py-3.5 text-[15px] font-semibold disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-8 text-sm text-muted">
          ¿Todavía no tenés cuenta?{" "}
          <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  );
}
