const { defaults } = require("jest-config");

module.exports = {
  testEnvironment: "node",
  preset: "ts-jest",
  testMatch: null,
  testRegex: ".*\\.test\\.(js|ts)$",
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/"
  ],
  snapshotSerializers: [
    ...defaults.snapshotSerializers,
  ],
  moduleFileExtensions: [...defaults.moduleFileExtensions, "ts", "tsx"],
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/src/__tests__/tsconfig.json",
      diagnostics: false
    }
  }
};
