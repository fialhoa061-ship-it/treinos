export function imc(kg: string | null, m: string | null): string | null {
  const w = Number(kg), h = Number(m);
  return w && h ? (w / (h * h)).toFixed(1).replace('.', ',') : null;
}

/** Código de acesso do aluno: 6 dígitos. */
export function newCode(): string {
  return String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
}

/** Sintomas que o aluno pode relatar ao finalizar o treino (chave gravada → texto exibido). */
export const ALERTAS = { dor: 'Dor', tontura: 'Tontura', falta_ar: 'Falta de ar', mal_estar: 'Mal-estar' } as const;
export type Alerta = keyof typeof ALERTAS;

/** Escala de esforço percebido 0–10 (Borg CR10, em linguagem simples). */
export const ESFORCO = ['Repouso', 'Muito, muito leve', 'Leve', 'Moderado', 'Um pouco forte', 'Forte', 'Forte', 'Muito forte', 'Muito forte', 'Quase máximo', 'Máximo'] as const;
