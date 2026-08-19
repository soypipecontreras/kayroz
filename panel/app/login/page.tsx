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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      <div className="pointer-events-none absolute inset-0">
        <Image
          src="/brand/kayroz-cabra.png"
          alt=""
          fill
          className="invert object-cover object-center opacity-[0.14]"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/60 to-black" />
      </div>

      <div className="glass relative z-10 w-full max-w-md rounded-[28px] p-10 sm:p-12">
        <Image src="/brand/kayroz-wordmark.png" alt="Kayroz" width={200} height={84} priority className="mb-10" />
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
