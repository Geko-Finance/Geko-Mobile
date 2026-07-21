/**
 * No `jest-expo` preset on purpose: its React Native test environment injects a
 * WHATWG streams polyfill (`expo/virtual/streams.js`) that races with axios's own
 * feature detection inside `@stellar/typescript-wallet-sdk`'s bundle, crashing
 * non-deterministically as soon as a test imports the real SDK. Every test in this
 * project is domain/service-level (no RN component rendering), so plain Node +
 * the project's existing babel config (via babel-jest) is both sufficient and stable.
 */
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};
