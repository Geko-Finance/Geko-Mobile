// Manual mock for `expo-crypto`, used automatically by Jest for any test that (directly or
// transitively) imports this package — see
// https://jestjs.io/docs/manual-mocks#mocking-node-modules
//
// Same underlying issue as `__mocks__/expo-secure-store.js` in this directory: the real
// package's JS entry point pulls in native-module bindings that can't load under this
// project's Node-only `jest.config.js` (no RN/Expo preset — see that file's comment).
//
// Node already ships a real, cryptographically secure `crypto.webcrypto.getRandomValues`
// (available as `globalThis.crypto` since Node 19, and via `node:crypto`'s `webcrypto` on
// earlier Node 18+). This mock simply delegates to it, so no fake or predictable randomness
// is introduced — `src/services/crypto/crypto-polyfill.ts`'s installed
// `crypto.getRandomValues` is backed by genuine OS-level entropy under test, same as in the
// real app (where it is backed by `expo-crypto`'s native implementation instead).

const nodeCrypto = require("node:crypto");

function getRandomValues(typedArray) {
  return nodeCrypto.webcrypto.getRandomValues(typedArray);
}

module.exports = {
  getRandomValues,
};
