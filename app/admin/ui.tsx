import { ConfirmButton } from './Client';

/** Mini formulário de uma ação (botão) com campos ocultos e confirmação opcional. */
export function Act({ action, fields, label, cls, confirm }: {
  action: (f: FormData) => Promise<void>;
  fields: Record<string, string | number>;
  label: string;
  cls?: string;
  confirm?: string;
}) {
  return (
    <form action={action} className="inline">
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <ConfirmButton className={cls} confirm={confirm}>{label}</ConfirmButton>
    </form>
  );
}
