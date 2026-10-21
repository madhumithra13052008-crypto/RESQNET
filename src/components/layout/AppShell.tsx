import { AlertTriangle, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Page } from '../../lib/nav';
import { useSimStore } from '../../store/useSimStore';
import { TopBar } from './TopBar';

export function AppShell({ page, children }: { page: Page; children: ReactNode }) {
  const error = useSimStore((s) => s.error);
  const setError = useSimStore((s) => s.setError);
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar page={page} />
      {error && (
        <div role="alert" className="mx-auto mt-3 flex w-full max-w-[1800px] items-start gap-2 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad md:mx-4 md:w-auto">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss error"><X size={16} /></button>
        </div>
      )}
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line/60 px-4 py-3 text-center text-xs text-mute">
        RESQNET is a simulation prototype. Parameters are initial test values, not real-world operating specifications.
      </footer>
    </div>
  );
}
