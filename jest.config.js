// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
  clearMocks: true,
  testEnvironment: 'node',
  transform: {
    '.(js|jsx|ts|tsx)': '@sucrase/jest-plugin',
  },
  testMatch: ['**/tests/**/*.js', '**/src/**/*.spec.js'],
};
