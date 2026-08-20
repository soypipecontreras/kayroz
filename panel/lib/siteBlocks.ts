// Los bloques con los que un entrenador arma su web. Este archivo es la única
// fuente de verdad del formato: lo usan el editor, el guardado y la página
// pública. Si se agrega un tipo, se agrega acá primero.
//
// El contenido se guarda como jsonb, así que viene sin garantías de tipo desde
// la base: `normalizarBloques` lo sanea siempre antes de usarlo. Nunca confiar
// en la forma de lo que sale de `org_sites.bloques`.

export type BloqueTipo = "hero" | "sobre" | "servicios" | "planes" | "galeria" | "contacto";

export interface BloqueHero {
  tipo: "hero";
  titulo: string;
  subtitulo: string;
  imagen: string | null;
  cta: string;
}

export interface BloqueSobre {
  tipo: "sobre";
  titulo: string;
  texto: string;
  imagen: string | null;
}

export interface ItemServicio {
  nombre: string;
  descripcion: string;
}

export interface BloqueServicios {
  tipo: "servicios";
  titulo: string;
  items: ItemServicio[];
}

export interface BloquePlanes {
  tipo: "planes";
  titulo: string;
  subtitulo: string;
}

export interface BloqueGaleria {
  tipo: "galeria";
  titulo: string;
  imagenes: string[];
}

export interface BloqueContacto {
  tipo: "contacto";
  titulo: string;
  whatsapp: string;
  email: string;
  direccion: string;
  horarios: string;
}

export type Bloque =
  | BloqueHero
  | BloqueSobre
  | BloqueServicios
  | BloquePlanes
  | BloqueGaleria
  | BloqueContacto;

export const BLOQUES_DISPONIBLES: { tipo: BloqueTipo; nombre: string; descripcion: string }[] = [
  { tipo: "hero", nombre: "Portada", descripcion: "Título grande, frase y foto de fondo." },
  { tipo: "sobre", nombre: "Sobre nosotros", descripcion: "Un texto contando quién sos." },
  { tipo: "servicios", nombre: "Servicios", descripcion: "Lista de lo que ofrecés." },
  { tipo: "planes", nombre: "Planes y precios", descripcion: "Toma tus planes activos, solo." },
  { tipo: "galeria", nombre: "Galería", descripcion: "Fotos del lugar o de tus clientes." },
  { tipo: "contacto", nombre: "Contacto", descripcion: "WhatsApp, email, dirección y horarios." },
];

export function bloqueVacio(tipo: BloqueTipo): Bloque {
  switch (tipo) {
    case "hero":
      return { tipo, titulo: "", subtitulo: "", imagen: null, cta: "Quiero empezar" };
    case "sobre":
      return { tipo, titulo: "Sobre nosotros", texto: "", imagen: null };
    case "servicios":
      return { tipo, titulo: "Servicios", items: [{ nombre: "", descripcion: "" }] };
    case "planes":
      return { tipo, titulo: "Planes", subtitulo: "" };
    case "galeria":
      return { tipo, titulo: "Galería", imagenes: [] };
    case "contacto":
      return { tipo, titulo: "Contacto", whatsapp: "", email: "", direccion: "", horarios: "" };
  }
}

export function nombreDeBloque(tipo: BloqueTipo): string {
  return BLOQUES_DISPONIBLES.find((b) => b.tipo === tipo)?.nombre ?? tipo;
}

function str(v: unknown, max = 2000): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function strOrNull(v: unknown, max = 500): string | null {
  return typeof v === "string" && v.trim() ? v.slice(0, max) : null;
}

// Sanea lo que venga del jsonb (o del navegador) a la forma esperada. Recorta
// largos para que nadie pueda guardar un texto de 5 MB en un campo de título,
// y descarta tipos que no conocemos en vez de romper el render.
export function normalizarBloques(raw: unknown): Bloque[] {
  if (!Array.isArray(raw)) return [];
  const out: Bloque[] = [];

  for (const b of raw.slice(0, 30)) {
    if (typeof b !== "object" || b === null) continue;
    const o = b as Record<string, unknown>;

    switch (o.tipo) {
      case "hero":
        out.push({
          tipo: "hero",
          titulo: str(o.titulo, 120),
          subtitulo: str(o.subtitulo, 300),
          imagen: strOrNull(o.imagen),
          cta: str(o.cta, 40),
        });
        break;
      case "sobre":
        out.push({
          tipo: "sobre",
          titulo: str(o.titulo, 120),
          texto: str(o.texto, 3000),
          imagen: strOrNull(o.imagen),
        });
        break;
      case "servicios":
        out.push({
          tipo: "servicios",
          titulo: str(o.titulo, 120),
          items: (Array.isArray(o.items) ? o.items : []).slice(0, 20).map((it) => {
            const i = (typeof it === "object" && it !== null ? it : {}) as Record<string, unknown>;
            return { nombre: str(i.nombre, 100), descripcion: str(i.descripcion, 400) };
          }),
        });
        break;
      case "planes":
        out.push({
          tipo: "planes",
          titulo: str(o.titulo, 120),
          subtitulo: str(o.subtitulo, 300),
        });
        break;
      case "galeria":
        out.push({
          tipo: "galeria",
          titulo: str(o.titulo, 120),
          imagenes: (Array.isArray(o.imagenes) ? o.imagenes : [])
            .slice(0, 12)
            .filter((x): x is string => typeof x === "string" && x.length > 0),
        });
        break;
      case "contacto":
        out.push({
          tipo: "contacto",
          titulo: str(o.titulo, 120),
          whatsapp: str(o.whatsapp, 30),
          email: str(o.email, 120),
          direccion: str(o.direccion, 200),
          horarios: str(o.horarios, 300),
        });
        break;
      default:
        // Tipo desconocido: se ignora en vez de romper la página entera.
        break;
    }
  }
  return out;
}

// Deja solo dígitos: wa.me no acepta espacios, guiones ni el +.
export function telefonoWhatsapp(raw: string): string {
  return raw.replace(/\D/g, "");
}
