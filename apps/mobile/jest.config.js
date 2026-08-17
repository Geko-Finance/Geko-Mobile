const expoPreset = require("jest-expo/jest-preset");

module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/.expo/"],
  // @stellar/stellar-sdk 16 pulls in ESM-only packages (@noble/hashes 2.x, @noble/ed25519,
  // uint8array-extras) and ships some of them nested. jest-expo's default allow-list does not
  // cover them, so Jest parses ESM as CommonJS and every suite touching the SDK fails to run.
  // Extend the preset's first pattern rather than replacing it, so the React Native entries
  // stay intact.
  transformIgnorePatterns: [
    expoPreset.transformIgnorePatterns[0].replace(
      "|native-base))",
      "|native-base|@noble|@stellar/stellar-sdk|uint8array-extras))"
    ),
    ...expoPreset.transformIgnorePatterns.slice(1),
  ],
};
