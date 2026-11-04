import Link from 'next/link';
import Icon from '../Icon';
import { ConfirmButton } from './Client';

/** Mini formulário de uma ação (botão) com campos ocultos e confirmação opcional. */
export function Act({ action, fields, label, cls = 'btn', confirm, title }: {
  action: (f: FormData) => Promise<void>;
  fields: Record<string, string | number>;
  label: React.ReactNode;
  cls?: string;
  confirm?: string;
  title?: string;
}) {
  return (
    <form action={action} className="inline">
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <ConfirmButton className={cls} confirm={confirm} title={title}>{label}</ConfirmButton>
    </form>
  );
}

/** Aviso vindo de ?m= depois de uma ação. */
export function Flash({ m }: { m?: string }) {
  if (!m) return null;
  return <p className="toast" role="status"><span className="dot"><Icon name="check" size={16} /></span>{m}</p>;
}

/** Cabeçalho de tela com botão de voltar opcional. */
export function Top({ title, sub, back, children }: { title: React.ReactNode; sub?: React.ReactNode; back?: string; children?: React.ReactNode }) {
  return (
    <header className="top">
      {back && <Link className="ibtn" href={back} aria-label="Voltar"><Icon name="left" /></Link>}
      <div className="grow">
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children}
    </header>
  );
}

export const initials = (name: string) =>
  name.trim().split(/\s+/).filter(Boolean).map(w => w[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('').toUpperCase() || '?';
