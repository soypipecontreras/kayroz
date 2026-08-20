"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { activateMembership } from "./actions";

export default function ActivateForm({ token }: { token: string }) {
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
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      setLoading(false);
      setError(
        signUpError.message.includes("already registered")
          ? "Ese email ya tiene cuenta."
          : signUpError.message,
      );
      return;
    }

    if (!data.session) {
      setLoading(false);
      setCheckEmail(true);
      return;
    }

    const result = await activateMembership(token);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (checkEmail) {
    return (
      <div>
        <h2 className="mb-2 text-lg font-semibold tracking-tight">Revisá tu correo</h2>
        <p className="text-sm text-muted">
          Te mandamos un link de confirmación a {email}. Cuando lo abras, volvé a este link para
          terminar de activar tu acceso.
        </p>
      </div>
    );
  }

  return (
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
        {loading ? "Activando..." : "Activar acceso"}
      </button>
    </form>
  );
}
