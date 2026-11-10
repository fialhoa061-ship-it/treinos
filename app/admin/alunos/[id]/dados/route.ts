import { adminId } from '@/lib/auth';
import { rows, sql } from '@/lib/db';
import { dadosDoAluno, jsonDownload } from '@/lib/dados';

export const dynamic = 'force-dynamic';

// dados de um aluno do professor logado (para atender um pedido de acesso ou portabilidade)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = await adminId();
  if (!uid) return new Response('Não autorizado', { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) return new Response('Não encontrado', { status: 404 });
  const [st] = await rows(sql()`select id from students where id = ${id} and owner_id = ${uid}`);
  if (!st) return new Response('Não encontrado', { status: 404 });
  return jsonDownload(await dadosDoAluno(id), `dados-aluno-${id}`);
}
