import Icon from '../Icon';
import { Chart } from '../Chart';
import { Act } from './ui';
import { deleteAssessment, saveAssessment } from './actions';

export type Av = {
  id: number; d: string; weight_kg: string | null; body_fat: string | null; waist_cm: string | null; hip_cm: string | null;
  chest_cm: string | null; arm_cm: string | null; thigh_cm: string | null; notes: string | null;
};

const CAMPOS = [
  ['weight_kg', 'Peso', 'kg'], ['body_fat', 'Gordura', '%'], ['waist_cm', 'Cintura', 'cm'], ['hip_cm', 'Quadril', 'cm'],
  ['chest_cm', 'Peito', 'cm'], ['arm_cm', 'Braço', 'cm'], ['thigh_cm', 'Coxa', 'cm'],
] as const;

const fmt = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const dm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(2, 4)}`;

/** Avaliação física do aluno: últimos valores, variação desde a primeira, gráfico do peso e histórico. */
export default function Avaliacao({ sid, avs, hoje }: { sid: number; avs: Av[]; hoje: string }) {
  // avs em ordem cronológica (mais antiga primeiro)
  const ultimo = (k: (typeof CAMPOS)[number][0]) => { for (let i = avs.length - 1; i >= 0; i--) if (avs[i][k] != null) return { v: Number(avs[i][k]), d: avs[i].d }; return null; };
  const primeiro = (k: (typeof CAMPOS)[number][0]) => { for (const a of avs) if (a[k] != null) return { v: Number(a[k]), d: a.d }; return null; };
  const pesos = avs.filter(a => a.weight_kg != null).map(a => [a.d, Number(a.weight_kg)] as [string, number]);

  return (
    <section className="panel" id="avaliacao" aria-labelledby="av-t">
      <div className="panel-h">
        <h2 id="av-t">Avaliação física</h2>
        {avs.length > 0 && <span className="muted" style={{ fontSize: '.84rem' }}>última em {dm(avs[avs.length - 1].d)}</span>}
      </div>

      {avs.length === 0 ? (
        <p className="muted" style={{ marginBottom: 14 }}>Nenhuma avaliação ainda. Registre peso e medidas para acompanhar a evolução ao longo do tempo.</p>
      ) : (
        <>
          <div className="av-grid">
            {CAMPOS.map(([k, label, u]) => {
              const a = ultimo(k), b = primeiro(k);
              if (!a) return null;
              const dif = b && b.d !== a.d ? Math.round((a.v - b.v) * 10) / 10 : null;
              return (
                <div key={k}>
                  <span>{label}</span>
                  <b>{fmt(a.v)}<small> {u}</small></b>
                  {dif !== null && <em>{dif > 0 ? '+' : dif < 0 ? '−' : ''}{fmt(Math.abs(dif))} {u} desde {dm(b!.d).slice(0, 5)}</em>}
                </div>
              );
            })}
          </div>
          {pesos.length > 1 && <Chart pts={pesos} unit="kg" label="Evolução do peso" />}
          <details>
            <summary className="opt"><span>Histórico ({avs.length})</span><span className="ibtn sq"><Icon name="right" size={16} /></span></summary>
            <div className="hist">
              {[...avs].reverse().map(a => (
                <div key={a.id} className="av-row">
                  <span>{dm(a.d)}</span>
                  <b>{CAMPOS.filter(([k]) => a[k] != null).map(([k, l, u]) => `${l} ${fmt(Number(a[k]))}${u === '%' ? '%' : ` ${u}`}`).join(' · ') || '—'}
                    {a.notes && <small>{a.notes}</small>}</b>
                  <Act action={deleteAssessment} fields={{ id: a.id, student_id: sid }} cls="ibtn sq danger" title="Excluir avaliação"
                    label={<Icon name="trash" size={15} />} confirm={`Excluir a avaliação de ${dm(a.d)}?`} />
                </div>
              ))}
            </div>
          </details>
        </>
      )}

      <details className="add" style={{ marginTop: 12 }}>
        <summary><Icon name="plus" size={18} />Nova avaliação</summary>
        <div className="body">
          <form action={saveAssessment} className="form">
            <input type="hidden" name="student_id" value={sid} />
            <label className="field"><span>Data</span><input type="date" name="measured_on" defaultValue={hoje} max={hoje} /></label>
            <div className="grid2">
              <label className="field"><span>Peso (kg)</span><input name="weight_kg" inputMode="decimal" placeholder="68,5" /></label>
              <label className="field"><span>Gordura (%)</span><input name="body_fat" inputMode="decimal" placeholder="24" /></label>
            </div>
            <fieldset className="group">
              <legend>Medidas (cm) <small>opcional</small></legend>
              <div className="grid3">
                <label className="field"><span>Cintura</span><input name="waist_cm" inputMode="decimal" /></label>
                <label className="field"><span>Quadril</span><input name="hip_cm" inputMode="decimal" /></label>
                <label className="field"><span>Peito</span><input name="chest_cm" inputMode="decimal" /></label>
                <label className="field"><span>Braço</span><input name="arm_cm" inputMode="decimal" /></label>
                <label className="field"><span>Coxa</span><input name="thigh_cm" inputMode="decimal" /></label>
              </div>
            </fieldset>
            <label className="field"><span>Observações</span><textarea name="notes" rows={2} placeholder="Ex.: medido em jejum, pela manhã" /></label>
            <button className="btn primary">Salvar avaliação</button>
          </form>
        </div>
      </details>
    </section>
  );
}
