'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon, { type IconName } from '../Icon';

/** Barra inferior do aluno: Treino, Dieta e Metas. */
export default function Nav() {
  const path = usePathname();
  const tab = (href: string, label: string, icon: IconName) => (
    <Link href={href} aria-current={path === href ? 'page' : undefined}><Icon name={icon} size={24} />{label}</Link>
  );
  return (
    <div className="tabbar three">
      <nav aria-label="Navegação do aluno">
        {tab('/treino', 'Treino', 'dumbbell')}
        {tab('/treino/dieta', 'Dieta', 'utensils')}
        {tab('/treino/metas', 'Metas', 'trophy')}
      </nav>
    </div>
  );
}
