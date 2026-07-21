// Manual mock for `expo-constants`, used automatically by Jest for any test that (directly
// or transitively) imports this package — see
// https://jestjs.io/docs/manual-mocks#mocking-node-modules
//
// Same underlying issue as the other manual mocks in this directory: the real package's JS
// entry point pulls in native-module bindings that can't load under this project's
// Node-only `jest.config.js` (no RN/Expo preset — see that file's comment).
//
// `src/config/env.ts` only reads `Constants.expoConfig?.extra` to resolve build-time app
// config (API base URL, environment, active Stellar network); it falls back to sane
// defaults (e.g. "testnet") when a field is missing, so an empty `extra` object here is
// sufficient for any test that transitively imports `src/config/env.ts`.

module.exports = {
  expoConfig: {
    extra: {},
  },
};
