const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://serviceplanningpech.github.io/prayer-diary/', // Change this to your development server URL
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    // Set long timeout for authentication operations
    defaultCommandTimeout: 10000,
    // Avoid test failures on uncaught exceptions from your app
    uncaughtExceptionMode: 'warn'
  },
  // Default viewport size
  viewportWidth: 1280,
  viewportHeight: 800,
  // Prevent Cypress from clearing localStorage between tests to preserve login state
  experimentalPreserveLocalStorage: true
});
