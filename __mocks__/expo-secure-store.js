// Manual mock for `expo-secure-store`, used automatically by Jest for any test that
// (directly or transitively) imports this package — see
// https://jestjs.io/docs/manual-mocks#mocking-node-modules
//
// Why this exists: `expo-secure-store`'s real implementation calls
// `requireNativeModule('ExpoSecureStore')` at module-load time (via `expo-modules-core`),
// which throws immediately outside a real iOS/Android/Expo-Go runtime — there is no
// Keychain/Keystore to bind to in a plain Node Jest process. This project's `jest.config.js`
// intentionally runs with `testEnvironment: "node"` and no RN/Expo preset (see that file's
// comment for why `jest-expo` was removed in an earlier task), so there is no native module
// registry available. This mock swaps in an in-memory Map so that code exercising the real
// `SecureStore`-backed helpers (`src/utils/app/SecureStore.tsx`,
// `src/services/storage/secure-json-storage.ts`) can run end-to-end under Jest.
//
// This does NOT mock any Stellar SDK behavior — it only stands in for the native storage
// binding. All signing/decoding/crypto logic under test remains fully real.

const memoryStore = new Map();

async function setItemAsync(key, value) {
  memoryStore.set(key, value);
}

async function getItemAsync(key) {
  return memoryStore.has(key) ? memoryStore.get(key) : null;
}

async function deleteItemAsync(key) {
  memoryStore.delete(key);
}

async function isAvailableAsync() {
  return true;
}

module.exports = {
  setItemAsync,
  getItemAsync,
  deleteItemAsync,
  isAvailableAsync,
  AFTER_FIRST_UNLOCK: "AFTER_FIRST_UNLOCK",
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: "AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY",
  ALWAYS: "ALWAYS",
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: "WHEN_PASSCODE_SET_THIS_DEVICE_ONLY",
  ALWAYS_THIS_DEVICE_ONLY: "ALWAYS_THIS_DEVICE_ONLY",
  WHEN_UNLOCKED: "WHEN_UNLOCKED",
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
};
