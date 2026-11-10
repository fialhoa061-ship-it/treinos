import { saveStudent } from '../actions';
import { Flash, Top } from '../ui';
import { StudentFields } from '../fields';

export default async function NovoAluno({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  return (
    <>
      <Flash m={m} />
      <Top title="Novo aluno" sub="O código de acesso é gerado ao salvar" back="/admin/alunos" />
      <form action={saveStudent} className="panel form">
        <StudentFields />
        <button className="btn primary block">Cadastrar aluno</button>
      </form>
    </>
  );
}
