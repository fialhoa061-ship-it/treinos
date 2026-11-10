import { redirect } from 'next/navigation';
import { rows, sql } from '@/lib/db';
import { currentProf } from '@/lib/auth';
import Icon from '../../Icon';
import { Act, Flash, Top, initials } from '../ui';
import { disableProfessor, enableProfessor, inviteProfessor, removeProfessor, revokeInvite } from '../acoes-conta';

const dt = (d: string) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

/** Professores (só o principal): convidar, desligar/religar e excluir, sempre confirmando com a senha. */
export default async function Professores({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const me = await currentProf();
  if (!me.is_owner) redirect('/admin/perfil');
  const s = sql();
  const [profs, convites, eventos] = await Promise.all([
    rows(s`select u.id, u.email, u.name, u.is_owner, u.disabled_at, (select count(*)::int from students st where st.owner_id = u.id) as alunos
      from users u order by u.is_owner desc, (u.disabled_at is not null), u.name nulls last, u.email`),
    rows(s`select id, email, to_char(expires_at at time zone 'America/Sao_Paulo', 'DD/MM') as ate, (expires_at < now()) as vencido from invites where accepted_at is null order by created_at desc`),
    rows(s`select id, user_email, user_name, students, created_at from account_events where kind = 'excluiu_conta' order by created_at desc limit 20`),
  ]);

  return (
    <>
      <Flash m={m} />
      <Top title="Professores" sub="Cada professor vê e gerencia só os próprios alunos" back="/admin/perfil" />

      <div className="list">
        {profs.map(p => (
          <details className={p.disabled_at ? 'exr off' : 'exr'} key={p.id}>
            <summary>
              <span className="avatar">{initials(p.name || p.email)}</span>
              <span className="grow">
                <b>{p.name || p.email}{p.id === me.id ? ' (você)' : ''}</b>
                <small>{p.is_owner ? 'Principal · ' : p.disabled_at ? `Desligado em ${dt(p.disabled_at)} · ` : ''}{p.alunos} {p.alunos === 1 ? 'aluno' : 'alunos'}{p.name ? ` · ${p.email}` : ''}</small>
              </span>
              {!p.is_owner && <span className="ibtn sq"><Icon name="right" size={16} /></span>}
            </summary>
            {!p.is_owner && (
              <div className="body">
                {p.disabled_at ? (
                  <form action={enableProfessor} className="form">
                    <input type="hidden" name="id" value={p.id} />
                    <p className="muted" style={{ fontSize: '.88rem' }}>O acesso está desligado: ele não consegue entrar, mas os alunos e o histórico continuam guardados.</p>
                    <label className="field"><span>Sua senha para confirmar</span><input type="password" name="password" required autoComplete="current-password" /></label>
                    <button className="btn primary"><Icon name="check" size={18} />Religar acesso</button>
                  </form>
                ) : (
                  <form action={disableProfessor} className="form">
                    <input type="hidden" name="id" value={p.id} />
                    <p className="muted" style={{ fontSize: '.88rem' }}>Desligar impede que {p.name || 'ele'} entre no app. Nada é apagado: os {p.alunos} alunos continuam treinando e você pode religar quando quiser.</p>
                    <label className="field"><span>Sua senha para confirmar</span><input type="password" name="password" required autoComplete="current-password" /></label>
                    <button className="btn danger"><Icon name="logout" size={18} />Desligar acesso</button>
                  </form>
                )}
                {p.alunos === 0 && (
                  <form action={removeProfessor} className="form">
                    <input type="hidden" name="id" value={p.id} />
                    <p className="muted" style={{ fontSize: '.88rem' }}>Sem alunos, este professor também pode ser excluído de vez.</p>
                    <label className="field"><span>Sua senha para excluir</span><input type="password" name="password" required autoComplete="current-password" /></label>
                    <button className="btn danger"><Icon name="trash" size={18} />Excluir professor</button>
                  </form>
                )}
              </div>
            )}
          </details>
        ))}
      </div>

      <section className="panel" aria-labelledby="conv-t">
        <div className="panel-h"><h2 id="conv-t">Convites</h2></div>
        {convites.length > 0 && (
          <div className="pn-list" style={{ marginBottom: 12 }}>
            {convites.map(c => (
              <div className="pn-row" key={c.id}>
                <span className="dot" style={{ width: 40, height: 40 }}><Icon name="mail" size={18} /></span>
                <span className="grow"><b>{c.email}</b><small className={c.vencido ? 'pn-warn' : undefined}>{c.vencido ? 'Convite expirado' : `Vale até ${c.ate}`}</small></span>
                <Act action={revokeInvite} fields={{ id: c.id }} cls="ibtn sq danger" title="Cancelar convite" label={<Icon name="trash" size={15} />} confirm={`Cancelar o convite de ${c.email}?`} />
              </div>
            ))}
          </div>
        )}
        <form action={inviteProfessor} className="form">
          <label className="field"><span>Convidar professor por e-mail</span><input type="email" name="email" required placeholder="professor@email.com" autoComplete="off" /></label>
          <p className="muted" style={{ fontSize: '.85rem' }}>Ele recebe um link (vale 7 dias) para criar nome e senha. A biblioteca e os modelos prontos são compartilhados; os alunos, não.</p>
          <button className="btn primary"><Icon name="mail" size={18} />Enviar convite</button>
        </form>
      </section>

      {eventos.length > 0 && (
        <section className="panel" aria-labelledby="hist-t">
          <div className="panel-h"><h2 id="hist-t">Contas excluídas</h2></div>
          <div className="hist">
            {eventos.map(e => (
              <div key={e.id}><span>{dt(e.created_at)}</span><b>{e.user_name || e.user_email} · {e.students} {e.students === 1 ? 'aluno apagado' : 'alunos apagados'}</b></div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
