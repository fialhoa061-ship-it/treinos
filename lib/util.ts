export function imc(kg: string | null, m: string | null): string | null {
  const w = Number(kg), h = Number(m);
  return w && h ? (w / (h * h)).toFixed(1).replace('.', ',') : null;
}

/** Código de acesso do aluno: 6 dígitos. */
export function newCode(): string {
  return String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
}
