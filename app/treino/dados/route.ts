import { getStudent } from '@/lib/auth';
import { dadosDoAluno, jsonDownload } from '@/lib/dados';

export const dynamic = 'force-dynamic';

// "Baixar meus dados": o aluno logado recebe tudo o que o app guarda sobre ele
export async function GET() {
  const st = await getStudent();
  if (!st) return new Response('Não autorizado', { status: 401 });
  return jsonDownload(await dadosDoAluno(st.id), 'meus-dados-fit-app');
}
