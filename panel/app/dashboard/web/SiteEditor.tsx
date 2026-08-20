"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  BLOQUES_DISPONIBLES,
  bloqueVacio,
  nombreDeBloque,
  type Bloque,
  type BloqueTipo,
} from "@/lib/siteBlocks";
import { guardarBloques } from "./actions";

const SITE_BUCKET = "site-media";
const MAX_IMG = 10 * 1024 * 1024;

export default function SiteEditor({
  orgId,
  bloquesIniciales,
}: {
  orgId: string;
  bloquesIniciales: Bloque[];
}) {
  const router = useRouter();
  const [bloques, setBloques] = useState<Bloque[]>(bloquesIniciales);
  const [sucio, setSucio] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agregando, setAgregando] = useState(false);

  function editar(index: number, patch: Partial<Bloque>) {
    setBloques((prev) =>
      prev.map((b, i) => (i === index ? ({ ...b, ...patch } as Bloque) : b)),
    );
    setSucio(true);
  }

  function agregar(tipo: BloqueTipo) {
    setBloques((prev) => [...prev, bloqueVacio(tipo)]);
    setAgregando(false);
    setSucio(true);
  }

  function quitar(index: number) {
    setBloques((prev) => prev.filter((_, i) => i !== index));
    setSucio(true);
  }

  function mover(index: number, delta: number) {
    setBloques((prev) => {
      const next = [...prev];
      const t = index + delta;
      if (t < 0 || t >= next.length) return prev;
      [next[index], next[t]] = [next[t], next[index]];
      return next;
    });
    setSucio(true);
  }

  async function subirImagen(file: File): Promise<string | null> {
    if (file.size > MAX_IMG) {
      setError(`La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)} MB. El máximo son 10 MB.`);
      return null;
    }
    const supabase = createClient();
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${orgId}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(SITE_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) {
      setError("No pudimos subir la imagen. Probá de nuevo.");
      return null;
    }
    // El bucket es público: la URL no expira, que es lo que necesita una web.
    const { data } = supabase.storage.from(SITE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async function guardar() {
    setGuardando(true);
    setError(null);
    const res = await guardarBloques(JSON.stringify(bloques));
    setGuardando(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSucio(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="text-sm text-red-400">{error}</p>}

      {bloques.length === 0 ? (
        <section className="glass rounded-3xl p-7 sm:p-8">
          <p className="text-sm text-muted">
            Tu página está vacía. Agregá una portada para empezar — es lo primero que ve quien
            entra.
          </p>
        </section>
      ) : (
        <ul className="flex flex-col gap-4">
          {bloques.map((bloque, index) => (
            <li key={index} className="glass rounded-3xl p-6 sm:p-7">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[15px] font-semibold tracking-tight">
                    {nombreDeBloque(bloque.tipo)}
                  </p>
                  <p className="text-xs text-muted">Sección {index + 1}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => mover(index, -1)}
                    disabled={index === 0}
                    aria-label="Subir sección"
                    className="rounded-lg px-2 py-1 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(index, 1)}
                    disabled={index === bloques.length - 1}
                    aria-label="Bajar sección"
                    className="rounded-lg px-2 py-1 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => quitar(index)}
                    aria-label="Quitar sección"
                    className="rounded-lg px-2 py-1 text-sm text-muted transition-colors hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <CamposDeBloque
                bloque={bloque}
                onChange={(patch) => editar(index, patch)}
                onSubirImagen={subirImagen}
              />
            </li>
          ))}
        </ul>
      )}

      {agregando ? (
        <section className="glass rounded-3xl p-6 sm:p-7">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[15px] font-semibold tracking-tight">Elegí una sección</p>
            <button
              type="button"
              onClick={() => setAgregando(false)}
              className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {BLOQUES_DISPONIBLES.map((b) => (
              <li key={b.tipo}>
                <button
                  type="button"
                  onClick={() => agregar(b.tipo)}
                  className="glass-input w-full rounded-2xl px-4 py-3 text-left transition-colors hover:border-border-strong"
                >
                  <span className="block text-[15px] font-medium">{b.nombre}</span>
                  <span className="mt-0.5 block text-sm text-muted">{b.descripcion}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setAgregando(true)}
          className="glass-input self-start rounded-2xl px-5 py-3 text-[15px] font-medium transition-colors hover:border-border-strong"
        >
          + Agregar sección
        </button>
      )}

      {/* Barra de guardado pegada abajo: con muchas secciones el botón queda
          lejísimo si va al final del documento. */}
      <div className="glass-nav sticky bottom-0 -mx-6 flex items-center justify-between gap-4 px-6 py-4">
        <p className="text-sm text-muted">
          {sucio ? "Tenés cambios sin guardar" : "Todo guardado"}
        </p>
        <button
          type="button"
          onClick={guardar}
          disabled={!sucio || guardando}
          className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-40"
        >
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "glass-input w-full rounded-2xl px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted";

function CamposDeBloque({
  bloque,
  onChange,
  onSubirImagen,
}: {
  bloque: Bloque;
  onChange: (patch: Partial<Bloque>) => void;
  onSubirImagen: (file: File) => Promise<string | null>;
}) {
  switch (bloque.tipo) {
    case "hero":
      return (
        <div className="flex flex-col gap-3">
          <input
            value={bloque.titulo}
            onChange={(e) => onChange({ titulo: e.target.value })}
            placeholder="Título grande (ej: Entrená con nosotros)"
            className={inputCls}
          />
          <textarea
            value={bloque.subtitulo}
            onChange={(e) => onChange({ subtitulo: e.target.value })}
            rows={2}
            placeholder="Frase corta debajo del título"
            className={inputCls}
          />
          <input
            value={bloque.cta}
            onChange={(e) => onChange({ cta: e.target.value })}
            placeholder="Texto del botón (ej: Quiero empezar)"
            className={inputCls}
          />
          <CampoImagen
            valor={bloque.imagen}
            etiqueta="Foto de fondo"
            onSubir={onSubirImagen}
            onListo={(url) => onChange({ imagen: url })}
          />
        </div>
      );

    case "sobre":
      return (
        <div className="flex flex-col gap-3">
          <input
            value={bloque.titulo}
            onChange={(e) => onChange({ titulo: e.target.value })}
            placeholder="Título"
            className={inputCls}
          />
          <textarea
            value={bloque.texto}
            onChange={(e) => onChange({ texto: e.target.value })}
            rows={5}
            placeholder="Contá quién sos, tu experiencia, tu método…"
            className={inputCls}
          />
          <CampoImagen
            valor={bloque.imagen}
            etiqueta="Foto (opcional)"
            onSubir={onSubirImagen}
            onListo={(url) => onChange({ imagen: url })}
          />
        </div>
      );

    case "servicios":
      return (
        <div className="flex flex-col gap-3">
          <input
            value={bloque.titulo}
            onChange={(e) => onChange({ titulo: e.target.value })}
            placeholder="Título"
            className={inputCls}
          />
          {bloque.items.map((item, i) => (
            <div key={i} className="glass-input rounded-2xl p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-muted">Servicio {i + 1}</span>
                <button
                  type="button"
                  onClick={() =>
                    onChange({ items: bloque.items.filter((_, j) => j !== i) })
                  }
                  className="text-xs text-muted underline underline-offset-4 hover:text-red-400"
                >
                  Quitar
                </button>
              </div>
              <input
                value={item.nombre}
                onChange={(e) =>
                  onChange({
                    items: bloque.items.map((it, j) =>
                      j === i ? { ...it, nombre: e.target.value } : it,
                    ),
                  })
                }
                placeholder="Nombre (ej: Entrenamiento personalizado)"
                className={`${inputCls} mb-2`}
              />
              <textarea
                value={item.descripcion}
                onChange={(e) =>
                  onChange({
                    items: bloque.items.map((it, j) =>
                      j === i ? { ...it, descripcion: e.target.value } : it,
                    ),
                  })
                }
                rows={2}
                placeholder="En qué consiste"
                className={inputCls}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ items: [...bloque.items, { nombre: "", descripcion: "" }] })}
            className="self-start text-sm text-muted underline underline-offset-4 hover:text-foreground"
          >
            + Agregar servicio
          </button>
        </div>
      );

    case "planes":
      return (
        <div className="flex flex-col gap-3">
          <input
            value={bloque.titulo}
            onChange={(e) => onChange({ titulo: e.target.value })}
            placeholder="Título"
            className={inputCls}
          />
          <textarea
            value={bloque.subtitulo}
            onChange={(e) => onChange({ subtitulo: e.target.value })}
            rows={2}
            placeholder="Frase debajo del título (opcional)"
            className={inputCls}
          />
          <p className="text-sm text-muted">
            Los precios salen solos de tus planes activos. Editalos en Planes y la web se
            actualiza sola.
          </p>
        </div>
      );

    case "galeria":
      return (
        <div className="flex flex-col gap-3">
          <input
            value={bloque.titulo}
            onChange={(e) => onChange({ titulo: e.target.value })}
            placeholder="Título"
            className={inputCls}
          />
          {bloque.imagenes.length > 0 && (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {bloque.imagenes.map((url, i) => (
                <li key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="h-20 w-full rounded-xl border border-divider object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onChange({ imagenes: bloque.imagenes.filter((_, j) => j !== i) })
                    }
                    aria-label="Quitar foto"
                    className="absolute right-1 top-1 rounded-md bg-scrim px-1.5 text-xs text-white"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          <CampoImagen
            valor={null}
            etiqueta="Agregar foto"
            onSubir={onSubirImagen}
            onListo={(url) => url && onChange({ imagenes: [...bloque.imagenes, url] })}
          />
        </div>
      );

    case "contacto":
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            value={bloque.titulo}
            onChange={(e) => onChange({ titulo: e.target.value })}
            placeholder="Título"
            className={`${inputCls} sm:col-span-2`}
          />
          <input
            value={bloque.whatsapp}
            onChange={(e) => onChange({ whatsapp: e.target.value })}
            placeholder="WhatsApp (ej: +57 300 1234567)"
            className={inputCls}
          />
          <input
            value={bloque.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="Email"
            className={inputCls}
          />
          <input
            value={bloque.direccion}
            onChange={(e) => onChange({ direccion: e.target.value })}
            placeholder="Dirección"
            className={inputCls}
          />
          <input
            value={bloque.horarios}
            onChange={(e) => onChange({ horarios: e.target.value })}
            placeholder="Horarios (ej: Lun a Vie 6-22h)"
            className={inputCls}
          />
        </div>
      );
  }
}

function CampoImagen({
  valor,
  etiqueta,
  onSubir,
  onListo,
}: {
  valor: string | null;
  etiqueta: string;
  onSubir: (file: File) => Promise<string | null>;
  onListo: (url: string | null) => void;
}) {
  const [subiendo, setSubiendo] = useState(false);

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    const url = await onSubir(file);
    setSubiendo(false);
    e.target.value = "";
    if (url) onListo(url);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {valor && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={valor} alt="" className="h-14 w-20 rounded-xl border border-divider object-cover" />
      )}
      <label className="glass-input cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition-colors hover:border-border-strong">
        {subiendo ? "Subiendo…" : valor ? "Cambiar" : etiqueta}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={subiendo}
          onChange={handle}
          className="hidden"
        />
      </label>
      {valor && (
        <button
          type="button"
          onClick={() => onListo(null)}
          className="text-sm text-muted underline underline-offset-4 hover:text-red-400"
        >
          Quitar
        </button>
      )}
    </div>
  );
}
