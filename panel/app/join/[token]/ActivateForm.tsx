"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { activateAthlete } from "./actions";

export default function ActivateForm({ token }: { token: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  // Cuando el email ya tiene cuenta, la contraseña que pide deja de ser "creá
  // una" y pasa a ser "poné la tuya": hay que decirlo, si no parece un error.
  const [modoIngreso, setModoIngreso] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    // El link tiene que servir para las dos cosas: crear la cuenta la primera
    // vez, y entrar si ya existe. Antes solo hacía signUp, así que si alguien
    // se registraba y la vinculación fallaba (o simplemente ya tenía cuenta),
    // quedaba trabado para siempre: no podía registrarse porque el email estaba
    // tomado, ni entrar porque nunca se vinculó.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });

    const yaTieneCuenta =
      signUpError?.message.includes("already registered") ||
      signUpError?.message.includes("User already registered");

    if (signUpError && !yaTieneCuenta) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    let sesion = signUpData?.session ?? null;

    if (yaTieneCuenta) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setLoading(false);
        setModoIngreso(true);
        setError(
          "Ese email ya tiene una cuenta. Escribí la contraseña que usaste, y con eso entrás.",
        );
        return;
      }
      sesion = signInData.session;
    }

    // Sin sesión es porque el proyecto exige confirmar el email primero.
    if (!sesion) {
      setLoading(false);
      setCheckEmail(true);
      return;
    }

    const result = await activateAthlete(token);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    router.push("/app");
    router.refresh();
  }

  if (checkEmail) {
    return (
      <div>
        <h2 className="mb-2 text-lg font-semibold tracking-tight">Revisá tu correo</h2>
        <p className="text-sm text-muted">
          Te mandamos un link de confirmación a {email}. Cuando lo abras, volvé a este link para
          terminar de activar tu cuenta.
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
        placeholder={modoIngreso ? "Tu contraseña" : "Contraseña (mínimo 6 caracteres)"}
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
        {loading ? "Entrando..." : modoIngreso ? "Entrar" : "Activar cuenta"}
      </button>
    </form>
  );
}
