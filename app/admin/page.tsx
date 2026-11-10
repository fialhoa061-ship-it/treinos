import Link from 'next/link';
import { rows, sql } from '@/lib/db';
import { currentProf } from '@/lib/auth';
import { ALERTAS, validade, type Alerta } from '@/lib/util';
import Icon, { type IconName } from '../Icon';
import { Act, Flash, initials } from './ui';
import { dismissEvent } from './acoes-conta';

type Aluno = {
  id: number; name: string; ultimo: string | null; semana: number; esforco: number | null; alertas: Alerta[] | null;
  plan: string | null; aval: string | null; consent: boolean; exclusao: string | null;
};

const dias = (d: string | null) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400_000) : null);
const nomes = (l: Alerta[]) => l.map(a => ALERTAS[a] ?? a).join(', ');
const quando = (n: number) => (n <= 0 ? 'hoje' : n === 1 ? 'ontem' : `há ${n} dias`);

/** Painel da semana do professor: o que fazer hoje, num lugar só. */
export default async function Painel({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const me = await currentProf();
  // avisos para o principal: professores que excluíram a própria conta (até ele marcar como visto)
  const avisos = me.is_owner ? await rows(sql()`select id, user_email, user_name, students, created_at from account_events
    where kind = 'excluiu_conta' and seen_at is null order by created_at desc`) : [];
  const list = await rows(sql()`
    select s.id, s.name,
      (select max(finished_at) from sessions se where se.student_id = s.id) as ultimo,
      (select count(*)::int from sessions se where se.student_id = s.id and se.finished_at > now() - interval '7 days') as semana,
      (select round(avg(effort), 1)::float from sessions se where se.student_id = s.id and se.effort is not null and se.finished_at > now() - interval '7 days') as esforco,
      (select array_agg(distinct a) from sessions se, unnest(se.alerts) a where se.student_id = s.id and se.finished_at > now() - interval '7 days') as alertas,
      to_char(s.plan_until, 'YYYY-MM-DD') as plan,
      (select max(measured_on)::text from assessments a where a.student_id = s.id) as aval,
      (s.consent_at is not null) as consent, s.delete_requested_at as exclusao
    from students s where s.owner_id = ${me.id} order by s.name`) as Aluno[];

  const total = list.length;
  const ativos = list.filter(a => a.semana > 0).length;
  const treinos = list.reduce((n, a) => n + a.semana, 0);
  const comEsforco = list.filter(a => a.esforco != null);
  const esforco = comEsforco.length ? comEsforco.reduce((n, a) => n + a.esforco!, 0) / comEsforco.length : null;

  const exclusao = list.filter(a => a.exclusao);
  const sintomas = list.filter(a => a.alertas?.length);
  const sumidos = list.filter(a => a.consent && (a.ultimo == null || dias(a.ultimo)! > 7)).sort((a, b) => (dias(b.ultimo) ?? 9999) - (dias(a.ultimo) ?? 9999));
  const fichas = list.map(a => ({ a, v: validade(a.plan) })).filter(x => x.v && (x.v.vencido || x.v.perto)).sort((x, y) => x.v!.dias - y.v!.dias);
  const reavaliar = list.filter(a => a.aval == null || dias(a.aval)! > 60);
  const semTermo = list.filter(a => !a.consent);
  const pendencias = sintomas.length + sumidos.length + fichas.length + reavaliar.length + exclusao.length;

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' });
  const first = (me.name || '').trim().split(/\s+/)[0];

  return (
    <>
      <Flash m={m} />
      <header className="top">
        <span className="avatar on" aria-hidden="true">{initials(me.name || me.email)}</span>
        <div className="grow"><h1>{first ? `Olá, ${first}!` : 'Olá!'}</h1><p>{hoje.charAt(0).toUpperCase() + hoje.slice(1)}</p></div>
      </header>

      {avisos.length > 0 && (
        <Bloco titulo={avisos.length === 1 ? 'Um professor excluiu a conta' : 'Professores excluíram a conta'} icon="users" tom="warn"
          nota="A conta e os alunos dele foram apagados pelo próprio professor.">
          {avisos.map(e => (
            <div className="pn-row" key={e.id}>
              <span className="avatar">{initials(e.user_name || e.user_email)}</span>
              <span className="grow">
                <b>{e.user_name || e.user_email}</b>
                <small>{new Date(e.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · {e.students} {e.students === 1 ? 'aluno apagado' : 'alunos apagados'}{e.user_name ? ` · ${e.user_email}` : ''}</small>
              </span>
              <Act action={dismissEvent} fields={{ id: e.id }} cls="btn sm" label="Ok, visto" />
            </div>
          ))}
        </Bloco>
      )}

      {total === 0 ? (
        <div className="panel empty">
          <span className="dot"><Icon name="users" size={28} /></span>
          <h2>Comece pelo primeiro aluno</h2>
          <p>Cadastre um aluno, monte a ficha (ou aplique um modelo pronto) e envie o código de acesso pelo WhatsApp.</p>
          <Link className="btn primary" href="/admin/novo"><Icon name="plus" size={18} />Cadastrar aluno</Link>
        </div>
      ) : (
        <>
          <section className="panel today" aria-label="Resumo da semana">
            <div className="label"><h2>Últimos 7 dias</h2><span className="tag">{total} {total === 1 ? 'aluno' : 'alunos'}</span></div>
            <div className="meter">
              <p className="big">{ativos}<small> de {total} treinaram</small></p>
              <div className="bar-w">
                <span>{Math.round((ativos / total) * 100)}%</span>
                <div className="bar" role="progressbar" aria-valuenow={Math.round((ativos / total) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Alunos que treinaram">
                  <i style={{ '--p': `${Math.round((ativos / total) * 100)}%` } as React.CSSProperties} />
                </div>
              </div>
            </div>
            <div className="trio">
              <div><span>Treinos feitos</span><b>{treinos}</b></div>
              <div><span>Esforço médio</span><b>{esforco != null ? `${esforco.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}/10` : '—'}</b></div>
              <div><span>Pendências</span><b>{pendencias}</b></div>
            </div>
          </section>

          {exclusao.length > 0 && (
            <Bloco titulo="Pedidos de exclusão de dados" icon="trash" tom="warn" nota="O aluno pediu para apagar os dados (LGPD). Abra o aluno e exclua o cadastro.">
              {exclusao.map(a => <Linha key={a.id} a={a} info={`pedido ${quando(dias(a.exclusao)!)}`} href={`/admin/alunos/${a.id}#privacidade`} />)}
            </Bloco>
          )}

          {sintomas.length > 0 && (
            <Bloco titulo="Sintomas relatados" icon="info" tom="warn">
              {sintomas.map(a => <Linha key={a.id} a={a} info={nomes(a.alertas!)} href={`/admin/alunos/${a.id}#retorno`} />)}
            </Bloco>
          )}

          {fichas.length > 0 && (
            <Bloco titulo="Trocar a ficha" icon="calendar">
              {fichas.map(({ a, v }) => <Linha key={a.id} a={a} info={v!.vencido ? `vencida há ${-v!.dias} ${-v!.dias === 1 ? 'dia' : 'dias'}` : v!.dias === 0 ? 'vence hoje' : `vence em ${v!.dias} ${v!.dias === 1 ? 'dia' : 'dias'}`} warn={v!.vencido} href={`/admin/alunos/${a.id}`} />)}
            </Bloco>
          )}

          {sumidos.length > 0 && (
            <Bloco titulo="Sem treinar há mais de 7 dias" icon="clock">
              {sumidos.map(a => <Linha key={a.id} a={a} info={a.ultimo ? `último há ${dias(a.ultimo)} dias` : 'ainda não treinou'} href={`/admin/alunos/${a.id}`} />)}
            </Bloco>
          )}

          {reavaliar.length > 0 && (
            <Bloco titulo="Avaliação física" icon="chart" nota="Sem avaliação ou com a última há mais de 60 dias.">
              {reavaliar.map(a => <Linha key={a.id} a={a} info={a.aval ? `última há ${dias(a.aval)} dias` : 'nunca avaliado'} href={`/admin/alunos/${a.id}#avaliacao`} />)}
            </Bloco>
          )}

          {semTermo.length > 0 && (
            <Bloco titulo="Ainda não entraram no app" icon="mail" nota="O aluno ainda não aceitou o termo, ou seja, não acessou com o código. Reenvie o código pelo WhatsApp.">
              {semTermo.map(a => <Linha key={a.id} a={a} info="aguardando primeiro acesso" href={`/admin/alunos/${a.id}`} />)}
            </Bloco>
          )}

          {pendencias === 0 && (
            <div className="panel empty">
              <span className="dot"><Icon name="check" size={28} /></span>
              <h2>Tudo em dia</h2>
              <p>Nenhum sintoma relatado, nenhuma ficha vencendo e todos treinaram nesta semana.</p>
            </div>
          )}
        </>
      )}
    </>
  );
}

function Bloco({ titulo, icon, tom, nota, children }: { titulo: string; icon: IconName; tom?: 'warn'; nota?: string; children: React.ReactNode }) {
  return (
    <section className={tom === 'warn' ? 'panel tight pn warn' : 'panel tight pn'}>
      <h2><Icon name={icon} size={18} />{titulo}</h2>
      {nota && <p className="pn-nota">{nota}</p>}
      <div className="pn-list">{children}</div>
    </section>
  );
}

function Linha({ a, info, href, warn }: { a: { id: number; name: string }; info: string; href: string; warn?: boolean }) {
  return (
    <Link className="pn-row" href={href}>
      <span className="avatar">{initials(a.name)}</span>
      <span className="grow"><b>{a.name}</b><small className={warn ? 'pn-warn' : undefined}>{info}</small></span>
      <Icon name="right" size={18} />
    </Link>
  );
}
