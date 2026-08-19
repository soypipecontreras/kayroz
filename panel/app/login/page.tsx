"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError("Email o contraseña incorrectos.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="glass mx-auto w-full max-w-sm rounded-2xl p-8">
          <Image src="/brand/kayroz-wordmark.png" alt="Kayroz" width={220} height={92} priority className="mb-8" />
          <p className="mb-6 text-sm text-muted">Entrá con tu cuenta de coach.</p>

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
              placeholder="Contraseña"
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
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="mt-4 text-sm text-muted">
            ¿Todavía no tenés cuenta?{" "}
            <Link href="/signup" className="text-foreground underline">
              Registrate
            </Link>
          </p>
        </div>
      </div>

      <div className="relative hidden w-1/2 overflow-hidden bg-black lg:block">
        <Image
          src="/brand/kayroz-cabra.png"
          alt=""
          fill
          className="invert object-cover opacity-80"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent" />
      </div>
    </div>
  );
}
