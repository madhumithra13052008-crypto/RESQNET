import { useEffect, useState } from 'react';

export type Page = 'home' | 'mission' | 'scenarios' | 'experiments' | 'analytics' | 'settings';
const PAGES: Page[] = ['home', 'mission', 'scenarios', 'experiments', 'analytics', 'settings'];
const read = (): Page => {
  const h = window.location.hash.replace('#/', '');
  return (PAGES as string[]).includes(h) ? (h as Page) : 'home';
};
export const navigate = (p: Page) => { window.location.hash = `#/${p}`; };
export function usePage(): Page {
  const [p, setP] = useState<Page>(read);
  useEffect(() => {
    const f = () => setP(read());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return p;
}
