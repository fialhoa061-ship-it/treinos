import { neon } from '@neondatabase/serverless';

let _sql: ReturnType<typeof neon> | null = null;
// inicialização preguiçosa: `next build` não pode falhar sem DATABASE_URL
export function sql() {
  return (_sql ??= neon(process.env.DATABASE_URL!));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

export async function rows(q: PromiseLike<unknown>): Promise<Row[]> {
  return (await q) as Row[];
}
