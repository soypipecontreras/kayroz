// Íconos del menú. SVG inline y no una librería: son doce, pesan nada, y así
// no se suma una dependencia ni se depende de una fuente externa.
//
// Reglas del set para que se vea Kayroz y no un pack genérico:
// - Monocromo puro: `stroke="currentColor"`, nunca un color propio. Heredan el
//   del texto, así funcionan igual en tema claro y oscuro y en estado activo.
// - Trazo 1.6 y esquinas redondeadas: mismo peso visual que la tipografía.
// - Geometría simple, sin relleno ni detalle chico — a 18px el detalle se
//   empasta y ensucia.

type IconProps = { className?: string };

function Svg({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconResumen({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 13h4v8H3zM10 3h4v18h-4zM17 9h4v12h-4z" />
    </Svg>
  );
}

export function IconClientes({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </Svg>
  );
}

// Mancuerna: dos discos y la barra.
export function IconEjercicios({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" />
    </Svg>
  );
}

// Planilla con las series anotadas.
export function IconRutinas({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </Svg>
  );
}

// Sede: edificio con puerta.
export function IconSedes({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 21V6l8-3 8 3v15" />
      <path d="M10 21v-5h4v5" />
      <path d="M8 10h.01M16 10h.01" />
    </Svg>
  );
}

// Equipo: dos personas.
export function IconEquipo({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19a6 6 0 0 1 12 0" />
      <path d="M16 6.2a3 3 0 0 1 0 5.6M18 19a5.5 5.5 0 0 0-2-4.3" />
    </Svg>
  );
}

// Planes: credencial de socio.
export function IconPlanes({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M2.5 10h19M6 14.5h4" />
    </Svg>
  );
}

// Finanzas: tendencia al alza.
export function IconFinanzas({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 20h18" />
      <path d="M5 16l4.5-5 3.5 3L20 6" />
      <path d="M15.5 6H20v4.5" />
    </Svg>
  );
}

// Productos: caja de inventario.
export function IconProductos({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5z" />
      <path d="M3 8.5 12 13l9-4.5M12 13v7" />
    </Svg>
  );
}

// Mi web: globo.
export function IconWeb({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.7 3.8 5.7 3.8 9S14.5 18.3 12 21c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
    </Svg>
  );
}

// Configuración: deslizadores (más Kayroz que un engranaje dentado, que a
// 18px se empasta).
export function IconConfig({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </Svg>
  );
}

export const ICONS = {
  resumen: IconResumen,
  clientes: IconClientes,
  ejercicios: IconEjercicios,
  rutinas: IconRutinas,
  sedes: IconSedes,
  equipo: IconEquipo,
  planes: IconPlanes,
  finanzas: IconFinanzas,
  productos: IconProductos,
  web: IconWeb,
  config: IconConfig,
} as const;

export type IconKey = keyof typeof ICONS;
