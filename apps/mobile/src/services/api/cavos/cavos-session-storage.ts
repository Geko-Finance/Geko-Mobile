import {
  deleteSecureJsonItem,
  getSecureJsonItem,
  setSecureJsonItem,
} from "@/src/services/storage/secure-json-storage";

import type { CavosSession } from "./cavos-types";

/** CavosSession (address, status, userId only — no tokens or signing secrets) is the only shape ever persisted here. */
const CAVOS_SESSION_STORAGE_KEY = "geko.cavos.session.v1";

export function getStoredCavosSession(): Promise<CavosSession | null> {
  return getSecureJsonItem<CavosSession>(CAVOS_SESSION_STORAGE_KEY);
}

export function setStoredCavosSession(session: CavosSession): Promise<void> {
  return setSecureJsonItem(CAVOS_SESSION_STORAGE_KEY, session);
}

export function clearStoredCavosSession(): Promise<void> {
  return deleteSecureJsonItem(CAVOS_SESSION_STORAGE_KEY);
}
