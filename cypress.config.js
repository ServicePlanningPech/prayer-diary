// cypress.config.js

const { defineConfig } = require('cypress');
const fs = require('fs');
const path = require('path');

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
        },
        
        // Task to ensure directory exists
        ensureDir(dirPath) {
          if (!fs.existsSync(dirPath)) {
            // Create directory recursively
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`Created directory: ${dirPath}`);
          } else {
            console.log(`Directory already exists: ${dirPath}`);
          }
          return null;
        },
        
        // Task to download binary image
        downloadBinaryImage({ binaryData, filename }) {
          // Create full path to save the file
          const filePath = path.join('cypress', 'fixtures', filename);
          
          // Ensure directory exists
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          // Save the file
          fs.writeFileSync(filePath, binaryData, 'binary');
          console.log(`Saved image to: ${filePath}`);
          
          return null;
        }
      });
      
      return config;
    },
    
    // Increase timeouts for better reliability with auth operations
    defaultCommandTimeout: 20000,      // Using your existing timeout which is longer
    pageLoadTimeout: 40000,
    downloadTimeout: 30000,            // Added from the new config
    
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