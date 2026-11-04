import Icon from '../../Icon';
import { ConfirmButton } from '../Client';
import { importBackup } from '../actions';
import { Flash, Top } from '../ui';

export default async function Backup({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  return (
    <>
      <Flash m={m} />
      <Top title="Backup" sub="Guarde uma cópia de todos os alunos, treinos e cargas" />

      <section className="panel form">
        <div className="wo-h">
          <span className="dot"><Icon name="download" size={22} /></span>
          <div className="grow"><h3>Exportar</h3><small>Baixa um arquivo JSON com tudo. Ele inclui os códigos dos alunos: guarde em lugar seguro.</small></div>
        </div>
        <a className="btn primary block" href="/admin/backup/export"><Icon name="download" size={20} />Baixar backup</a>
      </section>

      <form action={importBackup} className="panel form">
        <div className="wo-h">
          <span className="dot" style={{ color: 'var(--danger)' }}><Icon name="upload" size={22} /></span>
          <div className="grow"><h3>Importar</h3><small>Substitui <strong>todos</strong> os dados atuais pelos do arquivo.</small></div>
        </div>
        <label className="field"><span>Arquivo de backup (.json)</span><input type="file" name="file" accept=".json,application/json" required /></label>
        <ConfirmButton className="btn danger block" confirm="Isso substitui TODOS os dados atuais. Continuar?">Importar e substituir tudo</ConfirmButton>
      </form>
    </>
  );
}
