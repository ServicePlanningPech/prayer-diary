const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://serviceplanningpech.github.io/prayer-diary/', // Change this to your development server URL
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents(on, config) {
      // Log to console for better visibility during test runs
      on('task', {
        log(message) {
          console.log(`[Test Log] ${message}`);
          return null;
        }
      });
    },
    // Increase timeouts for better reliability with auth operations
    defaultCommandTimeout: 15000,
    pageLoadTimeout: 30000,
    // Avoid test failures on uncaught exceptions from your app
    uncaughtExceptionMode: 'warn',
    // Retry failed tests
    retries: {
      runMode: 2,
      openMode: 1
    },
    // Enable Cypress Studio for recording user interactions
    experimentalStudio: true
  },
  // Default viewport size
  viewportWidth: 1280,
  viewportHeight: 800,
  // Ensure sessions are properly supported
  experimentalSessionAndOrigin: true,
  experimentalSessionSupport: true,
  // Other useful experimental features
  experimentalMemoryManagement: true,
  numTestsKeptInMemory: 5
});
