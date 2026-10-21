import type { SimApi } from './contract';
import { MockClient } from './mock/mockClient';
import { RealClient } from './realClient';
import { useSettingsStore } from '../store/useSettingsStore';

let mock: MockClient | null = null;
let real: { key: string; client: RealClient } | null = null;

/** Returns the client selected in Settings. The mock instance is a singleton so its run survives page changes. */
export function getApi(): SimApi {
  const s = useSettingsStore.getState();
  if (s.useMock) return (mock ??= new MockClient());
  const key = `${s.apiUrl}|${s.wsUrl}`;
  if (!real || real.key !== key) real = { key, client: new RealClient(s.apiUrl, s.wsUrl) };
  return real.client;
}
