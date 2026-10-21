import { AppShell } from './components/layout/AppShell';
import { useBackend } from './hooks/useBackend';
import { usePage } from './lib/nav';
import AnalyticsPage from './pages/AnalyticsPage';
import ExperimentsPage from './pages/ExperimentsPage';
import HomePage from './pages/HomePage';
import MissionControlPage from './pages/MissionControlPage';
import ScenariosPage from './pages/ScenariosPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  useBackend();
  const page = usePage();
  return (
    <AppShell page={page}>
      {page === 'home' && <HomePage />}
      {page === 'mission' && <MissionControlPage />}
      {page === 'scenarios' && <ScenariosPage />}
      {page === 'experiments' && <ExperimentsPage />}
      {page === 'analytics' && <AnalyticsPage />}
      {page === 'settings' && <SettingsPage />}
    </AppShell>
  );
}
