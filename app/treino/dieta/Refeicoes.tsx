'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import Icon from '../../Icon';
import { marcarAgua, marcarRefeicao } from './actions';

export type Refeicao = { id: number; name: string; time_hint: string | null; done: boolean; items: { food: string; quantity: string | null; notes: string | null }[] };

/** "07:30", "7h30", "7h" → minutos do dia; null se não der para entender. */
function minutos(h: string | null): number | null {
  const m = h?.match(/(\d{1,2})\s*[:h]\s*(\d{2})?/i);
  if (!m) return null;
  const t = Number(m[1]) * 60 + Number(m[2] ?? 0);
  return t < 24 * 60 ? t : null;
}

/** Hora atual em Brasília, em minutos do dia. */
function agora(): number {
  const [h, m] = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date()).split(':');
  return Number(h) * 60 + Number(m);
}

const litros = (copos: number) => (copos * 0.25).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

/** Refeições do dia e água: o aluno marca o que fez; o resumo, a próxima refeição e os copos respondem na hora. */
export default function Refeicoes({ meals, aguaHoje, aguaMeta, primeiraVez }: { meals: Refeicao[]; aguaHoje: number; aguaMeta: number; primeiraVez: boolean }) {
  const [done, setDone] = useState<Record<number, boolean>>(() => Object.fromEntries(meals.map(m => [m.id, m.done])));
  const [aberta, setAberta] = useState<Record<number, boolean>>({});
  const [erro, setErro] = useState(false);
  const [proxima, setProxima] = useState<{ id: number; agora: boolean } | null>(null);
  const [, start] = useTransition();
  const router = useRouter(); // depois de salvar, atualiza a semana (feita no servidor) sem recarregar a tela
  const feitas = meals.filter(m => done[m.id]).length;
  const completo = meals.length > 0 && feitas === meals.length;
  const semItens = meals.every(m => m.items.length === 0);

  // próxima refeição pelo relógio de Brasília (só no navegador, para não divergir da página gerada no servidor)
  useEffect(() => {
    const calcula = () => {
      const t = agora();
      const pendentes = meals.filter(m => !done[m.id]);
      const alvo = pendentes.find(m => { const h = minutos(m.time_hint); return h === null || h >= t - 60; }) ?? pendentes[0];
      const h = alvo ? minutos(alvo.time_hint) : null;
      setProxima(alvo ? { id: alvo.id, agora: h !== null && Math.abs(h - t) <= 60 } : null);
    };
    calcula();
    const id = setInterval(calcula, 60_000);
    return () => clearInterval(id);
  }, [meals, done]);

  function toggle(id: number) {
    const on = !done[id];
    setDone(d => ({ ...d, [id]: on })); // responde na hora; volta atrás se o servidor recusar
    setErro(false);
    start(async () => {
      const r = await marcarRefeicao(id, on).catch(() => ({ ok: false }));
      if (!r.ok) { setDone(d => ({ ...d, [id]: !on })); setErro(true); } else router.refresh();
    });
  }

  // água: a tela mostra o toque na hora e salva um envio por vez, sempre com o valor mais novo
  const [copos, setCopos] = useState(aguaHoje);
  const quer = useRef(aguaHoje), salvo = useRef(aguaHoje), enviando = useRef(false);
  async function salvaAgua() {
    if (enviando.current) return;
    enviando.current = true;
    while (salvo.current !== quer.current) {
      const v = quer.current;
      const r = await marcarAgua(v).catch(() => ({ ok: false }));
      if (!r.ok) { setErro(true); quer.current = salvo.current; setCopos(salvo.current); break; }
      salvo.current = v;
    }
    enviando.current = false;
    router.refresh();
  }
  function agua(n: number) {
    const v = Math.min(30, Math.max(0, n));
    quer.current = v;
    setCopos(v);
    setErro(false);
    salvaAgua();
  }
  const total = Math.max(aguaMeta, copos);
  const pct = meals.length ? Math.round((feitas / meals.length) * 100) : 0;

  return (
    <>
      {primeiraVez && meals.length > 0 && (
        <p className="hint"><Icon name="info" size={18} /><span>Toque em <b>Fiz</b> quando fizer cada refeição e marque os copos de água. Fechando o dia, ele conta na sua semana e vale XP em Metas.</span></p>
      )}

      {meals.length > 0 && (
        <section className={`panel day-sum ${completo ? 'ok' : ''}`} aria-label="Resumo do dia">
          <div className="panel-h">
            <h2>{completo ? 'Dia completo!' : feitas === 0 ? 'Refeições de hoje' : `Faltam ${meals.length - feitas}`}</h2>
            <span className="tag blue">{completo ? '+10 XP' : `${feitas}/${meals.length}`}</span>
          </div>
          <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Refeições feitas hoje" style={{ ['--p' as string]: `${pct}%` }}><i /></div>
        </section>
      )}

      <section className={`panel water ${copos >= aguaMeta ? 'ok' : ''}`} aria-label="Água de hoje">
        <div className="panel-h">
          <h2><Icon name="droplet" size={20} />Água</h2>
          <span className="tag blue">{litros(copos)} L de {litros(aguaMeta)} L</span>
        </div>
        <div className="cups" role="group" aria-label={`${copos} de ${aguaMeta} copos de 250 ml`} style={{ ['--n' as string]: Math.min(total, 8) }}>
          {Array.from({ length: total }, (_, i) => (
            <button key={i} type="button" className={i < copos ? 'on' : ''} aria-label={`${i + 1} ${i ? 'copos' : 'copo'}`}
              onClick={() => agua(i + 1 === copos ? i : i + 1)}><Icon name="droplet" size={20} /></button>
          ))}
        </div>
        <div className="water-ctl">
          <button type="button" className="ibtn sq" aria-label="Tirar um copo" disabled={copos === 0} onClick={() => agua(copos - 1)}><Icon name="minus" size={18} /></button>
          <button type="button" className="btn soft" onClick={() => agua(copos + 1)}><Icon name="plus" size={18} />Bebi um copo (250 ml)</button>
        </div>
        {copos >= aguaMeta && <p className="water-ok"><Icon name="check" size={16} />Meta de água batida hoje. +5 XP</p>}
      </section>

      {erro && <p className="offline" role="alert"><Icon name="info" size={18} />Não deu para salvar agora. Confira a internet e tente de novo.</p>}

      {meals.length > 0 && semItens && (
        <p className="hint muted-hint"><Icon name="utensils" size={18} /><span>Seu professor ainda vai detalhar os alimentos. Por enquanto, marque as refeições nos horários.</span></p>
      )}

      {meals.map(m => {
        const ok = !!done[m.id];
        const destaque = proxima?.id === m.id;
        const mostra = m.items.length > 0 && (!ok || aberta[m.id]);
        return (
          <article className={`panel tight meal ${ok ? 'ok' : ''} ${destaque ? 'next' : ''}`} key={m.id}>
            <div className="meal-h">
              <div className="grow">
                {destaque && <span className="meal-now">{proxima!.agora ? 'Agora' : 'Próxima'}</span>}
                <h3>{m.name}</h3>
                <small>
                  {m.time_hint && <><Icon name="clock" size={14} />{m.time_hint}</>}
                  {m.items.length > 0 && <span>{m.time_hint ? ' · ' : ''}{m.items.length} {m.items.length === 1 ? 'alimento' : 'alimentos'}</span>}
                </small>
              </div>
              <button type="button" className="meal-chk" aria-pressed={ok} aria-label={`${m.name}: ${ok ? 'feita, toque para desmarcar' : 'marcar como feita'}`} onClick={() => toggle(m.id)}>
                <Icon name="check" size={18} />{ok ? 'Feita' : 'Fiz'}
              </button>
            </div>
            {mostra && (
              <ul className="meal-items">
                {m.items.map((i, k) => (
                  <li key={k}><b>{i.food}</b>{i.quantity && <span>{i.quantity}</span>}{i.notes && <small>{i.notes}</small>}</li>
                ))}
              </ul>
            )}
            {ok && m.items.length > 0 && (
              <button type="button" className="link meal-more" onClick={() => setAberta(a => ({ ...a, [m.id]: !a[m.id] }))}>
                {aberta[m.id] ? 'Esconder alimentos' : 'Ver alimentos'}
              </button>
            )}
          </article>
        );
      })}
    </>
  );
}
