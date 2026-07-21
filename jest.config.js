module.exports = {
  preset: "jest-expo",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transformIgnorePatterns: [
    "node_modules/(?!@stellar|@react-native|react-native|expo|@expo|@react-navigation)",
  ],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
};
