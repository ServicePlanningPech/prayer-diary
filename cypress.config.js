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
    defaultCommandTimeout: 20000,
    pageLoadTimeout: 40000,
    // Avoid test failures on uncaught exceptions from your app
    uncaughtExceptionMode: 'warn',
    // Retry failed tests
    retries: {
      runMode: 3,
      openMode: 2
    },
    // Enable Cypress Studio for recording user interactions
    experimentalStudio: true,
    // Improved handling of service workers
    serviceWorker: {
      enabled: true,
      // Add any service worker related commands
    },
    // Clear browser cache between tests
    testIsolation: true
  },
  // Default viewport size
  viewportWidth: 1280,
  viewportHeight: 800,
  // Updated session support
  experimentalSessionAndOrigin: true,
  experimentalSessionSupport: true,
  // Memory management optimization
  experimentalMemoryManagement: true,
  numTestsKeptInMemory: 3,
  // Updated CSP handling with specific directives
  experimentalCspAllowList: [
    "script-src-elem",
    "script-src", 
    "default-src", 
    "form-action", 
    "child-src", 
    "frame-src"
  ]
});
