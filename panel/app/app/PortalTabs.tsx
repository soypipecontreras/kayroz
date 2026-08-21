"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Barra de pestañas inferior del portal del atleta, solo en el celular.
// Mismo criterio que app/dashboard/icons.tsx: SVG inline monocromo,
// stroke=currentColor y trazo 1.6 — a este tamaño el detalle fino se empasta.

const ICON_PROPS = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const TABS = [
  {
    href: "/app",
    label: "Hoy",
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="4" y="5" width="16" height="16" rx="3" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </svg>
    ),
  },
  {
    href: "/app/recomendadas",
    label: "Rutinas",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M3 12h2M19 12h2" />
        <rect x="5" y="8" width="3" height="8" rx="1" />
        <rect x="16" y="8" width="3" height="8" rx="1" />
        <path d="M8 12h8" />
      </svg>
    ),
  },
  {
    href: "/app/log",
    label: "Cargar",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 8.5v7M8.5 12h7" />
      </svg>
    ),
  },
  {
    href: "/app/historial",
    label: "Historial",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </svg>
    ),
  },
  {
    href: "/app/prs",
    label: "PRs",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
        <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
        <path d="M12 13v4M8.5 20h7M10 17h4" />
      </svg>
    ),
  },
  {
    href: "/app/perfil",
    label: "Perfil",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="8.5" r="3.5" />
        <path d="M5 20c.8-3.2 3.6-5 7-5s6.2 1.8 7 5" />
      </svg>
    ),
  },
];

export default function PortalTabs() {
  const pathname = usePathname();

  return (
    <nav
      className="glass-nav fixed inset-x-0 bottom-0 z-10 sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-around px-2">
        {TABS.map((t) => {
          const activo = t.href === "/app" ? pathname === "/app" : pathname.startsWith(t.href);
          return (
            <li key={t.href} className="min-w-0 flex-1">
              <Link
                href={t.href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] transition-colors ${
                  activo ? "text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {t.icon}
                <span className="truncate">{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
