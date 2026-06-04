import {
  deleteSecureJsonItem,
  getSecureJsonItem,
  setSecureJsonItem,
} from "@/src/services/storage/secure-json-storage";

import type { Session } from "./session-types";

const SESSION_STORAGE_KEY = "geko.session.v1";

export function getStoredSession(): Promise<Session | null> {
  return getSecureJsonItem<Session>(SESSION_STORAGE_KEY);
}

export function setStoredSession(session: Session): Promise<void> {
  return setSecureJsonItem(SESSION_STORAGE_KEY, session);
}

export function clearStoredSession(): Promise<void> {
  return deleteSecureJsonItem(SESSION_STORAGE_KEY);
}
