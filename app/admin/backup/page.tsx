import { ConfirmButton } from '../Client';
import { importBackup } from '../actions';

export default async function Backup({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  return (
    <>
      {m && <p className="flash">{m}</p>}
      <h1>Backup</h1>
      <div className="card"><a className="btn" href="/admin/backup/export">Exportar JSON</a></div>
      <form action={importBackup} className="card">
        <label>Importar JSON (substitui tudo) <input type="file" name="file" accept=".json,application/json" required /></label>
        <ConfirmButton className="danger" confirm="Isso substitui TODOS os dados atuais. Continuar?">Importar</ConfirmButton>
      </form>
    </>
  );
}
