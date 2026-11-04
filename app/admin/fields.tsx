type St = { name?: string; weight_kg?: string | null; height_m?: string | null; age?: number | null; goal?: string | null; notes?: string | null };

/** Campos do cadastro do aluno (novo e edição), em dois grupos. */
export function StudentFields({ st = {} }: { st?: St }) {
  return (
    <>
      <fieldset className="group">
        <legend>Dados do aluno</legend>
        <label className="field"><span>Nome</span><input name="name" required autoComplete="off" placeholder="Nome e sobrenome" defaultValue={st.name} /></label>
        <div className="grid3">
          <label className="field"><span>Peso (kg)</span><input name="weight_kg" inputMode="decimal" placeholder="68,5" defaultValue={st.weight_kg ?? ''} /></label>
          <label className="field"><span>Altura (m)</span><input name="height_m" inputMode="decimal" placeholder="1,65" defaultValue={st.height_m ?? ''} /></label>
          <label className="field"><span>Idade</span><input name="age" inputMode="numeric" placeholder="35" defaultValue={st.age ?? ''} /></label>
        </div>
      </fieldset>
      <fieldset className="group">
        <legend>Objetivo e orientações <small>opcional</small></legend>
        <label className="field"><span>Objetivo</span><textarea name="goal" rows={2} placeholder="Ex.: hipertrofia, emagrecimento…" defaultValue={st.goal ?? ''} /></label>
        <label className="field"><span>Observações e limitações</span><textarea name="notes" rows={3} placeholder="O aluno vê este texto em “Orientações” no treino" defaultValue={st.notes ?? ''} /></label>
      </fieldset>
    </>
  );
}
