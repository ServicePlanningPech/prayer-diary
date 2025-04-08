// ***********************************************************
// This file supports e2e tests
// ***********************************************************

// Import commands.js (custom commands)
import './commands';

// Import helper functions
import { logDomState, navigateToView, forceAdminPermissions, checkSupabaseConnection, checkAdminPrivileges } from './helper';

// Import mocks
import { setupSupabaseMocks } from './mocks/auth';

// Export helper functions so they can be imported in test files
Cypress.logDomState = logDomState;
Cypress.navigateToView = navigateToView;
Cypress.forceAdminPermissions = forceAdminPermissions;
Cypress.checkSupabaseConnection = checkSupabaseConnection;
Cypress.checkAdminPrivileges = checkAdminPrivileges;

// Add commands for our helper functions
Cypress.Commands.add('logDomState', logDomState);
Cypress.Commands.add('navigateToView', navigateToView);
Cypress.Commands.add('forceAdminPermissions', forceAdminPermissions);
Cypress.Commands.add('checkSupabaseConnection', checkSupabaseConnection);
Cypress.Commands.add('checkAdminPrivileges', checkAdminPrivileges);

// Prevent uncaught exception failures
Cypress.on('uncaught:exception', (err, runnable) => {
  // Log the error for debugging
  console.error('Uncaught exception:', err.message);
  // returning false here prevents Cypress from failing the test
  return false;
});

// Enhanced setup for test environment
before(() => {
  cy.task('log', 'Setting up test environment');
  
  // Register window error listeners to catch and log JS errors
  cy.on('window:before:load', (win) => {
    cy.spy(win.console, 'error').as('consoleError');
    cy.spy(win.console, 'warn').as('consoleWarn');
    
    // Handle unhandled promise rejections
    win.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled Promise Rejection:', event.reason);
    });
  });
});

// Add a custom command to use mocked auth
Cypress.Commands.add('mockAuth', () => {
  setupSupabaseMocks();
  cy.log('Supabase auth has been mocked');
});

// Add a command to check for console errors
Cypress.Commands.add('checkNoErrors', () => {
  cy.get('@consoleError').then((errorLog) => {
    if (errorLog && errorLog.callCount > 0) {
      cy.task('log', `WARNING: Console errors detected: ${errorLog.callCount}`);
      for (let i = 0; i < errorLog.callCount; i++) {
        const args = errorLog.args[i] || [];
        cy.task('log', `Console Error ${i+1}: ${JSON.stringify(args)}`);
      }
    }
  });
});
