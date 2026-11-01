export function imc(kg: string | null, m: string | null): string | null {
  const w = Number(kg), h = Number(m);
  return w && h ? (w / (h * h)).toFixed(1).replace('.', ',') : null;
}

export function newToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
}

export const TOKEN_RE = /^[a-f0-9]{64}$/;
