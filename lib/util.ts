export function imc(kg: string | null, m: string | null): string | null {
  const w = Number(kg), h = Number(m);
  return w && h ? (w / (h * h)).toFixed(1).replace('.', ',') : null;
}

// código secreto do link: 12 caracteres [a-z0-9] (~62 bits), sem viés de módulo
const ALPHA = 'abcdefghijklmnopqrstuvwxyz0123456789';
export function newToken(): string {
  let out = '';
  while (out.length < 12) {
    for (const b of crypto.getRandomValues(new Uint8Array(24))) {
      if (b < 252 && out.length < 12) out += ALPHA[b % 36];
    }
  }
  return out;
}

export const TOKEN_RE = /^[a-z0-9]{12}$/;

/** "Mãe Silva" -> "mae-silva" */
export function slugify(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'aluno';
}

/** Caminho do link do aluno: /nome-fitapp-<código>. Só o código autentica; o nome é cosmético. */
export const studentPath = (name: string, token: string) => `/${slugify(name)}-fitapp-${token}`;

/** Extrai o código de um link/caminho colado, ou de um código puro. */
export function tokenFromLink(s: string): string | null {
  const t = s.trim().toLowerCase();
  return t.match(/-fitapp-([a-z0-9]{12})/)?.[1] ?? (TOKEN_RE.test(t) ? t : null);
}
