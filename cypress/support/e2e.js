// ***********************************************************
// This file supports e2e tests
// ***********************************************************

// Import commands.js (custom commands)
import './commands';

// Prevent uncaught exception failures
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  return false;
});

// Handle Supabase JWT issues by setting storage token if needed
before(() => {
  cy.log('Setting up test environment');
});
