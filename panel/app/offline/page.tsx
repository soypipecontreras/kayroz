import Image from "next/image";

// Fallback de navegación sin red (lo sirve el service worker, public/sw.js).
// Estática a propósito: tiene que poder precachearse en el install del SW.
export const dynamic = "force-static";

export const metadata = {
  title: "Sin conexión — Kayroz",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-8 text-center">
      <Image
        src="/brand/kayroz-mark.png"
        alt="Kayroz"
        width={48}
        height={52}
        className="logo-kayroz opacity-80"
      />
      <div>
        <h1 className="mb-2 text-xl font-semibold tracking-tight">Sin conexión</h1>
        <p className="max-w-sm text-sm text-muted">
          No pudimos cargar la página. Revisá tu conexión y volvé a intentar — tu entrenamiento te
          espera.
        </p>
      </div>
    </main>
  );
}
