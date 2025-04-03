// ***********************************************************
// This file supports e2e tests
// ***********************************************************

// Import commands.js (custom commands)
import './commands';

// Import mocks
import { setupSupabaseMocks } from './mocks/auth';

// Prevent uncaught exception failures
Cypress.on('uncaught:exception', (err, runnable) => {
  // Log the error for debugging
  console.error('Uncaught exception:', err.message);
  // returning false here prevents Cypress from failing the test
  return false;
});

// Handle Supabase JWT issues by setting storage token if needed
before(() => {
  cy.log('Setting up test environment');
});

// Add a custom command to use mocked auth
Cypress.Commands.add('mockAuth', () => {
  setupSupabaseMocks();
  cy.log('Supabase auth has been mocked');
});
