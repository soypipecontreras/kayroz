// Vocabulario compartido de disciplinas, niveles, objetivos y modalidades.
// Espeja los CHECK constraints de la migración 20260824000000_multidisciplina:
// si se agrega un valor acá hay que agregarlo también en el esquema.

export const DISCIPLINAS = ["gimnasio", "calistenia", "crossfit", "hyrox", "funcional"] as const;
export type Disciplina = (typeof DISCIPLINAS)[number];

export const NIVELES = ["principiante", "intermedio", "avanzado"] as const;
export type Nivel = (typeof NIVELES)[number];

export const OBJETIVOS = [
  "fuerza",
  "hipertrofia",
  "resistencia",
  "perdida_grasa",
  "salud_general",
  "competencia",
] as const;
export type Objetivo = (typeof OBJETIVOS)[number];

export const MODALIDADES = ["series", "amrap", "emom", "fortime", "circuito"] as const;
export type Modalidad = (typeof MODALIDADES)[number];

// Etiquetas para UI. Los valores en el esquema van sin tildes/ñ a propósito
// (son identificadores); acá se les pone la cara humana.
export const DISCIPLINA_LABEL: Record<Disciplina, string> = {
  gimnasio: "Gimnasio",
  calistenia: "Calistenia",
  crossfit: "CrossFit",
  hyrox: "Hyrox",
  funcional: "Funcional",
};

export const NIVEL_LABEL: Record<Nivel, string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

export const OBJETIVO_LABEL: Record<Objetivo, string> = {
  fuerza: "Fuerza",
  hipertrofia: "Hipertrofia",
  resistencia: "Resistencia",
  perdida_grasa: "Pérdida de grasa",
  salud_general: "Salud general",
  competencia: "Competencia",
};

export const MODALIDAD_LABEL: Record<Modalidad, string> = {
  series: "Series y reps",
  amrap: "AMRAP",
  emom: "EMOM",
  fortime: "Por tiempo",
  circuito: "Circuito",
};

export function esDisciplina(v: string): v is Disciplina {
  return (DISCIPLINAS as readonly string[]).includes(v);
}
export function esNivel(v: string): v is Nivel {
  return (NIVELES as readonly string[]).includes(v);
}
export function esObjetivo(v: string): v is Objetivo {
  return (OBJETIVOS as readonly string[]).includes(v);
}
export function esModalidad(v: string): v is Modalidad {
  return (MODALIDADES as readonly string[]).includes(v);
}
