// CavosAuth guards its OAuth URL methods on `typeof window === "undefined"`, and after a
// successful OTP/OAuth verify it unconditionally calls `window.localStorage.setItem(...)`
// to remember the last identity for browser apps (verified in the compiled SDK) - neither
// needs a real browser, so a minimal window+localStorage stub satisfies both without faking
// one. Without the localStorage piece, verify crashes with a client-facing 500 *after* Cavos
// has already accepted the code/OAuth callback, silently burning a one-time-use OTP code.
//
// `isSecureContext: true` is required too: Cavos's device-key WebCrypto path
// (`assertSecureContext` in @cavos/kit) only skips its browser secure-context check when
// `window` is *undefined* - once this stub defines `window` at all, it falls through to
// checking `window.isSecureContext`, which would otherwise be undefined and wrongly fail
// wallet connect/create/recover here even though Node's own `crypto.subtle` is available
// and this backend is a trusted local service, not a public browser origin.
if (typeof (globalThis as { window?: unknown }).window === 'undefined') {
  const memoryStorage = new Map<string, string>();
  (globalThis as { window?: unknown }).window = {
    isSecureContext: true,
    localStorage: {
      getItem: (key: string) => memoryStorage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memoryStorage.set(key, value);
      },
      removeItem: (key: string) => {
        memoryStorage.delete(key);
      },
    },
  };
}
