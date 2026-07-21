/**
 * No `jest-expo` preset on purpose: its React Native test environment injects a
 * WHATWG streams polyfill (`expo/virtual/streams.js`) that races with axios's own
 * feature detection inside `@stellar/typescript-wallet-sdk`'s bundle, crashing
 * non-deterministically as soon as a test imports the real SDK. Every test in this
 * project is domain/service-level (no RN component rendering), so plain Node +
 * the project's existing babel config (via babel-jest) is both sufficient and stable.
 *
 * `transformIgnorePatterns` carves out one exception: `babel-preset-expo` rewrites any
 * `process.env.EXPO_PUBLIC_*` reference (added in `src/config/env.ts` for mainnet QA
 * builds) into an import of `expo/virtual/env.js`, a raw-ESM file inside `node_modules`
 * that Jest's default node_modules-is-untransformed rule would otherwise leave as
 * unparseable `export` syntax under Jest's CJS runtime. Transforming just `expo/virtual/*`
 * (not all of `expo` or any other package) keeps this narrow.
 */
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },
  transformIgnorePatterns: ["node_modules/(?!expo/virtual)"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};
