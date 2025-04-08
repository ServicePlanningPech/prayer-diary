// Cypress Studio Recording Test
// This file is designed to help record login interactions

describe('Login Process Recording', () => {
  beforeEach(() => {
    // Start with a clean visit to the app
    cy.visit('/');
  });

  it('records login steps', () => {
    // This is a starting point for the recording
    // When running this test in Cypress, you should see:
    // 1. A button in the top right that says "Add Studio Commands"
    // 2. Or check the sidebar for "Studio" or "+ Add Commands" options

    // Basic first step to get started - ready for recording
    cy.get('#btn-login').should('exist');

    // NOTE: If you don't see the Studio controls, try:
    // 1. Run with "npx cypress open --e2e"
    // 2. Select this test file
    // 3. Look in the sidebar on the right side
    // 4. After test runs, there should be a "+" button to add commands
    /* ==== Generated with Cypress Studio ==== */
    cy.get('#btn-login').click();
    cy.get('#auth-email').clear('prayerdiary@pech.co.uk');
    cy.get('#auth-email').type('prayerdiary@pech.co.uk');
    cy.get('#auth-password').clear('@');
    cy.get('#auth-password').type('@Prayer@Diary@');
    cy.get('#auth-submit').click();
    cy.get('#adminDropdown').click();
    cy.get('#nav-manage-users').click();
    cy.get(':nth-child(1) > .card-body > .row > .col-md-auto > .btn-group > .btn-success').click();
    cy.get('#close-notification').click();
    cy.get('#btn-logout').click();
    /* ==== End Cypress Studio ==== */
  });
});
