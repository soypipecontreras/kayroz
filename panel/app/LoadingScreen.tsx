import Image from "next/image";

// Pantalla de carga con la marca. La usan los loading.tsx de cada sección.
//
// Detalle clave: NO aparece de inmediato. La animación tiene 180ms de delay
// con fill-mode `both`, así que durante ese rato queda invisible. Si la
// navegación fue rápida (que es lo normal entre páginas del panel) el loader
// nunca llega a verse, y no queda un parpadeo que se siente peor que no tener
// nada. Solo se muestra cuando la espera es real.
//
// `variant`:
//   - "full": ocupa la pantalla. Para cuando todavía no hay nada dibujado
//     (login, web pública, primera carga).
//   - "inline": ocupa el área de contenido. Dentro del panel el menú lateral
//     ya está en pantalla y taparlo entero sería un retroceso.
export default function LoadingScreen({
  variant = "full",
  label = "Cargando",
}: {
  variant?: "full" | "inline";
  label?: string;
}) {
  const alto = variant === "full" ? "min-h-screen" : "min-h-[60vh]";
  const cabra = variant === "full" ? { w: 168, h: 261 } : { w: 124, h: 193 };
  const marca = variant === "full" ? { w: 210, h: 99 } : { w: 160, h: 76 };

  return (
    <div
      className={`kayroz-loader flex ${alto} w-full flex-col items-center justify-center gap-6 px-6`}
      role="status"
      aria-live="polite"
    >
      <Image
        src="/brand/kayroz-cabra-mark.png"
        alt=""
        width={cabra.w}
        height={cabra.h}
        priority
        className="logo-cabra kayroz-loader-breathe"
      />

      <div className="flex flex-col items-center gap-3">
        <Image
          src="/brand/kayroz-wordmark.png"
          alt="Kayroz"
          width={marca.w}
          height={marca.h}
          priority
          className="logo-kayroz opacity-80"
        />
        {/* Barrita de progreso indeterminado: da sensación de avance sin
            mentir con un porcentaje que no conocemos. */}
        <div className="kayroz-loader-track relative h-px w-36 overflow-hidden">
          <span className="kayroz-loader-sweep absolute inset-y-0 w-1/3" />
        </div>
      </div>

      <span className="sr-only">{label}</span>
    </div>
  );
}
