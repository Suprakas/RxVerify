module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  setupFiles: ['<rootDir>/jest.polyfills.cjs'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  transform: {
    '^.+\\.[mc]?jsx?$': 'babel-jest',
  },
  // react-router v8 ships ES modules only, so let Babel compile it for Jest.
  transformIgnorePatterns: ['/node_modules/(?!(react-router|@remix-run|cookie|cookie-es|set-cookie-parser)/)'],
  moduleNameMapper: {
    '\\.(css)$': 'identity-obj-proxy',
    // Vite-only import.meta.env lives in src/config.js; tests use a plain stub.
    '^(\\.{1,2}/)+appConfig$': '<rootDir>/src/test/configStub.js',
    // No real network sockets in tests.
    '^socket\\.io-client$': '<rootDir>/src/test/socketStub.js',
  },
  testMatch: ['**/*.test.{js,jsx}'],
};
