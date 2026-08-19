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
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="glass mx-auto w-full max-w-sm rounded-2xl p-8">
          <Image src="/brand/kayroz-wordmark.png" alt="Kayroz" width={220} height={92} priority className="mb-8" />

          {checkEmail ? (
            <div>
              <h1 className="mb-2 text-xl font-semibold">Revisá tu correo</h1>
              <p className="text-sm text-muted">
                Te mandamos un link de confirmación a {email}. Cuando lo abras, volvé acá e iniciá sesión.
              </p>
              <Link href="/login" className="mt-4 inline-block text-sm text-foreground underline">
                Ir a login
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-6 text-sm text-muted">Creá tu cuenta de coach — 14 días de prueba, sin tarjeta.</p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input rounded-lg px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Contraseña (mínimo 6 caracteres)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input rounded-lg px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted"
                />
                {error && <p className="text-sm text-red-400">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Creando cuenta..." : "Crear cuenta"}
                </button>
              </form>

              <p className="mt-4 text-sm text-muted">
                ¿Ya tenés cuenta?{" "}
                <Link href="/login" className="text-foreground underline">
                  Entrá
                </Link>
              </p>
            </>
          )}
        </div>
      </div>

      <div className="relative hidden w-1/2 overflow-hidden bg-black lg:block">
        <Image src="/brand/kayroz-cabra.png" alt="" fill className="invert object-cover opacity-80" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent" />
      </div>
    </div>
  );
}
