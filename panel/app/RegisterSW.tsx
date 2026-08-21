"use client";

import { useEffect } from "react";

// Registra el service worker (public/sw.js). Solo en producción: en dev el SW
// se pelea con el hot reload de Next y cachea chunks que ya no existen.
export default function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sin SW la app sigue funcionando igual — solo pierde el modo offline.
    });
  }, []);

  return null;
}
