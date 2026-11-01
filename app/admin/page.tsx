import Link from 'next/link';
import { rows, sql } from '@/lib/db';
import { imc } from '@/lib/util';
import { saveStudent } from './actions';

export default async function Alunos({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const list = await rows(sql()`select id, name, weight_kg, height_m from students order by name`);
  return (
    <>
      {m && <p className="flash">{m}</p>}
      <h1>Alunos</h1>
      <table>
        <thead><tr><th>Nome</th><th>IMC</th><th /></tr></thead>
        <tbody>
          {list.map(r => (
            <tr key={r.id}>
              <td>{r.name}</td><td>{imc(r.weight_kg, r.height_m) ?? '-'}</td>
              <td><Link className="btn" href={`/admin/alunos/${r.id}`}>Abrir</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
      <form action={saveStudent} className="card">
        <h2>Novo aluno</h2>
        <div className="row">
          <label>Nome <input name="name" required /></label>
          <label>Peso (kg) <input name="weight_kg" inputMode="decimal" /></label>
          <label>Altura (m) <input name="height_m" inputMode="decimal" /></label>
          <label>Idade <input name="age" inputMode="numeric" /></label>
        </div>
        <label>Objetivo <textarea name="goal" rows={2} /></label>
        <label>Observações / limitações <textarea name="notes" rows={3} /></label>
        <button>Cadastrar</button>
      </form>
    </>
  );
}
