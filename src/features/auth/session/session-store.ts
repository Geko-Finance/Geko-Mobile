import { create } from "zustand";

import type { Session, SessionStatus } from "./session-types";

interface SessionState {
  session: Session | null;
  status: SessionStatus;
  setSession: (session: Session | null) => void;
  setStatus: (status: SessionStatus) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  status: "loading",
  setSession: (session) => set({ session }),
  setStatus: (status) => set({ status }),
}));
