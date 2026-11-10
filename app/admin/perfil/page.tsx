import Link from 'next/link';
import { rows, sql } from '@/lib/db';
import { currentProf } from '@/lib/auth';
import Icon from '../../Icon';
import { Flash, initials } from '../ui';
import { logout } from '../../login/actions';
import { changePassword, deleteMyAccount, saveMyName, sendMyResetLink } from '../acoes-conta';

export default async function Perfil({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const me = await currentProf();
  const [{ alunos }] = await rows(sql()`select count(*)::int as alunos from students where owner_id = ${me.id}`);

  return (
    <>
      <Flash m={m} />
      <header className="top"><div className="grow"><h1>Perfil</h1></div></header>

      <section className="panel perfil">
        <span className="avatar xl">{initials(me.name || me.email)}</span>
        <div className="grow">
          <b>{me.name || 'Sem nome'}</b>
          <small>{me.email}</small>
          <span className="tags" style={{ marginTop: 8 }}>
            {me.is_owner && <span className="tag blue">Professor principal</span>}
            <span className="tag">{alunos} {alunos === 1 ? 'aluno' : 'alunos'}</span>
          </span>
        </div>
      </section>

      <section className="panel tight">
        <details>
          <summary className="opt" style={{ borderTop: 0 }}><span><Icon name="edit" size={18} /> Editar nome</span><span className="ibtn sq"><Icon name="right" size={16} /></span></summary>
          <form action={saveMyName} className="form" style={{ paddingBottom: 6 }}>
            <label className="field"><span>Nome</span><input name="name" defaultValue={me.name ?? ''} maxLength={80} autoComplete="name" placeholder="Como os alunos e professores veem você" /></label>
            <button className="btn primary">Salvar nome</button>
          </form>
        </details>
        <details>
          <summary className="opt"><span><Icon name="refresh" size={18} /> Alterar senha</span><span className="ibtn sq"><Icon name="right" size={16} /></span></summary>
          <form action={changePassword} className="form" style={{ paddingBottom: 6 }}>
            <label className="field"><span>Senha atual</span><input type="password" name="current" required autoComplete="current-password" /></label>
            <label className="field"><span>Senha nova (mín. 8 caracteres)</span><input type="password" name="password" required minLength={8} autoComplete="new-password" /></label>
            <label className="field"><span>Repita a senha nova</span><input type="password" name="confirm" required minLength={8} autoComplete="new-password" /></label>
            <button className="btn primary">Alterar senha</button>
          </form>
          <form action={sendMyResetLink} className="esqueci">
            <span>Não lembra a senha atual?</span>
            <button className="link">Esqueci minha senha atual</button>
          </form>
        </details>
        {me.is_owner && (
          <Link className="opt" href="/admin/professores"><span><Icon name="users" size={18} /> Professores</span><span className="ibtn sq"><Icon name="right" size={16} /></span></Link>
        )}
        <Link className="opt" href="/admin/backup"><span><Icon name="archive" size={18} /> Backup dos meus alunos</span><span className="ibtn sq"><Icon name="right" size={16} /></span></Link>
        <Link className="opt" href="/privacidade"><span><Icon name="info" size={18} /> Política de privacidade</span><span className="ibtn sq"><Icon name="right" size={16} /></span></Link>
      </section>

      <form action={logout}>
        <button className="btn soft block"><Icon name="logout" size={18} />Sair</button>
      </form>

      {me.is_owner ? (
        <p className="muted perfil-nota">Como professor principal, sua conta não pode ser excluída: o app ficaria sem responsável.</p>
      ) : (
        <details className="add danger-zone">
          <summary><Icon name="trash" size={18} />Excluir minha conta</summary>
          <div className="body">
            <form action={deleteMyAccount} className="form">
              <p className="fb-warn"><Icon name="info" size={16} />
                {alunos > 0
                  ? `Isso apaga sua conta e ${alunos === 1 ? 'o seu único aluno' : `os seus ${alunos} alunos`}, com todos os treinos, cargas e avaliações. Não pode ser desfeito. Se quiser, faça um backup antes.`
                  : 'Isso apaga sua conta e não pode ser desfeito.'}
              </p>
              <label className="field"><span>Sua senha</span><input type="password" name="password" required autoComplete="current-password" /></label>
              <label className="field"><span>Digite EXCLUIR para confirmar</span><input name="palavra" required autoComplete="off" autoCapitalize="characters" placeholder="EXCLUIR" pattern="[Ee][Xx][Cc][Ll][Uu][Ii][Rr]" /></label>
              <label className="check">
                <input type="checkbox" name="entendo" value="1" required />
                <span>Entendo que {alunos > 0 ? 'os meus alunos e todo o histórico deles serão apagados' : 'minha conta será apagada'} para sempre.</span>
              </label>
              <button className="btn danger block"><Icon name="trash" size={18} />Excluir minha conta</button>
            </form>
          </div>
        </details>
      )}
    </>
  );
}
