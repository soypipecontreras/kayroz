"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "kayroz-theme";

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  // Arranca en null porque el tema real lo puso ThemeScript en el <html> antes
  // de que React exista: si asumiéramos "dark" acá, el ícono podría quedar al
  // revés durante la hidratación.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const actual = document.documentElement.getAttribute("data-theme");
    setTheme(actual === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.style.colorScheme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Modo incógnito o storage bloqueado: el tema igual se aplica en esta
      // sesión, solo no se recuerda.
    }
  }

  const esClaro = theme === "light";
  const label = esClaro ? "Cambiar a modo oscuro" : "Cambiar a modo claro";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={
        compact
          ? "rounded-lg p-2 text-muted transition-colors hover:text-foreground"
          : "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-hover hover:text-foreground"
      }
    >
      <span className="shrink-0" aria-hidden="true">
        {esClaro ? <IconLuna /> : <IconSol />}
      </span>
      {!compact && <span>{esClaro ? "Modo oscuro" : "Modo claro"}</span>}
    </button>
  );
}

function IconSol() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function IconLuna() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}
