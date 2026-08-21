// Recomendador de rutinas: puntúa las plantillas de la Biblioteca Kayroz
// contra el perfil del atleta. Reglas explícitas, sin LLM — el catálogo es
// chico y las razones se le muestran al atleta tal cual ("coincide con tu
// nivel"), así que tienen que ser explicables.

import { DISCIPLINA_LABEL, NIVEL_LABEL, OBJETIVO_LABEL, type Disciplina, type Nivel, type Objetivo } from "@/lib/disciplinas";

export interface PerfilAtleta {
  objetivo: Objetivo | null;
  nivel: Nivel | null;
  disciplinas: Disciplina[];
  dias_semana: number | null;
}

export interface TemplateParaRecomendar {
  id: string;
  nombre: string;
  descripcion: string | null;
  disciplina: Disciplina;
  nivel: Nivel | null;
  objetivo: Objetivo | null;
  modalidad: string;
  duracion_min: number | null;
  dias_semana: number | null;
}

export interface Recomendacion<T extends TemplateParaRecomendar> {
  template: T;
  score: number;
  razones: string[];
}

const ORDEN_NIVEL: Record<Nivel, number> = { principiante: 0, intermedio: 1, avanzado: 2 };

// Con perfil vacío igual devuelve algo (score 0 para todas, orden estable):
// la página de recomendadas invita a completar el perfil pero no se queda en
// blanco. Un nivel a más de un escalón de distancia descarta la plantilla —
// recomendar Fran a un principiante es la clase de error que rompe confianza.
export function recomendar<T extends TemplateParaRecomendar>(
  perfil: PerfilAtleta,
  templates: T[],
): Recomendacion<T>[] {
  const resultado: Recomendacion<T>[] = [];

  for (const t of templates) {
    let score = 0;
    const razones: string[] = [];

    if (perfil.disciplinas.length > 0) {
      if (perfil.disciplinas.includes(t.disciplina)) {
        score += 3;
        razones.push(`Es de ${DISCIPLINA_LABEL[t.disciplina]}, una de tus disciplinas`);
      } else {
        score -= 2;
      }
    }

    if (perfil.nivel && t.nivel) {
      const distancia = Math.abs(ORDEN_NIVEL[perfil.nivel] - ORDEN_NIVEL[t.nivel]);
      if (distancia === 0) {
        score += 2;
        razones.push(`Pensada para nivel ${NIVEL_LABEL[t.nivel].toLowerCase()}, como el tuyo`);
      } else if (distancia === 1 && ORDEN_NIVEL[t.nivel] < ORDEN_NIVEL[perfil.nivel]) {
        // Un escalón por debajo sirve (volumen fácil); uno por encima no se
        // premia y dos escalones en cualquier dirección descartan.
        score += 1;
      } else if (distancia > 1) {
        continue;
      }
    }

    if (perfil.objetivo && t.objetivo) {
      if (perfil.objetivo === t.objetivo) {
        score += 2;
        razones.push(`Apunta a ${OBJETIVO_LABEL[t.objetivo].toLowerCase()}, tu objetivo`);
      }
    }

    if (perfil.dias_semana && t.dias_semana) {
      if (Math.abs(perfil.dias_semana - t.dias_semana) <= 1) {
        score += 1;
        razones.push(`Encaja con tus ${perfil.dias_semana} días por semana`);
      }
    }

    resultado.push({ template: t, score, razones });
  }

  // Orden estable: score desc, después nombre — así dos renders seguidos no
  // barajan las tarjetas.
  resultado.sort((a, b) => b.score - a.score || a.template.nombre.localeCompare(b.template.nombre));
  return resultado;
}
