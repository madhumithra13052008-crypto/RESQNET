import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost' | 'danger' | 'warn' | 'ok';
const V: Record<Variant, string> = {
  primary: 'bg-accent text-bg-900 hover:bg-cyan-300 border-transparent',
  ghost: 'bg-bg-700 text-ink hover:bg-bg-600 border-line',
  danger: 'bg-bad/15 text-bad hover:bg-bad/25 border-bad/40',
  warn: 'bg-warn/15 text-warn hover:bg-warn/25 border-warn/40',
  ok: 'bg-ok/15 text-ok hover:bg-ok/25 border-ok/40',
};
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; size?: 'sm' | 'md' | 'lg' }
export function Button({ variant = 'ghost', size = 'md', className = '', ...rest }: Props) {
  const sz = size === 'sm' ? 'px-2.5 py-1 text-xs' : size === 'lg' ? 'px-5 py-3 text-base' : 'px-3.5 py-2 text-sm';
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${V[variant]} ${sz} ${className}`}
    />
  );
}
