module.exports = {
  "roots": [
    "<rootDir>/src",
    "<rootDir>/e2e",
  ],
  "transform": {
    "^.+\\.tsx?$": "ts-jest",
  },
  "testRegex": "(/__tests__/.*|(\\.|/)(test|spec))\\.(t|j)sx?$",
  "moduleFileExtensions": [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json",
    "node"
  ],
  "preset": "jest-puppeteer"
};