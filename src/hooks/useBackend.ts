import { useEffect } from 'react';
import { getApi } from '../api';
import { loadScenario } from '../store/actions';
import { useSettingsStore } from '../store/useSettingsStore';
import { useSimStore } from '../store/useSimStore';

/** Wires the live stream, health polling and the scenario catalog into the stores. Mount once at the app root. */
export function useBackend() {
  const { useMock, apiUrl, wsUrl } = useSettingsStore();

  useEffect(() => {
    const st = useSimStore.getState();
    st.setSim(null);
    const unsub = getApi().subscribe({
      onState: (s) => useSimStore.getState().setSim(s),
      onEvent: (e) => useSimStore.getState().pushEvent(e),
      onConnection: (c) => useSimStore.getState().setConnection(c),
    });
    const fail = (e: Error) => useSimStore.getState().setError(e.message);
    getApi().getCatalog().then((c) => {
      useSimStore.getState().setCatalog(c);
      const s = useSettingsStore.getState();
      if (!c.scenarios.some((x) => x.scenario_id === s.scenarioId)) s.set({ scenarioId: c.scenarios[0].scenario_id, seed: c.scenarios[0].seed });
    }).catch(fail);
    getApi().listFailureScenarios().then((f) => useSimStore.getState().setFailureScenarios(f)).catch(() => undefined);
    return unsub;
  }, [useMock, apiUrl, wsUrl]);

  useEffect(() => {
    let alive = true;
    const ping = () => getApi().health().then(() => alive && useSimStore.getState().setApiOnline(true)).catch(() => alive && useSimStore.getState().setApiOnline(false));
    ping();
    const id = window.setInterval(ping, 8000);
    return () => { alive = false; window.clearInterval(id); };
  }, [useMock, apiUrl, wsUrl]);

  const connection = useSimStore((s) => s.connection);
  const hasSim = useSimStore((s) => s.sim !== null);
  const hasCatalog = useSimStore((s) => s.catalog !== null);
  useEffect(() => { if (!hasSim && hasCatalog && connection === 'connected') loadScenario(); }, [hasSim, hasCatalog, connection, useMock, apiUrl]);
}
