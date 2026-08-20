"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message.includes("already registered") ? "Ese email ya tiene cuenta." : error.message);
      return;
    }

    // Si el proyecto exige confirmar el email, signUp no devuelve sesión
    // todavía — el alta del coach queda pendiente hasta el primer login
    // (ver /onboarding).
    if (data.session) {
      router.push("/onboarding");
      router.refresh();
    } else {
      setCheckEmail(true);
    }
  }

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

        {checkEmail ? (
          <div>
            <h1 className="mb-2 text-2xl font-semibold tracking-tight">Revisá tu correo</h1>
            <p className="text-sm text-muted">
              Te mandamos un link de confirmación a {email}. Cuando lo abras, volvé acá e iniciá sesión.
            </p>
            <Link href="/login" className="mt-6 inline-block text-sm font-medium text-foreground underline underline-offset-4">
              Ir a login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mb-2 text-2xl font-semibold tracking-tight">Creá tu cuenta</h1>
            <p className="mb-8 text-sm text-muted">14 días de prueba, sin tarjeta.</p>

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
                minLength={6}
                placeholder="Contraseña (mínimo 6 caracteres)"
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
                {loading ? "Creando cuenta..." : "Crear cuenta"}
              </button>
            </form>

            <p className="mt-8 text-sm text-muted">
              ¿Ya tenés cuenta?{" "}
              <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
                Entrá
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
