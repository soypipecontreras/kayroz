"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export interface NavItem {
  href: string;
  label: string;
  grupo: "entrenamiento" | "gestion" | "negocio";
}

const GRUPOS: { id: NavItem["grupo"]; titulo: string }[] = [
  { id: "entrenamiento", titulo: "Entrenamiento" },
  { id: "gestion", titulo: "Gestión" },
  { id: "negocio", titulo: "Negocio" },
];

export default function Sidebar({
  items,
  marca,
  signOut,
}: {
  items: NavItem[];
  marca: string;
  signOut: () => void;
}) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);

  // /dashboard es prefijo de todo, así que solo matchea exacto; el resto sí
  // matchea por prefijo para que una subpágina marque su sección.
  function activo(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const nav = (
    <nav className="flex flex-col gap-6">
      {GRUPOS.map((grupo) => {
        const delGrupo = items.filter((i) => i.grupo === grupo.id);
        if (delGrupo.length === 0) return null;
        return (
          <div key={grupo.id}>
            <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-muted/70">
              {grupo.titulo}
            </p>
            <ul className="flex flex-col gap-0.5">
              {delGrupo.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setAbierto(false)}
                    aria-current={activo(item.href) ? "page" : undefined}
                    className={`block rounded-xl px-3 py-2 text-[15px] transition-colors ${
                      activo(item.href)
                        ? "bg-white/10 font-medium text-foreground"
                        : "text-muted hover:bg-white/5 hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Barra superior: solo en mobile, para abrir el menú */}
      <header className="glass-nav sticky top-0 z-30 flex items-center justify-between px-5 py-4 lg:hidden">
        <div className="flex min-w-0 items-center gap-3">
          {/* El wordmark es apaisado (2.11:1); acá va chico para no estirar la
              barra, y la marca de la org al lado separada por un divisor. */}
          <Image src="/brand/kayroz-wordmark.png" alt="Kayroz" width={82} height={39} priority />
          <span className="h-4 w-px shrink-0 bg-white/20" aria-hidden="true" />
          <span className="truncate text-[15px] font-semibold tracking-tight">{marca}</span>
        </div>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={abierto}
          className="rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          {abierto ? "✕" : "☰"}
        </button>
      </header>

      {abierto && (
        <div
          onClick={() => setAbierto(false)}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`glass-nav fixed inset-y-0 left-0 z-40 w-64 shrink-0 flex-col overflow-y-auto px-4 py-6 transition-transform lg:flex lg:translate-x-0 ${
          abierto ? "flex translate-x-0" : "hidden -translate-x-full"
        }`}
      >
        {/* Kayroz (la plataforma) arriba y la marca de la org abajo: son dos
            identidades que conviven a propósito (ver §0 de CLAUDE.md). Van
            apiladas porque el wordmark es apaisado y al lado del nombre no
            entraría en 256px. */}
        <Link href="/dashboard" className="mb-8 flex flex-col gap-2 px-3">
          <Image src="/brand/kayroz-wordmark.png" alt="Kayroz" width={132} height={63} priority />
          <span className="truncate text-[15px] font-semibold tracking-tight">{marca}</span>
        </Link>

        {nav}

        <form action={signOut} className="mt-auto pt-6">
          <button
            type="submit"
            className="w-full rounded-xl px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-white/5 hover:text-foreground"
          >
            Cerrar sesión
          </button>
        </form>
      </aside>
    </>
  );
}
