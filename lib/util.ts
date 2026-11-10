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

/** Validade da ficha: dias até a data de troca (negativo = vencido). Datas 'YYYY-MM-DD', fuso de Brasília. */
export function validade(d: string | null | undefined): { dias: number; texto: string; vencido: boolean; perto: boolean } | null {
  if (!d) return null;
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const dias = Math.round((Date.parse(d) - Date.parse(hoje)) / 86400_000);
  const n = Math.abs(dias), u = n === 1 ? 'dia' : 'dias';
  const texto = dias < 0 ? `Treino vencido há ${n} ${u}` : dias === 0 ? 'Trocar o treino hoje' : `Trocar o treino em ${n} ${u}`;
  return { dias, texto, vencido: dias < 0, perto: dias >= 0 && dias <= 7 };
}

/** Versão do termo de consentimento (LGPD). Ao mudar o texto da política, suba o número: todos aceitam de novo. */
export const TERMO_VERSAO = 1;
