import type { ReactNode } from 'react';

interface Props { title?: ReactNode; icon?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }
export function Card({ title, icon, right, children, className = '', bodyClass = 'p-3' }: Props) {
  return (
    <section className={`panel ${className}`}>
      {(title || right) && (
        <header className="flex items-center justify-between gap-2 border-b border-line/70 px-3 py-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            {icon && <span className="text-accent">{icon}</span>}
            {title}
          </h2>
          {right && <div className="flex items-center gap-2">{right}</div>}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}
